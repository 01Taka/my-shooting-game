import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { EventBus } from "../EventBus";
import { useGameSettings } from "../stores/useGameSettings";
import { useInputMode } from "../stores/useInputMode";
import type { ControllerInputPayload } from "./ControllerScene";

export class GameScene extends Phaser.Scene {
  protected readonly worldSize = 4000; // 4000x4000の広大な宇宙空間
  protected player!: Phaser.Physics.Arcade.Image;
  protected cameraTarget!: Phaser.GameObjects.Zone;
  protected cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  protected wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  protected bullets!: Phaser.Physics.Arcade.Group;
  protected enemies!: Phaser.Physics.Arcade.Group;
  protected score = 0;
  protected hp = 100;
  protected maxHp = 100;
  protected lastFired = 0;
  protected enemyTimer!: Phaser.Time.TimerEvent;

  // 視線先行カメラ用の相対オフセット（自機位置とは独立して補間）
  protected currentLookOffsetX = 0;
  protected currentLookOffsetY = 0;

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
  // ==========================================

  /**
   * ゲームの基本パラメータ定義
   */
  protected getGameParameters() {
    return {
      initialHp: 100,
      playerSpeed: 520,
      fireRateMs: 160,
      bulletSpeed: 950,
      enemySpawnIntervalMs: 800,
      enemySpeedMin: 180,
      enemySpeedMax: 320,
      enemyScore: 100,
      enemyDamage: 25,
      lookAheadDistanceY: 240, // 上下方向の先行オフセット距離（画面高が低いため大きく確保）
      lookAheadDistanceX: 60, // 左右方向の先行オフセット距離（上下の1/4：横長画面のため控えめに設定）
    };
  }

