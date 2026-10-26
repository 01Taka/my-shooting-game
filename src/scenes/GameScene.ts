import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import {
  BLINK_COOLDOWN_MS,
  BLINK_COST,
  BLINK_DISTANCE,
  BLINK_METER_MAX,
  BLINK_RECOVERY_PER_SECOND,
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
  DEPTH_GROUND,
  DEPTH_OBJECT,
  DEPTH_SHADOW,
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
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
  WORLD_BORDER_ALPHA,
  WORLD_BORDER_COLOR,
  WORLD_BORDER_WIDTH,
  WORLD_SIZE,
} from "../constants";
import { EventBus } from "../EventBus";
import {
  BlinkManager,
  BulletManager,
  CameraManager,
  EnemyManager,
  LockOnManager,
  PlayerController,
  PlayerStatusHUD,
  WeaponSelectHUD,
} from "../game";
import type { GameParameters, WeaponType } from "../game/types";
import { getControlMode } from "../stores/useInputMode";
import type { ControllerInputPayload } from "./ControllerScene";

const WEAPON_ORDER: WeaponType[] = ["spread", "normal", "heavy", "rapid"];

export class GameScene extends Phaser.Scene {
  protected readonly worldSize = WORLD_SIZE; // 広大なワールドマップ
  protected player!: Phaser.Physics.Arcade.Image;
  protected playerShadow!: Phaser.GameObjects.Image; // 疑似2.5次元 プレイヤーの影

