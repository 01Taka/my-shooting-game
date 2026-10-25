import Phaser from "phaser";

import { EventBus } from "../EventBus";
import type { ControllerInputPayload } from "./ControllerScene";

export class GameScene extends Phaser.Scene {
  protected player!: Phaser.Physics.Arcade.Image;
  protected cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  protected bullets!: Phaser.Physics.Arcade.Group;
  protected enemies!: Phaser.Physics.Arcade.Group;
  protected score = 0;
  protected hp = 100;
  protected maxHp = 100;
  protected lastFired = 0;
  protected enemyTimer!: Phaser.Time.TimerEvent;

  // バーチャルスティック入力状態
  protected virtualInput: ControllerInputPayload = {
    move: { x: 0, y: 0, active: false, angle: 0, force: 0 },
    shoot: { x: 0, y: 0, active: false, angle: 0, force: 0 },
  };

  constructor() {
    super("GameScene");
  }

  // ==========================================
  // ゲーム特有の設定・ルール・パラメータ
  // （1600x900解像度に合わせてスケール調整）
  // ==========================================

  /**
   * ゲームの基本パラメータ定義
   */
  protected getGameParameters() {
    return {
      initialHp: 100,
      playerSpeed: 500, // 250 -> 500
      fireRateMs: 160,
      bulletSpeed: 900,
      enemySpawnIntervalMs: 1000,
      enemySpeedMin: 200,
      enemySpeedMax: 360,
      enemyScore: 100,
      enemyDamage: 25,
    };
  }

  /**
   * ゲームオブジェクト（キャラクター、弾、敵グループ等）の初期化
   */
  protected initGameObjects(width: number, height: number) {
    // プレイヤー作成 (64x64)
    this.player = this.physics.add.image(width / 2, height - 140, "player");
    this.player.setCollideWorldBounds(true);

    // 弾グループ
    this.bullets = this.physics.add.group({
      defaultKey: "bullet",
      maxSize: 50,
    });

    // 敵グループ
    this.enemies = this.physics.add.group();
  }

  /**
   * 当たり判定・衝突ルールの設定
   */
  protected setupCollisions() {
    const params = this.getGameParameters();

    // 弾と敵の衝突
    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      (bulletObj, enemyObj) => {
        bulletObj.destroy();
        enemyObj.destroy();
        this.addScore(params.enemyScore);
      },
      undefined,
      this,
    );

