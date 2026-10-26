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
import {
  createBipedalWolfEnemy,
  createBomberEnemy,
  createRangerEnemy,
  Enemy,
  EnemyBase,
} from "./ai";
import type { BulletManager } from "./BulletManager";
import type { DamageZoneManager } from "./damageZone/DamageZoneManager";
import type { TrapManager } from "./trap/TrapManager";
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
  protected bulletManager?: BulletManager;
  protected damageZoneManager?: DamageZoneManager;
  protected trapManager?: TrapManager;

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
    bulletManager?: BulletManager,
    damageZoneManager?: DamageZoneManager,
    trapManager?: TrapManager,
  ): void {
    this.scene = scene;
    this.worldSize = worldSize;
    this.getPlayerPosition = getPlayerPosition;
    this.bulletManager = bulletManager;
    this.damageZoneManager = damageZoneManager;
    this.trapManager = trapManager;

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
   * 敵の生成ロジック（プレイヤー視界外からスポーン ＆ 疑似2.5次元の影を配置）
   */
  protected spawnEnemy(): void {
    const playerPos = this.getPlayerPosition();

    // プレイヤー中心から全周囲の視野外にスポーン
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

    // マイクロステートマシン × 耐性システム対応の敵を均等確率でスポーン
    // Bomber (自爆特攻), BipedalWolf (大一歩旋回制限攻撃), Ranger (狙撃・射線迂回・近接カウンター)
    const roll = Math.random();
    let enemy: EnemyBase;
    if (roll < 0.34) {
      enemy = createBomberEnemy(this.scene, clampedX, clampedY);
    } else if (roll < 0.67) {
      enemy = createBipedalWolfEnemy(this.scene, clampedX, clampedY);
    } else {
      enemy = createRangerEnemy(this.scene, clampedX, clampedY);
    }
    this.enemies.add(enemy);

    if (enemy) {
      const speed = Phaser.Math.Between(this.config.speedMin, this.config.speedMax);
      enemy.setData("speed", speed);
      enemy.setData("shadow", shadow);
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
   * 敵へのダメージ処理（被弾フラッシュ＆CC状態異常の適用＆HPゼロでの撃破判定）
   */
  damageEnemy(
    enemy: Phaser.Physics.Arcade.Image | EnemyBase,
    amount: number,
    cc?: { stunDurationMs?: number; slowAmount?: number },
  ): { isDead: boolean; x: number; y: number } {
    const x = enemy.x;
    const y = enemy.y;

    // すでに死亡処理中（自爆シーケンス中等）の敵は追撃を受け付けない
    if (enemy.getData("isDying")) {
      return { isDead: false, x, y };
    }

    let newHp: number;
    if (enemy instanceof EnemyBase) {
      newHp = enemy.takeDamage(amount);
    } else {
      const currentHp = (enemy.getData("hp") as number | undefined) ?? this.config.hp;
      newHp = currentHp - amount;
      enemy.setData("hp", newHp);
    }

    if (newHp <= 0) {
      // 死亡時フック（自爆シーケンス等）が存在し true を返した場合は即時 destroy を委任
      if (enemy instanceof EnemyBase && enemy.handleDeath()) {
        return { isDead: true, x, y };
      }
      // 影は enemy の destroy リスナーで自動削除される
      enemy.destroy();
      return { isDead: true, x, y };
    }

    // CC状態異常（スタン・スロウ）の適用
    if (enemy instanceof EnemyBase) {
      if (cc?.slowAmount && cc.slowAmount > 0) {
        enemy.applySlow(cc.slowAmount);
      }
      if (cc?.stunDurationMs && cc.stunDurationMs > 0) {
        enemy.applyStun(cc.stunDurationMs);
      }
      // EnemyBase は内部でタイマー式被弾フラッシュを一元管理
      enemy.triggerHitFlash(ENEMY_FLASH_DURATION_MS);
    } else {
      // レガシー画像スプライト向けのフォールバック被弾フラッシュ演出
      enemy.setData("isFlashing", true);
      enemy.setTint(ENEMY_FLASH_COLOR);
      this.scene.time.delayedCall(ENEMY_FLASH_DURATION_MS, () => {
        if (enemy.active) {
          enemy.setData("isFlashing", false);
          this.restoreEnemyVisuals(enemy);
        }
      });
    }

    return { isDead: false, x, y };
  }

  /**
   * 被弾フラッシュ終了後に、デバフ状態に応じた色調に戻す
   */
  protected restoreEnemyVisuals(enemy: Phaser.Physics.Arcade.Image | EnemyBase): void {
    if (enemy instanceof EnemyBase) {
      if (enemy.timeScale <= 0) {
        enemy.setTint(0x66ccff); // 凍結（水色）
      } else if (enemy.iceMeter > 0) {
        enemy.setTint(0x99ddff); // スロウ（淡い水色）
      } else if (
        enemy.pendingStunDurationMs > 0 &&
        (enemy as Enemy<string>).currentState === "STUN"
      ) {
        enemy.setTint(0xffff66); // スタン（黄色）
      } else {
        enemy.clearTint();
      }
    } else {
      enemy.clearTint();
    }
  }

  /**
   * 毎フレームの敵更新（AIステートマシン・2次元スプライト向き・ホバリング浮遊・影の追従）
   */
  update(player: Phaser.Physics.Arcade.Image, time = 0, delta = 16): void {
    const enemies = this.enemies.getChildren() as (Phaser.Physics.Arcade.Image | EnemyBase)[];
    for (const enemy of enemies) {
      if (enemy.active) {
        // AIステートマシンの更新
        if (enemy instanceof Enemy) {
          enemy.updateEnemy(
            {
              player,
              bulletManager: this.bulletManager,
              damageZoneManager: this.damageZoneManager,
              trapManager: this.trapManager,
              scene: this.scene,
              getEnemies: () => this.enemies.getChildren(),
            },
            delta,
          );
        } else {
          // 従来の直線追従移動フォールバック
          const speed = (enemy.getData("speed") as number) || ENEMY_DEFAULT_SPEED;
          this.scene.physics.moveToObject(enemy, player, speed);

          // レガシー画像スプライト向けのデバフTint反映
          if (!enemy.getData("isFlashing") && enemy instanceof EnemyBase) {
            if (enemy.timeScale <= 0) {
              enemy.setTint(0x66ccff);
            } else if (enemy.iceMeter > 0) {
              enemy.setTint(0x99ddff);
            }
          }

          // 2次元スプライト方式：汎用ヘルパーで方向スプライトを切り替える
          const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
          const mode =
            (enemy.getData("directionalMode") as DirectionalMode | undefined) ??
            this.config.directionalMode ??
            "horizontal2";
          const currentDir = enemy.getData("direction") as CharacterDirection | undefined;

          const updatedDir = applyDirectionalTexture(
            enemy,
            "enemy",
            mode,
            angleToPlayer,
            currentDir,
          );
          enemy.setData("direction", updatedDir);
        }

        // 水平移動に応じた極小のティルト
        const speed = (enemy.getData("speed") as number) || ENEMY_DEFAULT_SPEED;
        const vx = enemy.body ? enemy.body.velocity.x : 0;
        const subtleTilt = (vx / speed) * 0.04;
        enemy.setRotation(subtleTilt);

        // ホバリングによる上下の浮遊ボビング
        const bobPhase = (enemy.getData("bobPhase") as number) || 0;
        const bobOffset = Math.sin(time * 0.005 + bobPhase) * 2.5;

        // 地面の影の追従
        const shadow = enemy.getData("shadow") as Phaser.GameObjects.Image | undefined;
        if (shadow && shadow.active) {
          shadow.setPosition(enemy.x + SHADOW_OFFSET_X, enemy.y + SHADOW_OFFSET_Y);
          shadow.setRotation(0);
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
