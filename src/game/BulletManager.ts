import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import type { BulletConfig } from "./types";

/**
 * 弾薬管理マネージャー
 * 弾丸の生成プール、発射制御、生存可能距離・画面外の自動クリーンアップを担当
 */
export class BulletManager {
  protected config: BulletConfig;
  protected bullets!: Phaser.Physics.Arcade.Group;
  protected lastFired = 0;

  constructor(config: BulletConfig) {
    this.config = config;
  }

  /**
   * 弾丸グループの初期化
   */
  init(scene: Phaser.Scene): void {
    this.bullets = scene.physics.add.group({
      defaultKey: "bullet",
      maxSize: this.config.maxBullets,
    });
  }

  /**
   * 衝突判定用の Arcade Group を取得
   */
  getGroup(): Phaser.Physics.Arcade.Group {
    return this.bullets;
  }

  /**
   * 連射レートを考慮して発射可能かどうか判定
   */
  canFire(time: number): boolean {
    return time > this.lastFired;
  }

  /**
   * 指定したプレイヤー座標と幾何角度へ弾を発射
   */
  fire(playerX: number, playerY: number, angle: number, time?: number): boolean {
    const currentTime = time ?? performance.now();
    if (!this.canFire(currentTime)) return false;

    const spawnOffsetX = Math.cos(angle) * 32;
    const spawnOffsetY = Math.sin(angle) * 32;

    const bullet = this.bullets.get(
      playerX + spawnOffsetX,
      playerY + spawnOffsetY,
    ) as Phaser.Physics.Arcade.Image | null;

    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setVelocity(Math.cos(angle) * this.config.speed, Math.sin(angle) * this.config.speed);
      bullet.setRotation(angle + Math.PI / 2);
      bullet.setData("damage", this.config.damage);

      AudioManager.getInstance().playSE("laser", {
        detune: Phaser.Math.Between(-30, 30),
      });

      this.lastFired = currentTime + this.config.fireRateMs;
      return true;
    }

    return false;
  }

  /**
   * 毎フレームの弾薬生存判定（プレイヤーからの距離またはワールド境界外で破棄）
   */
  update(playerX: number, playerY: number, worldSize: number): void {
    const bullets = this.bullets.getChildren() as Phaser.Physics.Arcade.Image[];
    for (const bullet of bullets) {
      if (bullet.active) {
        const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, playerX, playerY);
        if (
          dist > 1400 ||
          bullet.x < -40 ||
          bullet.x > worldSize + 40 ||
          bullet.y < -40 ||
          bullet.y > worldSize + 40
        ) {
          bullet.destroy();
        }
      }
    }
  }

  /**
   * リソース解放
   */
  destroy(): void {
    if (this.bullets && this.bullets.children) {
      this.bullets.clear(true, true);
    }
  }
}
