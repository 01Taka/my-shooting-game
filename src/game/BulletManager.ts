import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import {
  BULLET_BOUNDS_MARGIN,
  BULLET_DETUNE_RANGE,
  BULLET_MAX_DISTANCE,
  BULLET_SPAWN_OFFSET,
  DEPTH_BULLET,
  WEAPON_DEFINITIONS,
} from "../constants";
import type { BulletConfig, WeaponDefinition, WeaponType } from "./types";

/**
 * 弾薬管理マネージャー
 * 弾丸の生成プール、発射制御、武器別挙動（3-Way、連射、ヘビー等）、自動クリーンアップを担当
 */
export class BulletManager {
  protected config: BulletConfig;
  protected bullets!: Phaser.Physics.Arcade.Group;
  protected enemyBullets!: Phaser.Physics.Arcade.Group;
  protected lastFired = 0;
  protected currentWeapon: WeaponType = "normal";

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
    this.enemyBullets = scene.physics.add.group({
      defaultKey: "bullet",
      maxSize: 50,
    });
  }

  /**
   * 現在の武器タイプを取得
   */
  getWeapon(): WeaponType {
    return this.currentWeapon;
  }

  /**
   * 現在の武器定義を取得
   */
  getWeaponDefinition(): WeaponDefinition {
    return WEAPON_DEFINITIONS[this.currentWeapon];
  }

  /**
   * 武器タイプを変更
   */
  setWeapon(weapon: WeaponType): void {
    this.currentWeapon = weapon;
  }

  /**
   * 衝突判定用の Arcade Group を取得
   */
  getGroup(): Phaser.Physics.Arcade.Group {
    return this.bullets;
  }

  /**
   * 敵弾用の衝突判定グループを取得
   */
  getEnemyGroup(): Phaser.Physics.Arcade.Group {
    return this.enemyBullets;
  }

  /**
   * 敵からプレイヤー方向への射撃（AIアクション等から呼び出し可能）
   */
  shoot(
    originX: number,
    originY: number,
    angle: number,
    speed = 340,
    damage = 15,
    owner?: unknown,
    scale = 1.1,
  ): Phaser.Physics.Arcade.Image | null {
    if (!this.enemyBullets) return null;

    // 敵の前方からスポーン（発射直後の自己ヒット防止）
    const spawnOffsetX = Math.cos(angle) * 32;
    const spawnOffsetY = Math.sin(angle) * 32;

    const bullet = this.enemyBullets.get(
      originX + spawnOffsetX,
      originY + spawnOffsetY,
    ) as Phaser.Physics.Arcade.Image | null;
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setDepth(DEPTH_BULLET);
      bullet.setScale(scale);
      bullet.setTint(0xf43f5e); // 敵弾の赤色
      bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      bullet.setRotation(angle + Math.PI / 2);
      bullet.setData("damage", damage);
      bullet.setData("owner", owner);
    }
    return bullet;
  }

  /**
   * 連射レートを考慮して発射可能かどうか判定
   */
  canFire(time: number): boolean {
    return time > this.lastFired;
  }

  /**
   * 1発の弾丸をスポーンさせて物理挙動を設定
   */
  protected spawnBullet(
    playerX: number,
    playerY: number,
    angle: number,
    speed: number,
    damage: number,
    scale: number,
    tintColor: number,
    slowAmount?: number,
    stunDurationMs?: number,
  ): Phaser.Physics.Arcade.Image | null {
    const spawnOffsetX = Math.cos(angle) * BULLET_SPAWN_OFFSET;
    const spawnOffsetY = Math.sin(angle) * BULLET_SPAWN_OFFSET;

    const bullet = this.bullets.get(
      playerX + spawnOffsetX,
      playerY + spawnOffsetY,
    ) as Phaser.Physics.Arcade.Image | null;

    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setDepth(DEPTH_BULLET);
      bullet.setScale(scale);
      bullet.setTint(tintColor);
      bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      bullet.setRotation(angle + Math.PI / 2);
      bullet.setData("damage", damage);
      bullet.setData("slowAmount", slowAmount ?? 0);
      bullet.setData("stunDurationMs", stunDurationMs ?? 0);
    }

    return bullet;
  }

  /**
   * 指定したプレイヤー座標と幾何角度へ弾を発射（武器タイプに応じた弾道・威力・SE）
   */
  fire(playerX: number, playerY: number, angle: number, time?: number): boolean {
    const currentTime = time ?? performance.now();
    if (!this.canFire(currentTime)) return false;

    const weapon = this.getWeaponDefinition();
    let fired: boolean;

    if (weapon.type === "spread") {
      // 3-WAY 拡散弾
      const spreadAngle = weapon.spreadAngleRad ?? 0.24;
      const b1 = this.spawnBullet(
        playerX,
        playerY,
        angle - spreadAngle,
        weapon.speed,
        weapon.damage,
        weapon.bulletScale,
        weapon.bulletColor,
        weapon.slowAmount,
        weapon.stunDurationMs,
      );
      const b2 = this.spawnBullet(
        playerX,
        playerY,
        angle,
        weapon.speed,
        weapon.damage,
        weapon.bulletScale,
        weapon.bulletColor,
        weapon.slowAmount,
        weapon.stunDurationMs,
      );
      const b3 = this.spawnBullet(
        playerX,
        playerY,
        angle + spreadAngle,
        weapon.speed,
        weapon.damage,
        weapon.bulletScale,
        weapon.bulletColor,
        weapon.slowAmount,
        weapon.stunDurationMs,
      );
      fired = Boolean(b1 || b2 || b3);
      AudioManager.getInstance().playSE("laser", { detune: 120 });
    } else if (weapon.type === "rapid") {
      // 超高速連射
      const bullet = this.spawnBullet(
        playerX,
        playerY,
        angle,
        weapon.speed,
        weapon.damage,
        weapon.bulletScale,
        weapon.bulletColor,
        weapon.slowAmount,
        weapon.stunDurationMs,
      );
      fired = Boolean(bullet);
      AudioManager.getInstance().playSE("laser", {
        detune: Phaser.Math.Between(200, 350),
      });
    } else if (weapon.type === "heavy") {
      // 重量キャノン弾
      const bullet = this.spawnBullet(
        playerX,
        playerY,
        angle,
        weapon.speed,
        weapon.damage,
        weapon.bulletScale,
        weapon.bulletColor,
        weapon.slowAmount,
        weapon.stunDurationMs,
      );
      fired = Boolean(bullet);
      AudioManager.getInstance().playSE("laser", {
        detune: -350,
      });
    } else {
      // 標準ブラスター
      const bullet = this.spawnBullet(
        playerX,
        playerY,
        angle,
        weapon.speed,
        weapon.damage,
        weapon.bulletScale,
        weapon.bulletColor,
        weapon.slowAmount,
        weapon.stunDurationMs,
      );
      fired = Boolean(bullet);
      AudioManager.getInstance().playSE("laser", {
        detune: Phaser.Math.Between(-BULLET_DETUNE_RANGE, BULLET_DETUNE_RANGE),
      });
    }

    if (fired) {
      this.lastFired = currentTime + weapon.fireRateMs;
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
          dist > BULLET_MAX_DISTANCE ||
          bullet.x < -BULLET_BOUNDS_MARGIN ||
          bullet.x > worldSize + BULLET_BOUNDS_MARGIN ||
          bullet.y < -BULLET_BOUNDS_MARGIN ||
          bullet.y > worldSize + BULLET_BOUNDS_MARGIN
        ) {
          bullet.destroy();
        }
      }
    }

    if (this.enemyBullets && this.enemyBullets.children) {
      const enemyBullets = this.enemyBullets.getChildren() as Phaser.Physics.Arcade.Image[];
      for (const bullet of enemyBullets) {
        if (bullet.active) {
          const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, playerX, playerY);
          if (
            dist > BULLET_MAX_DISTANCE ||
            bullet.x < -BULLET_BOUNDS_MARGIN ||
            bullet.x > worldSize + BULLET_BOUNDS_MARGIN ||
            bullet.y < -BULLET_BOUNDS_MARGIN ||
            bullet.y > worldSize + BULLET_BOUNDS_MARGIN
          ) {
            bullet.destroy();
          }
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
    if (this.enemyBullets && this.enemyBullets.children) {
      this.enemyBullets.clear(true, true);
    }
  }
}
