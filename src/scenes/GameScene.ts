import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { EventBus } from "../EventBus";
import { BulletManager, CameraManager, EnemyManager, PlayerController } from "../game";
import type { GameParameters } from "../game/types";
import type { ControllerInputPayload } from "./ControllerScene";

export class GameScene extends Phaser.Scene {
  protected readonly worldSize = 4000; // 4000x4000の広大な宇宙空間
  protected player!: Phaser.Physics.Arcade.Image;

  // 分割された責任マネージャー群
  protected cameraManager!: CameraManager;
  protected bulletManager!: BulletManager;
  protected enemyManager!: EnemyManager;
  protected playerController!: PlayerController;

  // ゲーム状態
  protected score = 0;
  protected hp = 100;
  protected maxHp = 100;

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
        initialHp: 100,
        speed: 520,
      },
      bullet: {
        speed: 950,
        fireRateMs: 160,
        maxBullets: 60,
      },
      enemy: {
        spawnIntervalMs: 800,
        speedMin: 180,
        speedMax: 320,
        score: 100,
        damage: 25,
      },
      camera: {
        lookAheadDistanceY: 240, // 上下方向の先行オフセット距離（画面高が低いため大きく確保）
        lookAheadDistanceX: 60, // 左右方向の先行オフセット距離（上下の1/4：横長画面のため控えめに設定）
        lookAheadSmoothTime: 0.14, // 視線先行カメラが目標オフセットに到達する目安時間（秒）
        maxLookSpeedY: 420, // 上下の急激なエイム反転による画面の跳ね上がりを防止する最大追従速度 (px/sec)
        maxLookSpeedX: 160, // 左右の最大追従速度 (px/sec)
      },
    };
  }

  /**
   * ゲームオブジェクト（キャラクター、背景、各マネージャー等）の初期化
   */
  protected initGameObjects() {
    const params = this.getGameParameters();
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

    // プレイヤー入力コントローラーの初期化
    this.playerController = new PlayerController(params.player);
    this.playerController.init(this);
  }

  /**
   * 当たり判定・衝突ルールの設定
   */
  protected setupCollisions() {
    const params = this.getGameParameters();

    // 弾と敵の衝突
    this.physics.add.overlap(
      this.bulletManager.getGroup(),
      this.enemyManager.getGroup(),
      (bulletObj, enemyObj) => {
        bulletObj.destroy();
        enemyObj.destroy();
        AudioManager.getInstance().playSE("explosion");
        this.addScore(params.enemy.score);
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

    // シーン破棄時のクリーンアップ
    this.events.on("shutdown", () => {
      this.enemyManager?.destroy();
      this.bulletManager?.destroy();
      this.cameraManager?.destroy();
      this.playerController?.destroy();
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
    this.cameraManager.shake(150, 0.01);

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

    // 1. プレイヤー入力受付・移動・向き・射撃
    const inputState = this.playerController.update(
      this,
      this.player,
      time,
      (shootAngle, currentTime) => {
        this.bulletManager.fire(this.player.x, this.player.y, shootAngle, currentTime);
      },
    );

    // 2. カメラの視線先行（Look-ahead）更新
    this.cameraManager.update(this.player, inputState.isMoving, inputState.isShooting, delta);

    // 3. 弾薬・敵のフレーム更新（生存距離・追従AI判定）
    this.bulletManager.update(this.player.x, this.player.y, this.worldSize);
    this.enemyManager.update(this.player);
  }
}
