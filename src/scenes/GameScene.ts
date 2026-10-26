import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import {
  BULLET_DAMAGE,
  BULLET_FIRE_RATE_MS,
  BULLET_MAX_COUNT,
  BULLET_SPEED,
  CAMERA_LOOK_AHEAD_DISTANCE_X,
  CAMERA_LOOK_AHEAD_DISTANCE_Y,
  CAMERA_LOOK_AHEAD_SMOOTH_TIME,
  CAMERA_MAX_LOOK_SPEED_X,
  CAMERA_MAX_LOOK_SPEED_Y,
  CAMERA_SHAKE_DURATION_MS,
  CAMERA_SHAKE_INTENSITY,
  ENEMY_DAMAGE,
  ENEMY_HP,
  ENEMY_SCORE,
  ENEMY_SPAWN_INTERVAL_MS,
  ENEMY_SPEED_MAX,
  ENEMY_SPEED_MIN,
  LOCKON_BREAK_DISTANCE,
  LOCKON_CHAIN_RADIUS,
  LOCKON_MAX_DISTANCE,
  LOCKON_SECTOR_ANGLE_DEG,
  PLAYER_INITIAL_HP,
  PLAYER_SPEED,
  WORLD_BORDER_ALPHA,
  WORLD_BORDER_COLOR,
  WORLD_BORDER_WIDTH,
  WORLD_SIZE,
} from "../constants";
import { EventBus } from "../EventBus";
import {
  BulletManager,
  CameraManager,
  EnemyManager,
  LockOnManager,
  PlayerController,
  PlayerStatusHUD,
} from "../game";
import type { GameParameters } from "../game/types";
import type { ControllerInputPayload } from "./ControllerScene";

export class GameScene extends Phaser.Scene {
  protected readonly worldSize = WORLD_SIZE; // 広大な宇宙空間
  protected player!: Phaser.Physics.Arcade.Image;

  // 分割された責任マネージャー群
  protected cameraManager!: CameraManager;
  protected bulletManager!: BulletManager;
  protected enemyManager!: EnemyManager;
  protected lockOnManager!: LockOnManager;
  protected playerController!: PlayerController;
  protected playerStatusHUD!: PlayerStatusHUD;

  // ゲーム状態
  protected score = 0;
  protected hp = PLAYER_INITIAL_HP;
  protected maxHp = PLAYER_INITIAL_HP;

  constructor() {
    super("GameScene");
  }

  // ==========================================
  // ゲーム特有の設定・ルール・パラメータ
  // ==========================================

  /**
   * ゲームの基本パラメータ定義
   */
  protected getGameParameters(): GameParameters {
    return {
      player: {
        initialHp: PLAYER_INITIAL_HP,
        speed: PLAYER_SPEED,
      },
      bullet: {
        speed: BULLET_SPEED,
        fireRateMs: BULLET_FIRE_RATE_MS,
        maxBullets: BULLET_MAX_COUNT,
        damage: BULLET_DAMAGE,
      },
      enemy: {
        spawnIntervalMs: ENEMY_SPAWN_INTERVAL_MS,
        speedMin: ENEMY_SPEED_MIN,
        speedMax: ENEMY_SPEED_MAX,
        score: ENEMY_SCORE,
        damage: ENEMY_DAMAGE,
        hp: ENEMY_HP,
      },
      camera: {
        lookAheadDistanceY: CAMERA_LOOK_AHEAD_DISTANCE_Y,
        lookAheadDistanceX: CAMERA_LOOK_AHEAD_DISTANCE_X,
        lookAheadSmoothTime: CAMERA_LOOK_AHEAD_SMOOTH_TIME,
        maxLookSpeedY: CAMERA_MAX_LOOK_SPEED_Y,
        maxLookSpeedX: CAMERA_MAX_LOOK_SPEED_X,
      },
      lockOn: {
        sectorAngleDeg: LOCKON_SECTOR_ANGLE_DEG,
        maxDistance: LOCKON_MAX_DISTANCE,
        chainRadius: LOCKON_CHAIN_RADIUS,
        breakDistance: LOCKON_BREAK_DISTANCE,
      },
    };
  }

