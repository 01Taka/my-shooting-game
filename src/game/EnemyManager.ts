import Phaser from "phaser";

import type { EnemyConfig } from "./types";

/**
 * 敵管理マネージャー
 * 敵グループの管理、全方位スポーン、AI追従移動、距離判定による自動消去を担当
 */
export class EnemyManager {
  protected config: EnemyConfig;
  protected enemies!: Phaser.Physics.Arcade.Group;
  protected spawnTimer!: Phaser.Time.TimerEvent;
  protected scene!: Phaser.Scene;
  protected worldSize = 4000;
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
   * 敵の生成ロジック（プレイヤー視界外360度からスポーン）
   */
  protected spawnEnemy(): void {
    const playerPos = this.getPlayerPosition();

    // プレイヤー中心から全周囲360度の視野外（950〜1150px）にスポーン
    const spawnAngle = Phaser.Math.RND.realInRange(0, Math.PI * 2);
    const spawnDistance = Phaser.Math.Between(950, 1150);

    const spawnX = playerPos.x + Math.cos(spawnAngle) * spawnDistance;
    const spawnY = playerPos.y + Math.sin(spawnAngle) * spawnDistance;

    // ワールド境界内に収まるようクランプ
    const clampedX = Phaser.Math.Clamp(spawnX, 80, this.worldSize - 80);
    const clampedY = Phaser.Math.Clamp(spawnY, 80, this.worldSize - 80);

    const enemy = this.enemies.create(clampedX, clampedY, "enemy") as Phaser.Physics.Arcade.Image;
    if (enemy) {
      const speed = Phaser.Math.Between(this.config.speedMin, this.config.speedMax);
      enemy.setData("speed", speed);
      enemy.setData("hp", this.config.hp);
      enemy.setCollideWorldBounds(true);
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
      enemy.destroy();
      return { isDead: true, x, y };
    }

    // 被弾フラッシュ演出（赤く点滅）
    enemy.setTint(0xff5555);
    this.scene.time.delayedCall(70, () => {
      if (enemy.active) {
        enemy.clearTint();
      }
    });

    return { isDead: false, x, y };
  }

  /**
   * 毎フレームの敵追従移動・向き更新・遠距離消去判定
   */
  update(player: Phaser.Physics.Arcade.Image): void {
    const enemies = this.enemies.getChildren() as Phaser.Physics.Arcade.Image[];
    for (const enemy of enemies) {
      if (enemy.active) {
        // プレイヤーに向かって追従移動
        const speed = (enemy.getData("speed") as number) || 240;
        this.scene.physics.moveToObject(enemy, player, speed);

        // 敵の向きをプレイヤーに向ける
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
        enemy.setRotation(angle + Math.PI / 2);

        // プレイヤーから遠く離れすぎた敵（2400px以上）は消去してリソース節約
        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
        if (dist > 2400) {
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
    this.enemies?.clear(true, true);
  }
}
