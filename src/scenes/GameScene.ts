import Phaser from "phaser";

import { EventBus } from "../EventBus";

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

  // バーチャルコントローラー等からの入力フラグ
  protected virtualInput = {
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
  };

  constructor() {
    super("GameScene");
  }

  // ==========================================
  // ゲーム特有の設定・ルール・パラメータ
  // （派生ゲーム作成時はここをオーバーライドまたは編集）
  // ==========================================

  /**
   * ゲームの基本パラメータ定義
   */
  protected getGameParameters() {
    return {
      initialHp: 100,
      playerSpeed: 250,
      fireRateMs: 180,
      bulletSpeed: -400,
      enemySpawnIntervalMs: 1000,
      enemySpeedMin: 100,
      enemySpeedMax: 180,
      enemyScore: 100,
      enemyDamage: 25,
    };
  }

  /**
   * ゲームオブジェクト（キャラクター、弾、敵グループ等）の初期化
   */
  protected initGameObjects(width: number, height: number) {
    // プレイヤー作成
    this.player = this.physics.add.image(width / 2, height - 60, "player");
    this.player.setCollideWorldBounds(true);

    // 弾グループ
    this.bullets = this.physics.add.group({
      defaultKey: "bullet",
      maxSize: 30,
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
    const x = Phaser.Math.Between(40, width - 40);
    const enemy = this.enemies.create(x, -20, "enemy") as Phaser.Physics.Arcade.Image;
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

    const isLeft = (this.cursors && this.cursors.left.isDown) || this.virtualInput.left;
    const isRight = (this.cursors && this.cursors.right.isDown) || this.virtualInput.right;
    const isUp = (this.cursors && this.cursors.up.isDown) || this.virtualInput.up;
    const isDown = (this.cursors && this.cursors.down.isDown) || this.virtualInput.down;
    const isShoot = (this.cursors && this.cursors.space.isDown) || this.virtualInput.shoot;

    if (isLeft) vx -= params.playerSpeed;
    if (isRight) vx += params.playerSpeed;
    if (isUp) vy -= params.playerSpeed;
    if (isDown) vy += params.playerSpeed;

    this.player.setVelocity(vx, vy);

    // ショット発射
    if (isShoot && time > this.lastFired) {
      const bullet = this.bullets.get(
        this.player.x,
        this.player.y - 16,
      ) as Phaser.Physics.Arcade.Image | null;

      if (bullet) {
        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.setVelocityY(params.bulletSpeed);
        this.lastFired = time + params.fireRateMs;
      }
    }
  }

  /**
   * 毎フレームのゲームオブジェクト更新・画面外判定
   */
  protected updateGameObjects() {
    const bullets = this.bullets.getChildren() as Phaser.Physics.Arcade.Image[];
    for (const bullet of bullets) {
      if (bullet.active && bullet.y < -10) {
        bullet.destroy();
      }
    }

    const { height } = this.scale;
    const enemies = this.enemies.getChildren() as Phaser.Physics.Arcade.Image[];
    for (const enemy of enemies) {
      if (enemy.active && enemy.y > height + 20) {
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

    // タッチ端末判定
    const isTouchDevice =
      this.sys.game.device.input.touch || "ontouchstart" in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
      this.scene.launch("ControllerScene");
    }

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
    this.events.on("controller-input", (input: typeof this.virtualInput) => {
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