  /**
   * ゲームオブジェクト（キャラクター、背景、各マネージャー等）の初期化
   */
  protected initGameObjects() {
    const params = this.getGameParameters();
    const center = this.worldSize / 2;

    // 宇宙空間背景の敷き詰め
    this.add.tileSprite(center, center, this.worldSize, this.worldSize, "starfield");

    // ワールド境界の可視フェンス（世界の果てを示すボーダー線）
    const border = this.add.graphics();
    border.lineStyle(WORLD_BORDER_WIDTH, WORLD_BORDER_COLOR, WORLD_BORDER_ALPHA);
    border.strokeRect(0, 0, this.worldSize, this.worldSize);

    // プレイヤー作成 (中央スタート 2000, 2000)
    this.player = this.physics.add.image(center, center, "player");
    this.player.setCollideWorldBounds(true);

    // カメラマネージャーの初期化（自機即時追従 ＋ SmoothDamp視線先行）
    this.cameraManager = new CameraManager(params.camera);
    this.cameraManager.init(this, this.worldSize, center, center);

    // 弾丸マネージャーの初期化
    this.bulletManager = new BulletManager(params.bullet);
    this.bulletManager.init(this);

    // 敵マネージャーの初期化（全周囲360度スポーン ＆ 追従AI）
    this.enemyManager = new EnemyManager(params.enemy);
    this.enemyManager.init(this, this.worldSize, () => ({
      x: this.player.x,
      y: this.player.y,
    }));

    // スマートロックオンマネージャーの初期化
    this.lockOnManager = new LockOnManager(params.lockOn);
    this.lockOnManager.init(this);

    // プレイヤー入力コントローラーの初期化
    this.playerController = new PlayerController(params.player);
    this.playerController.init(this);

    // プレイヤー頭上追従HUD（HP/MP/ブリンク）の初期化
    this.playerStatusHUD = new PlayerStatusHUD();
    this.playerStatusHUD.init(this);
    this.playerStatusHUD.setHp(this.hp, this.maxHp);
  }

  /**
   * 当たり判定・衝突ルールの設定
   */
  protected setupCollisions() {
    const params = this.getGameParameters();

    // 弾と敵の衝突（HP減算 ＆ 撃破時チェーンロックオン）
    this.physics.add.overlap(
      this.bulletManager.getGroup(),
      this.enemyManager.getGroup(),
      (bulletObj, enemyObj) => {
        const bullet = bulletObj as Phaser.Physics.Arcade.Image;
        const enemy = enemyObj as Phaser.Physics.Arcade.Image;
        const damage = (bullet.getData("damage") as number | undefined) ?? params.bullet.damage;
        bullet.destroy();

        // 撃破された敵が現在ロックオン対象かどうかを事前に判定
        const isCurrentTarget = this.lockOnManager.getLockedTarget() === enemy;

        const result = this.enemyManager.damageEnemy(enemy, damage);
        if (result.isDead) {
          AudioManager.getInstance().playSE("explosion");
          this.addScore(params.enemy.score);

          // ターゲットを倒したときだけ、周囲の敵へ自動チェーンロックオン
          if (isCurrentTarget) {
            this.lockOnManager.onTargetKilled(
              result.x,
              result.y,
              this.enemyManager.getGroup(),
              this,
            );
          }
        }
      },
      undefined,
      this,
    );

    // プレイヤーと敵の衝突
    this.physics.add.overlap(
      this.player,
      this.enemyManager.getGroup(),
      (_playerObj, enemyObj) => {
        enemyObj.destroy();
        this.damage(params.enemy.damage);
      },
      undefined,
      this,
    );
  }

  /**
   * 射撃処理（タップ単発または長押し連射）
   */
  protected shoot(shootAngle?: number) {
    if (this.hp <= 0) return;

    let finalAngle: number;
    const lockedTarget = this.lockOnManager.getLockedTarget();

    if (lockedTarget && lockedTarget.active) {
      finalAngle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        lockedTarget.x,
        lockedTarget.y,
      );
    } else if (typeof shootAngle === "number") {
      finalAngle = shootAngle;
    } else {
      finalAngle = this.player.rotation - Math.PI / 2;
    }