  /**
   * ゲームオブジェクト（キャラクター、弾、敵グループ等）の初期化
   */
  protected initGameObjects() {
    const center = this.worldSize / 2;

    // 宇宙空間背景の敷き詰め (4000x4000)
    this.add.tileSprite(center, center, this.worldSize, this.worldSize, "starfield");

    // ワールド境界の可視フェンス（世界の果てを示すボーダー線）
    const border = this.add.graphics();
    border.lineStyle(8, 0x38bdf8, 0.7);
    border.strokeRect(0, 0, this.worldSize, this.worldSize);

    // プレイヤー作成 (中央スタート 2000, 2000)
    this.player = this.physics.add.image(center, center, "player");
    this.player.setCollideWorldBounds(true);

    // カメラが滑らかに先行追従するための注視ターゲット
    this.cameraTarget = this.add.zone(center, center, 1, 1);

    // 弾グループ
    this.bullets = this.physics.add.group({
      defaultKey: "bullet",
      maxSize: 60,
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
        AudioManager.getInstance().playSE("explosion");
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
   * ゲームタイマー（敵の定期出現）の設定
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
   * 敵の生成ロジック（プレイヤー視界外の全周囲からスポーン）
   */
  protected spawnEnemy() {
    const params = this.getGameParameters();

    // プレイヤー中心から全周囲360度の視野外（950〜1150px）にスポーン
    const spawnAngle = Phaser.Math.RND.realInRange(0, Math.PI * 2);
    const spawnDistance = Phaser.Math.Between(950, 1150);

    const spawnX = this.player.x + Math.cos(spawnAngle) * spawnDistance;
    const spawnY = this.player.y + Math.sin(spawnAngle) * spawnDistance;

    // ワールド境界内に収まるようクランプ
    const clampedX = Phaser.Math.Clamp(spawnX, 80, this.worldSize - 80);
    const clampedY = Phaser.Math.Clamp(spawnY, 80, this.worldSize - 80);

    const enemy = this.enemies.create(clampedX, clampedY, "enemy") as Phaser.Physics.Arcade.Image;
    if (enemy) {
      const speed = Phaser.Math.Between(params.enemySpeedMin, params.enemySpeedMax);
      enemy.setData("speed", speed);
      enemy.setCollideWorldBounds(true);
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
      // キーボード（カーソルキー & WASD）入力
      const isLeft = Boolean(
        (this.cursors && this.cursors.left.isDown) || (this.wasdKeys && this.wasdKeys.A.isDown),
      );
      const isRight = Boolean(
        (this.cursors && this.cursors.right.isDown) || (this.wasdKeys && this.wasdKeys.D.isDown),
      );
      const isUp = Boolean(
        (this.cursors && this.cursors.up.isDown) || (this.wasdKeys && this.wasdKeys.W.isDown),
      );
      const isDown = Boolean(
        (this.cursors && this.cursors.down.isDown) || (this.wasdKeys && this.wasdKeys.S.isDown),
      );

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

    const isPcCursorFollow =
      useInputMode.getState().mode === "pc" && useGameSettings.getState().followCursor;

    // --- 2. 自機の向き（ローテーション）制御 ---
    if (isPcCursorFollow) {
      const pointer = this.input.activePointer;
      // カメラ追従時は pointer.worldX / worldY でワールド内カーソル位置を取得
      if (pointer && (pointer.worldX !== 0 || pointer.worldY !== 0)) {
        const aimAngle = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x);
        this.player.setRotation(aimAngle + Math.PI / 2);
      }
    } else if (this.virtualInput.shoot.active) {
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
    const isMouseShoot = isPcCursorFollow && Boolean(this.input.activePointer.isDown);

    if ((isVirtualShoot || isKeyboardShoot || isMouseShoot) && time > this.lastFired) {
      let shootAngle: number;
      if (isMouseShoot) {
        shootAngle = Math.atan2(
          this.input.activePointer.worldY - this.player.y,
          this.input.activePointer.worldX - this.player.x,
        );
      } else if (isVirtualShoot) {
        shootAngle = this.virtualInput.shoot.angle;
      } else {
        shootAngle = this.player.rotation - Math.PI / 2;
      }

      this.fireBullet(shootAngle, params.bulletSpeed);
      this.lastFired = time + params.fireRateMs;
    }
  }

  /**
   * 指定した角度へ弾を発射
   */
  protected fireBullet(angle: number, speed: number) {
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
      AudioManager.getInstance().playSE("laser", {
        detune: Phaser.Math.Between(-30, 30),
      });
    }
  }

  /**
   * カメラのプレイヤー追従 ＆ 視線方向への先行オフセット（Look-ahead）更新
   */
  protected updateCameraLookAhead() {
    const params = this.getGameParameters();

    // プレイヤーが現在向いている角度（上向き基準画像のため -PI/2 で幾何角へ変換）
    const currentAngle = this.player.rotation - Math.PI / 2;

    // 操作中（移動中または射撃中）なら視線方向へカメラを先行、完全停止時は距離を短縮
    const isMoving =
      (this.player.body &&
        (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0)) ||
      this.virtualInput.move.active;
    const isShooting = this.virtualInput.shoot.active || this.input.activePointer.isDown;

    // 上下方向は大きく追従（240px）、左右方向は1/4程度（60px）に抑え、最大距離の位置が楕円軌道を描くように設定
    const lookDistanceY = isShooting || isMoving ? params.lookAheadDistanceY : 60;
    const lookDistanceX = isShooting || isMoving ? params.lookAheadDistanceX : 15;

    // 視線方向への目標オフセット（自機からの相対位置）
    const targetOffsetX = Math.cos(currentAngle) * lookDistanceX;
    const targetOffsetY = Math.sin(currentAngle) * lookDistanceY;

    // 視線オフセット（相対値）のみを慣性（Lerp 0.06）で滑らかに補間
    this.currentLookOffsetX = Phaser.Math.Linear(this.currentLookOffsetX, targetOffsetX, 0.06);
    this.currentLookOffsetY = Phaser.Math.Linear(this.currentLookOffsetY, targetOffsetY, 0.06);

    // カメラ注視点は「自機の現在位置 ＋ 補間された視線オフセット」へ即時配置
    // これにより自機の移動には遅延ゼロで追従し、視線の変化だけが滑らかに追従する
    this.cameraTarget.x = this.player.x + this.currentLookOffsetX;
    this.cameraTarget.y = this.player.y + this.currentLookOffsetY;
  }

  /**
   * 毎フレームのゲームオブジェクト更新（敵追従・距離消去判定）
   */
  protected updateGameObjects() {
    // --- 弾の生存・消去判定（プレイヤーから一定距離以上で破棄） ---
    const bullets = this.bullets.getChildren() as Phaser.Physics.Arcade.Image[];
    for (const bullet of bullets) {
      if (bullet.active) {
        const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, this.player.x, this.player.y);
        if (
          dist > 1400 ||
          bullet.x < -40 ||
          bullet.x > this.worldSize + 40 ||
          bullet.y < -40 ||
          bullet.y > this.worldSize + 40
        ) {
          bullet.destroy();
        }
      }
    }

    // --- 敵のプレイヤー追従移動・向き更新・距離消去判定 ---
    const enemies = this.enemies.getChildren() as Phaser.Physics.Arcade.Image[];
    for (const enemy of enemies) {
      if (enemy.active) {
        // プレイヤーに向かって追従移動
        const speed = (enemy.getData("speed") as number) || 240;
        this.physics.moveToObject(enemy, this.player, speed);

        // 敵の向きをプレイヤーに向ける
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        enemy.setRotation(angle + Math.PI / 2);

        // プレイヤーから遠く離れすぎた敵（2400px以上）は消去してリソース節約
        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        if (dist > 2400) {
          enemy.destroy();
        }
      }
    }
  }

  // ==========================================
  // ゲーム共通基盤処理
  // ==========================================

  create() {
    const params = this.getGameParameters();

    this.score = 0;
    this.hp = params.initialHp;
    this.maxHp = params.initialHp;

    EventBus.emit("current-scene-ready", this);
    EventBus.emit("game-started");

    // UI Scene をオーバーレイ起動（画面固定HUD）
    this.scene.launch("UIScene", {
      hp: this.hp,
      maxHp: this.maxHp,
      score: this.score,
    });

    // コントローラーシーン（画面固定バーチャルスティック）を起動
    this.scene.launch("ControllerScene");

    // 広大なワールド境界（4000x4000）の設定
    this.physics.world.setBounds(0, 0, this.worldSize, this.worldSize);

    // ゲーム特有のオブジェクト初期化
    this.initGameObjects();

    // カメラ設定: 4000x4000 の世界で境界を設定し、自機位置に即時追従（遅延ゼロ: lerp=1）
    this.cameras.main.setBounds(0, 0, this.worldSize, this.worldSize);
    this.cameras.main.startFollow(this.cameraTarget, false, 1, 1);

    // 当たり判定とタイマーの設定
    this.setupCollisions();
    this.setupGameTimers();

    // キーボード入力初期化（カーソルキー & WASD）
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
      }) as {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
      };
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

    AudioManager.getInstance().playSE("hit");

    // 画面フラッシュ演出
    this.cameras.main.shake(150, 0.01);

    if (this.hp <= 0) {
      this.gameOver();
    }
  }

  protected gameOver() {
    if (this.enemyTimer) this.enemyTimer.paused = true;
    this.physics.pause();

    AudioManager.getInstance().playSE("gameover");

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
    this.updateCameraLookAhead();
    this.updateGameObjects();
  }
}
