import Phaser from "phaser";

import {
  DEPTH_OBJECT,
  DEPTH_SHADOW,
  ENEMY_BOUNDS_PADDING,
  ENEMY_DEFAULT_SPEED,
  ENEMY_DESPAWN_DISTANCE,
  ENEMY_FLASH_COLOR,
  ENEMY_FLASH_DURATION_MS,
  ENEMY_SPAWN_DISTANCE_MAX,
  ENEMY_SPAWN_DISTANCE_MIN,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
  WORLD_SIZE,
} from "../constants";
import {
  applyDirectionalTexture,
  type CharacterDirection,
  type DirectionalMode,
} from "../utils/directionalSprite";
import type { EnemyConfig } from "./types";

/**
 * 敵管理マネージャー
 * 敵グループの管理、全方位スポーン、疑似2.5次元ホバリング＆影の連動、AI追従移動、距離判定による自動消去を担当
 */
export class EnemyManager {
  protected config: EnemyConfig;
  protected enemies!: Phaser.Physics.Arcade.Group;
  protected spawnTimer!: Phaser.Time.TimerEvent;
  protected scene!: Phaser.Scene;
  protected worldSize = WORLD_SIZE;
  protected getPlayerPosition!: () => { x: number; y: number };

  constructor(config: EnemyConfig) {
    this.config = config;
  }

  /**
   * 敵グループおよびスポーンタイマーの初期化
   */
  init(
    scene: Phaser.Scene,
    worldSize: number,
    getPlayerPosition: () => { x: number; y: number },
  ): void {
    this.scene = scene;
    this.worldSize = worldSize;
    this.getPlayerPosition = getPlayerPosition;

    this.enemies = scene.physics.add.group();

    this.spawnTimer = scene.time.addEvent({
      delay: this.config.spawnIntervalMs,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });
  }

  /**
   * 衝突判定用の Arcade Group を取得
   */
  getGroup(): Phaser.Physics.Arcade.Group {
    return this.enemies;
  }

  /**
   * 敵の生成ロジック（プレイヤー視界外360度からスポーン ＆ 疑似2.5次元の影を配置）
   */
  protected spawnEnemy(): void {
    const playerPos = this.getPlayerPosition();

    // プレイヤー中心から全周囲360度の視野外にスポーン
    const spawnAngle = Phaser.Math.RND.realInRange(0, Math.PI * 2);
    const spawnDistance = Phaser.Math.Between(ENEMY_SPAWN_DISTANCE_MIN, ENEMY_SPAWN_DISTANCE_MAX);

    const spawnX = playerPos.x + Math.cos(spawnAngle) * spawnDistance;
    const spawnY = playerPos.y + Math.sin(spawnAngle) * spawnDistance;

    // ワールド境界内に収まるようクランプ
    const clampedX = Phaser.Math.Clamp(
      spawnX,
      ENEMY_BOUNDS_PADDING,
      this.worldSize - ENEMY_BOUNDS_PADDING,
    );
    const clampedY = Phaser.Math.Clamp(
      spawnY,
      ENEMY_BOUNDS_PADDING,
      this.worldSize - ENEMY_BOUNDS_PADDING,
    );

    // 地面に落ちる影スプライトを生成（本体より低い深度）
    const shadow = this.scene.add.image(
      clampedX + SHADOW_OFFSET_X,
      clampedY + SHADOW_OFFSET_Y,
      "enemy_shadow",
    );
    shadow.setDepth(DEPTH_SHADOW);

    const mode: DirectionalMode = this.config.directionalMode ?? "horizontal2";
    const initialTexture = mode === "horizontal2" ? "enemy_right" : "enemy_front_right";
    const initialDir: CharacterDirection = mode === "horizontal2" ? "right" : "front_right";

    const enemy = this.enemies.create(
      clampedX,
      clampedY,
      initialTexture,
    ) as Phaser.Physics.Arcade.Image;
    if (enemy) {
      const speed = Phaser.Math.Between(this.config.speedMin, this.config.speedMax);
      enemy.setData("speed", speed);
      enemy.setData("hp", this.config.hp);
      enemy.setData("shadow", shadow);
      enemy.setData("direction", initialDir);
      enemy.setData("directionalMode", mode);
      enemy.setData("bobPhase", Math.random() * Math.PI * 2);
      enemy.setDepth(DEPTH_OBJECT);
      enemy.setRotation(0);
      enemy.setCollideWorldBounds(true);

      // 敵が破棄されたとき（衝突死やデスポーン時）に影も確実に破棄
      enemy.once("destroy", () => {
        if (shadow && shadow.active) {
          shadow.destroy();
        }
      });
    } else {
      // 敵生成に失敗した場合は影も破棄
      shadow.destroy();
    }
  }