    this.bulletManager.fire(this.player.x, this.player.y, finalAngle);
  }

  // ==========================================
  // ゲーム共通基盤処理
  // ==========================================

  create() {
    const params = this.getGameParameters();

    this.score = 0;
    this.hp = params.player.initialHp;
    this.maxHp = params.player.initialHp;

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

    // ゲーム特有のオブジェクト・マネージャー初期化
    this.initGameObjects();

    // 当たり判定の設定
    this.setupCollisions();

    // ControllerScene からのイベントを受信
    this.events.on("controller-input", (input: ControllerInputPayload) => {
      this.playerController.setVirtualInput(input);
    });

    // ロックオンスティック操作開始（フリック用セッション履歴の初期化）
    this.events.on("controller-lockon-start", () => {
      this.lockOnManager.startAimSession();
    });

    // ロックオンスティックのタップによる最寄り敵オートロックオン
    this.events.on("controller-lockon-tap", () => {
      this.lockOnManager.lockNearestEnemy(this.player, this.enemyManager.getGroup(), this);
    });

    // ロックオンスティック解放時の指離し手ブレ補正（タイムバッファ方式 ＆ 160ms未満フリック判定）
    this.events.on(
      "controller-lockon-release",
      (releaseTime: number, touchDuration?: number, releaseAngle?: number) => {
        this.lockOnManager.confirmReleaseTarget(
          releaseTime,
          touchDuration,
          releaseAngle,
          this.player,
          this.enemyManager.getGroup(),
          this,
        );
      },
    );

    // シーン破棄時のクリーンアップ（1度だけ実行）
    this.events.once("shutdown", () => {
      this.enemyManager?.destroy();
      this.bulletManager?.destroy();
      this.cameraManager?.destroy();
      this.lockOnManager?.destroy();
      this.playerController?.destroy();
      this.playerStatusHUD?.destroy();
      this.events.off("controller-input");
      this.events.off("controller-lockon-start");
      this.events.off("controller-lockon-tap");
      this.events.off("controller-lockon-release");
    });
  }

  protected addScore(points: number) {
    this.score += points;
    EventBus.emit("score-updated", this.score);
  }

  protected damage(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
    EventBus.emit("hp-updated", this.hp);
    this.playerStatusHUD?.setHp(this.hp, this.maxHp);

    AudioManager.getInstance().playSE("hit");

    // 画面フラッシュ演出
    this.cameraManager.shake(CAMERA_SHAKE_DURATION_MS, CAMERA_SHAKE_INTENSITY);

    if (this.hp <= 0) {
      this.gameOver();
    }
  }

  protected gameOver() {
    this.enemyManager.pause();
    this.physics.pause();

    AudioManager.getInstance().playSE("gameover");

    // ゲーム画面を停止させたまま ResultScene をオーバーレイ表示
    this.scene.pause("GameScene");
    this.scene.launch("ResultScene", {
      result: "gameover",
      score: this.score,
    });
  }

  update(time: number, delta: number) {
    if (this.hp <= 0) return;

    const lockedTarget = this.lockOnManager.getLockedTarget();

    // 1. プレイヤー入力受付・移動・向き制御（射撃コールバック含む）
    const inputState = this.playerController.update(this, this.player, lockedTarget, (angle) =>
      this.shoot(angle),
    );

    // 2. スティック倒し中（索敵モード）なら60°扇形で敵をサーチ＆ロックオン
    if (inputState.isAiming) {
      this.lockOnManager.searchAndLock(
        this.player,
        this.enemyManager.getGroup(),
        inputState.aimAngle,
        this,
      );
    }

    // 3. ロックオン維持判定 ＆ レティクルアニメーション描画 ＆ 履歴バッファ記録
    this.lockOnManager.update(this.player, delta, this, time);

    // 4. カメラの先行オフセット更新（スティック操作中はスティック優先、指離し時はロック敵へ吸着、ロックなし時は中央固定）
    this.cameraManager.update(
      this.player,
      inputState.isMoving,
      inputState.isAiming,
      delta,
      this.lockOnManager.getLockedTarget(),
      inputState.aimAngle,
    );

    // 5. 弾薬・敵のフレーム更新（生存距離・追従AI判定）
    this.bulletManager.update(this.player.x, this.player.y, this.worldSize);
    this.enemyManager.update(this.player);

    // 6. プレイヤー頭上追従HUDの更新
    this.playerStatusHUD.update(this.player, delta);
  }
}