    // プレイヤーと敵の衝突
    this.physics.add.overlap(
      this.player,
      this.enemies,
      (_playerObj, enemyObj) => {
        enemyObj.destroy();
        this.damage(params.enemyDamage);
      },
      undefined,
      this,
    );
  }

  /**
   * ゲームタイマー（敵の定期出現など）の設定
   */
  protected setupGameTimers() {
    const params = this.getGameParameters();

    this.enemyTimer = this.time.addEvent({
      delay: params.enemySpawnIntervalMs,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });
  }

  /**
   * 敵の生成ロジック
   */
  protected spawnEnemy() {
    const { width } = this.scale;
    const params = this.getGameParameters();
    const x = Phaser.Math.Between(80, width - 80);
    const enemy = this.enemies.create(x, -40, "enemy") as Phaser.Physics.Arcade.Image;
    if (enemy) {
      enemy.setVelocityY(Phaser.Math.Between(params.enemySpeedMin, params.enemySpeedMax));
    }
  }

  /**
   * プレイヤーの入力受付と移動・アクション制御
   */
  protected handlePlayerInputAndActions(time: number) {
    const params = this.getGameParameters();
    let vx = 0;
    let vy = 0;

    // --- 1. 移動制御 ---
    if (this.virtualInput.move.active) {
      // 左バーチャルスティックによるアナログ移動
      vx = this.virtualInput.move.x * params.playerSpeed;
      vy = this.virtualInput.move.y * params.playerSpeed;
    } else {
      // キーボード（カーソルキー）入力
      const isLeft = Boolean(this.cursors && this.cursors.left.isDown);
      const isRight = Boolean(this.cursors && this.cursors.right.isDown);
      const isUp = Boolean(this.cursors && this.cursors.up.isDown);
      const isDown = Boolean(this.cursors && this.cursors.down.isDown);

      if (isLeft) vx -= params.playerSpeed;
      if (isRight) vx += params.playerSpeed;
      if (isUp) vy -= params.playerSpeed;
      if (isDown) vy += params.playerSpeed;

      // 斜め移動時の速度正規化
      if (vx !== 0 && vy !== 0) {
        vx *= Math.SQRT1_2;
        vy *= Math.SQRT1_2;
      }
    }

    this.player.setVelocity(vx, vy);

    // --- 2. 自機の向き（ローテーション）制御 ---
    // 攻撃スティックが倒されている場合はその向きを優先、なければ移動方向を向く
    if (this.virtualInput.shoot.active) {
      // 自機画像は上向き(0度=右に対して-90度)を基準に作成されているため +PI/2 で補正
      this.player.setRotation(this.virtualInput.shoot.angle + Math.PI / 2);
    } else if (this.virtualInput.move.active) {
      this.player.setRotation(this.virtualInput.move.angle + Math.PI / 2);
    } else if (vx !== 0 || vy !== 0) {
      const moveAngle = Math.atan2(vy, vx);
      this.player.setRotation(moveAngle + Math.PI / 2);
    }

    // --- 3. 射撃制御 ---
    const isKeyboardShoot = Boolean(this.cursors && this.cursors.space.isDown);
    const isVirtualShoot = this.virtualInput.shoot.active;

    if ((isVirtualShoot || isKeyboardShoot) && time > this.lastFired) {
      const shootAngle = isVirtualShoot
        ? this.virtualInput.shoot.angle
        : this.player.rotation - Math.PI / 2;

      this.fireBullet(shootAngle, params.bulletSpeed);
      this.lastFired = time + params.fireRateMs;
    }
  }

  /**
   * 指定した角度へ弾を発射
   */
  protected fireBullet(angle: number, speed: number) {
    // プレイヤーの先端付近から弾を射出
    const spawnOffsetX = Math.cos(angle) * 32;
    const spawnOffsetY = Math.sin(angle) * 32;

    const bullet = this.bullets.get(
      this.player.x + spawnOffsetX,
      this.player.y + spawnOffsetY,
    ) as Phaser.Physics.Arcade.Image | null;

    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      bullet.setRotation(angle + Math.PI / 2);
    }
  }

  /**
   * 毎フレームのゲームオブジェクト更新・画面外判定
   */
  protected updateGameObjects() {
    const { width, height } = this.scale;

    // 弾の画面外（全方向）破棄判定
    const bullets = this.bullets.getChildren() as Phaser.Physics.Arcade.Image[];
    for (const bullet of bullets) {
      if (
        bullet.active &&
        (bullet.x < -40 || bullet.x > width + 40 || bullet.y < -40 || bullet.y > height + 40)
      ) {
        bullet.destroy();
      }
    }

    // 敵の画面外（下部）破棄判定
    const enemies = this.enemies.getChildren() as Phaser.Physics.Arcade.Image[];
    for (const enemy of enemies) {
      if (enemy.active && enemy.y > height + 40) {
        enemy.destroy();
      }
    }
  }

  // ==========================================
  // ゲーム共通基盤処理
  // ==========================================

  create() {
    const { width, height } = this.scale;
    const params = this.getGameParameters();

    this.score = 0;
    this.hp = params.initialHp;
    this.maxHp = params.initialHp;

    EventBus.emit("current-scene-ready", this);
    EventBus.emit("game-started");

    // UI Scene をオーバーレイ起動
    this.scene.launch("UIScene", {
      hp: this.hp,
      maxHp: this.maxHp,
      score: this.score,
    });

    // コントローラーシーン（移動・攻撃バーチャルスティック）を起動
    // PC環境・タッチ環境の両方で利用可能
    this.scene.launch("ControllerScene");

    // 物理境界
    this.physics.world.setBounds(0, 0, width, height);

    // ゲーム特有のオブジェクト初期化
    this.initGameObjects(width, height);

    // 当たり判定とタイマーの設定
    this.setupCollisions();
    this.setupGameTimers();

    // キーボード入力初期化
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // ControllerScene からのイベントを受信
    this.events.on("controller-input", (input: ControllerInputPayload) => {
      this.virtualInput = input;
    });

    // シーン破棄時のクリーンアップ
    this.events.on("shutdown", () => {
      this.enemyTimer?.remove();
      this.events.off("controller-input");
    });
  }

  protected addScore(points: number) {
    this.score += points;
    EventBus.emit("score-updated", this.score);
  }

  protected damage(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
    EventBus.emit("hp-updated", this.hp);

    // 画面フラッシュ演出
    this.cameras.main.shake(150, 0.01);

    if (this.hp <= 0) {
      this.gameOver();
    }
  }

  protected gameOver() {
    if (this.enemyTimer) this.enemyTimer.paused = true;
    this.physics.pause();

    // ゲーム画面を停止させたまま ResultScene をオーバーレイ表示
    this.scene.pause("GameScene");
    this.scene.launch("ResultScene", {
      result: "gameover",
      score: this.score,
    });
  }

  update(time: number) {
    if (this.hp <= 0) return;

    this.handlePlayerInputAndActions(time);
    this.updateGameObjects();
  }
}