  /**
   * 敵へのダメージ処理（被弾フラッシュ＆HPゼロでの撃破判定）
   */
  damageEnemy(
    enemy: Phaser.Physics.Arcade.Image,
    amount: number,
  ): { isDead: boolean; x: number; y: number } {
    const x = enemy.x;
    const y = enemy.y;
    const currentHp = (enemy.getData("hp") as number | undefined) ?? this.config.hp;
    const newHp = currentHp - amount;
    enemy.setData("hp", newHp);

    if (newHp <= 0) {
      // 影は enemy の destroy リスナーで自動削除される
      enemy.destroy();
      return { isDead: true, x, y };
    }

    // 被弾フラッシュ演出（赤く点滅）
    enemy.setTint(ENEMY_FLASH_COLOR);
    this.scene.time.delayedCall(ENEMY_FLASH_DURATION_MS, () => {
      if (enemy.active) {
        enemy.clearTint();
      }
    });

    return { isDead: false, x, y };
  }

  /**
   * 毎フレームの敵追従移動・2次元スプライト方向切り替え（斜め4方向または左右2方向）・ホバリング浮遊・影の追従更新
   */
  update(player: Phaser.Physics.Arcade.Image, time = 0): void {
    const enemies = this.enemies.getChildren() as Phaser.Physics.Arcade.Image[];
    for (const enemy of enemies) {
      if (enemy.active) {
        // プレイヤーに向かって追従移動
        const speed = (enemy.getData("speed") as number) || ENEMY_DEFAULT_SPEED;
        this.scene.physics.moveToObject(enemy, player, speed);

        // 2次元スプライト方式：360度回転させず、汎用ヘルパーで方向スプライトを切り替える
        const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
        const mode =
          (enemy.getData("directionalMode") as DirectionalMode | undefined) ??
          this.config.directionalMode ??
          "horizontal2";
        const currentDir = enemy.getData("direction") as CharacterDirection | undefined;

        const updatedDir = applyDirectionalTexture(enemy, "enemy", mode, angleToPlayer, currentDir);
        enemy.setData("direction", updatedDir);

        // 360度回転は行わず、水平移動に応じた極小のティルト（傾き約2度）のみ付与
        const vx = enemy.body ? enemy.body.velocity.x : 0;
        const subtleTilt = (vx / speed) * 0.04;
        enemy.setRotation(subtleTilt);

        // ホバリングによる上下の浮遊ボビング
        const bobPhase = (enemy.getData("bobPhase") as number) || 0;
        const bobOffset = Math.sin(time * 0.005 + bobPhase) * 2.5;

        // スケールは2Dビルボードスプライトとして等倍をベースにしつつ、浮遊感を反映
        enemy.setScale(1.0, 1.0);

        // 地面の影の追従
        const shadow = enemy.getData("shadow") as Phaser.GameObjects.Image | undefined;
        if (shadow && shadow.active) {
          // 影は地面の接地位置に配置
          shadow.setPosition(enemy.x + SHADOW_OFFSET_X, enemy.y + SHADOW_OFFSET_Y);
          shadow.setRotation(0);
          // 敵が浮き上がると影はわずかに小さく淡くなり、降りると濃くなる
          const shadowScale = 1.0 - (bobOffset / 2.5) * 0.07;
          shadow.setScale(shadowScale, shadowScale * 0.85);
          shadow.setAlpha(0.44 - (bobOffset / 2.5) * 0.06);
        }

        // プレイヤーから遠く離れすぎた敵は消去してリソース節約
        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
        if (dist > ENEMY_DESPAWN_DISTANCE) {
          enemy.destroy();
        }
      }
    }
  }

  /**
   * スポーンタイマーの一時停止
   */
  pause(): void {
    if (this.spawnTimer) {
      this.spawnTimer.paused = true;
    }
  }

  /**
   * リソース解放
   */
  destroy(): void {
    if (this.spawnTimer) {
      this.spawnTimer.remove();
    }
    // シーン停止時はPhaser本体がグループを破棄するため、childrenが存在する場合のみ安全にクリア
    if (this.enemies && this.enemies.children) {
      const enemies = this.enemies.getChildren() as Phaser.Physics.Arcade.Image[];
      for (const enemy of enemies) {
        const shadow = enemy.getData("shadow") as Phaser.GameObjects.Image | undefined;
        if (shadow && shadow.active) {
          shadow.destroy();
        }
      }
      this.enemies.clear(true, true);
    }
  }
}