  // 分割された責任マネージャー群
  protected cameraManager!: CameraManager;
  protected bulletManager!: BulletManager;
  protected enemyManager!: EnemyManager;
  protected lockOnManager!: LockOnManager;
  protected playerController!: PlayerController;
  protected playerStatusHUD!: PlayerStatusHUD;
  protected blinkManager!: BlinkManager;
  protected weaponSelectHUD!: WeaponSelectHUD;
  protected weaponKeys?: { [key: string]: Phaser.Input.Keyboard.Key };

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
      blink: {
        distance: BLINK_DISTANCE,
        maxMeter: BLINK_METER_MAX,
        cost: BLINK_COST,
        recoveryPerSecond: BLINK_RECOVERY_PER_SECOND,
        cooldownMs: BLINK_COOLDOWN_MS,
      },
    };
  }

  /**
   * ゲームオブジェクト（キャラクター、背景、各マネージャー等）の初期化
   */
  protected initGameObjects() {
    const params = this.getGameParameters();
    const center = this.worldSize / 2;

    // 土の地面背景の敷き詰め（シームレスタイリング）
    const ground = this.add.tileSprite(center, center, this.worldSize, this.worldSize, "ground");
    ground.setDepth(DEPTH_GROUND);

    // ワールド境界の可視フェンス（世界の果てを示す境界線）
    const border = this.add.graphics();
    border.setDepth(DEPTH_GROUND + 1);
    border.lineStyle(WORLD_BORDER_WIDTH, WORLD_BORDER_COLOR, WORLD_BORDER_ALPHA);
    border.strokeRect(0, 0, this.worldSize, this.worldSize);

    // 疑似2.5次元 自機（プレイヤー）の影を作成（地面に投影）
    this.playerShadow = this.add.image(
      center + SHADOW_OFFSET_X,
      center + SHADOW_OFFSET_Y,
      "player_shadow",
    );
    this.playerShadow.setDepth(DEPTH_SHADOW);

    // プレイヤー作成 (中央スタート 2000, 2000)
    this.player = this.physics.add.image(center, center, "player");
    this.player.setDepth(DEPTH_OBJECT);
    this.player.setCollideWorldBounds(true);

    // カメラマネージャーの初期化（自機即時追従 ＋ SmoothDamp視線先行）
    this.cameraManager = new CameraManager(params.camera);
    this.cameraManager.init(this, this.worldSize, center, center);

    // 弾丸マネージャーの初期化
    this.bulletManager = new BulletManager(params.bullet);
    this.bulletManager.init(this);

    // 敵マネージャーの初期化（全周囲360度スポーン ＆ 追従AI）
    this.enemyManager = new EnemyManager(params.enemy);
    this.enemyManager.init(
      this,
      this.worldSize,
      () => ({
        x: this.player.x,
        y: this.player.y,
      }),
      this.bulletManager,
    );

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

    // ブリンクマネージャーの初期化
    this.blinkManager = new BlinkManager(params.blink);
    this.blinkManager.init(this);
    this.playerStatusHUD.setBlink(this.blinkManager.getMeter(), params.blink.maxMeter, 2);

    // プレイヤー周囲の武器選択HUD初期化
    this.weaponSelectHUD = new WeaponSelectHUD();
    this.weaponSelectHUD.init(this);

    // PCキーボードによる武器切り替えショートカット（数字キー1〜4）
    if (this.input.keyboard) {
      this.weaponKeys = {
        ONE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
        TWO: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
        THREE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
        FOUR: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      };
    }
  }

  /**
   * 当たり判定・衝突ルールの設定
   */
  protected setupCollisions() {
    const params = this.getGameParameters();

    // 弾と敵の衝突（HP減算 ＆ CC付与 ＆ 撃破時チェーンロックオン）
    this.physics.add.overlap(
      this.bulletManager.getGroup(),
      this.enemyManager.getGroup(),
      (bulletObj, enemyObj) => {
        const bullet = bulletObj as Phaser.Physics.Arcade.Image;
        const enemy = enemyObj as Phaser.Physics.Arcade.Image;
        const damage = (bullet.getData("damage") as number | undefined) ?? params.bullet.damage;
        const slowAmount = bullet.getData("slowAmount") as number | undefined;
        const stunDurationMs = bullet.getData("stunDurationMs") as number | undefined;
        bullet.destroy();

        // 撃破された敵が現在ロックオン対象かどうかを事前に判定
        const isCurrentTarget = this.lockOnManager.getLockedTarget() === enemy;

        const result = this.enemyManager.damageEnemy(enemy, damage, {
          slowAmount,
          stunDurationMs,
        });
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

    // 敵弾とプレイヤーの衝突（被弾ダメージ）
    this.physics.add.overlap(
      this.player,
      this.bulletManager.getEnemyGroup(),
      (_playerObj, enemyBulletObj) => {
        const enemyBullet = enemyBulletObj as Phaser.Physics.Arcade.Image;
        const bulletDmg = (enemyBullet.getData("damage") as number | undefined) ?? 15;
        enemyBullet.destroy();
        this.damage(bulletDmg);
      },
      undefined,
      this,
    );

    // 敵弾と敵の衝突（フレンドリーファイア：同士討ち有効）
    this.physics.add.overlap(
      this.bulletManager.getEnemyGroup(),
      this.enemyManager.getGroup(),
      (bulletObj, enemyObj) => {
        const bullet = bulletObj as Phaser.Physics.Arcade.Image;
        const enemy = enemyObj as Phaser.Physics.Arcade.Image;

        // 発射者本人への即時ヒットはスキップ
        if (bullet.getData("owner") === enemy) return;

        const damage = (bullet.getData("damage") as number | undefined) ?? 15;
        const slowAmount = bullet.getData("slowAmount") as number | undefined;
        const stunDurationMs = bullet.getData("stunDurationMs") as number | undefined;
        bullet.destroy();

        const isCurrentTarget = this.lockOnManager.getLockedTarget() === enemy;

        const result = this.enemyManager.damageEnemy(enemy, damage, {
          slowAmount,
          stunDurationMs,
        });
        if (result.isDead) {
          AudioManager.getInstance().playSE("explosion");
          this.addScore(params.enemy.score);

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

    // プレイヤーと敵の物理衝突（接触ダメージなし・押し返しのみ）
    this.physics.add.collider(this.player, this.enemyManager.getGroup());

    // 敵同士の物理衝突（重なり防止・押し返し）
    this.physics.add.collider(this.enemyManager.getGroup(), this.enemyManager.getGroup());
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
      finalAngle = this.playerController ? this.playerController.getFacingAngle() : 0;
    }

    this.bulletManager.fire(this.player.x, this.player.y, finalAngle);
  }

  // ==========================================
  // ゲーム共通基盤処理
  // ==========================================

  create() {
    this.physics.resume();
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
      if (getControlMode() === "keyboardMouse") return;
      this.lockOnManager.startAimSession();
    });

    // ロックオンスティックのタップによる最寄り敵オートロックオン
    this.events.on("controller-lockon-tap", () => {
      if (getControlMode() === "keyboardMouse") return;
      this.lockOnManager.lockNearestEnemy(this.player, this.enemyManager.getGroup(), this);
    });

    // ロックオンスティック解放時の指離し手ブレ補正（タイムバッファ方式 ＆ 160ms未満フリック判定）
    this.events.on(
      "controller-lockon-release",
      (releaseTime: number, touchDuration?: number, releaseAngle?: number) => {
        if (getControlMode() === "keyboardMouse") return;
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

    // ControllerScene またはキーボード入力からのブリンク発動リスナー
    this.events.on("controller-blink", () => {
      this.blinkManager.execute(
        this.player,
        this.playerController,
        this.worldSize,
        this.playerStatusHUD,
      );
    });

    // 武器選択スティックのタッチ開始リスナー
    this.events.on("weapon-stick-start", () => {
      this.weaponSelectHUD.open(this.bulletManager.getWeapon(), this.player.x, this.player.y);
    });

    // 武器選択スティックの傾き更新リスナー
    this.events.on(
      "weapon-stick-move",
      (data: { angle: number; force: number; isDeadZone: boolean }) => {
        this.weaponSelectHUD.updateStickInput(data.angle, data.force, data.isDeadZone);
      },
    );

    // 武器選択スティックの指離し（確定またはキャンセル）リスナー
    this.events.on("weapon-stick-release", () => {
      const selectedWeapon = this.weaponSelectHUD.closeAndSelect();
      if (selectedWeapon) {
        this.bulletManager.setWeapon(selectedWeapon);
      }
    });

    // マウスホイールでの武器切り替え（キーボード&マウスモードのみ有効、PCスマホモードでは無効化）
    this.input.on(
      "wheel",
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: unknown[],
        _deltaX: number,
        deltaY: number,
      ) => {
        if (getControlMode() !== "keyboardMouse") return;
        if (this.hp <= 0) return;

        const currentWeapon = this.bulletManager.getWeapon();
        const currentIndex = WEAPON_ORDER.indexOf(currentWeapon);
        if (currentIndex === -1) return;

        // 下スクロール(deltaY > 0)で次、上スクロール(deltaY < 0)で前の武器
        const step = deltaY > 0 ? 1 : -1;
        const nextIndex = (currentIndex + step + WEAPON_ORDER.length) % WEAPON_ORDER.length;
        const nextWeapon = WEAPON_ORDER[nextIndex];

        this.bulletManager.setWeapon(nextWeapon);
        this.weaponSelectHUD.showWheelSwitch(nextWeapon, this.player.x, this.player.y);
        AudioManager.getInstance().playSE("click");
      },
    );

    // シーン破棄時のクリーンアップ（1度だけ実行）
    this.events.once("shutdown", () => {
      this.playerShadow?.destroy();
      this.enemyManager?.destroy();
      this.bulletManager?.destroy();
      this.cameraManager?.destroy();
      this.lockOnManager?.destroy();
      this.playerController?.destroy();
      this.playerStatusHUD?.destroy();
      this.blinkManager?.destroy();
      this.weaponSelectHUD?.destroy();
      this.events.off("controller-input");
      this.events.off("controller-lockon-start");
      this.events.off("controller-lockon-tap");
      this.events.off("controller-lockon-release");
      this.events.off("controller-blink");
      this.events.off("weapon-stick-start");
      this.events.off("weapon-stick-move");
      this.events.off("weapon-stick-release");
      this.input.off("wheel");
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
    this.playerShadow?.setVisible(false);
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

    const isKeyboardMouse = getControlMode() === "keyboardMouse";
    if (isKeyboardMouse) {
      // キーボード&マウスモードではロックオン機能は無効
      this.lockOnManager.clearLock();
    }

    const lockedTarget = isKeyboardMouse ? null : this.lockOnManager.getLockedTarget();

    // 1. プレイヤー入力受付・移動・向き制御（射撃コールバック、ブリンクコールバック含む）
    const inputState = this.playerController.update(
      this,
      this.player,
      lockedTarget,
      (angle) => this.shoot(angle),
      () =>
        this.blinkManager.execute(
          this.player,
          this.playerController,
          this.worldSize,
          this.playerStatusHUD,
        ),
    );

    // 2. スティック倒し中（索敵モード）なら60°扇形で敵をサーチ＆ロックオン（キーボード&マウスモードでは無効）
    if (!isKeyboardMouse && inputState.isAiming) {
      this.lockOnManager.searchAndLock(
        this.player,
        this.enemyManager.getGroup(),
        inputState.aimAngle,
        this,
      );
    }

    // 3. ロックオン維持判定 ＆ レティクルアニメーション描画 ＆ 履歴バッファ記録（キーボード&マウスモードでは無効）
    if (!isKeyboardMouse) {
      this.lockOnManager.update(this.player, delta, this, time);
    }

    // 4. カメラの先行オフセット更新（スティック操作中はスティック優先、指離し時はロック敵へ吸着、ロックなし時は中央固定）
    this.cameraManager.update(
      this.player,
      inputState.isMoving,
      inputState.isAiming,
      delta,
      lockedTarget,
      inputState.aimAngle,
    );

    // 5. 弾薬・敵のフレーム更新（生存距離・追従AI判定・2.5次元影とホバリング）
    this.bulletManager.update(this.player.x, this.player.y, this.worldSize);
    this.enemyManager.update(this.player, time, delta);

    // 疑似2.5次元 プレイヤーのホバリング浮遊 ＆ 影の追従・スケール連動
    const playerBob = Math.sin(time * 0.005) * 2.5;
    this.player.setDisplayOrigin(this.player.width / 2, this.player.height / 2 - playerBob);

    if (this.playerShadow && this.playerShadow.active) {
      this.playerShadow.setPosition(
        this.player.x + SHADOW_OFFSET_X,
        this.player.y + SHADOW_OFFSET_Y,
      );
      this.playerShadow.setRotation(0);
      const bobFactor = 1.0 - (playerBob / 2.5) * 0.06;
      const shadowScale = this.player.scaleX * bobFactor;
      this.playerShadow.setScale(shadowScale, shadowScale * 0.85);
      this.playerShadow.setAlpha(0.44 - (playerBob / 2.5) * 0.05);
    }

    // 6. ブリンクメーターの更新（時間経過自動回復＆HUD同期）
    this.blinkManager.update(delta, this.playerStatusHUD);

    // 7. プレイヤー頭上追従HUDの更新
    this.playerStatusHUD.update(this.player, delta);

    // 8. 武器選択HUDの位置追従
    this.weaponSelectHUD.updatePosition(this.player.x, this.player.y);

    // 9. PCキーボードショートカット（数字キー1〜4）での武器切り替え（キーボード&マウスモードのみ有効）
    if (isKeyboardMouse && this.weaponKeys) {
      if (Phaser.Input.Keyboard.JustDown(this.weaponKeys.ONE)) {
        this.bulletManager.setWeapon("spread");
        this.weaponSelectHUD.showWheelSwitch("spread", this.player.x, this.player.y);
      } else if (Phaser.Input.Keyboard.JustDown(this.weaponKeys.TWO)) {
        this.bulletManager.setWeapon("normal");
        this.weaponSelectHUD.showWheelSwitch("normal", this.player.x, this.player.y);
      } else if (Phaser.Input.Keyboard.JustDown(this.weaponKeys.THREE)) {
        this.bulletManager.setWeapon("heavy");
        this.weaponSelectHUD.showWheelSwitch("heavy", this.player.x, this.player.y);
      } else if (Phaser.Input.Keyboard.JustDown(this.weaponKeys.FOUR)) {
        this.bulletManager.setWeapon("rapid");
        this.weaponSelectHUD.showWheelSwitch("rapid", this.player.x, this.player.y);
      }
    }
  }
}
