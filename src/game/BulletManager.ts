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
 * 弾丸の生成プール、発射制御、武器別挙動（3-Way、連射、ヘビー等）、武器別マナ管理、自動クリーンアップを担当
 */
export class BulletManager {
  protected config: BulletConfig;
  protected bullets!: Phaser.Physics.Arcade.Group;
  protected enemyBullets!: Phaser.Physics.Arcade.Group;
  protected lastFired = 0;
  protected currentWeapon: WeaponType = "normal";

  // 武器ごとの独立したマナ残量
  protected manaMap: Record<WeaponType, number>;

  constructor(config: BulletConfig) {
    this.config = config;
    this.manaMap = {
      spread: WEAPON_DEFINITIONS.spread.maxMana,
      normal: WEAPON_DEFINITIONS.normal.maxMana,
      heavy: WEAPON_DEFINITIONS.heavy.maxMana,
      rapid: WEAPON_DEFINITIONS.rapid.maxMana,
    };
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
   * 指定武器（または現在装備武器）の現在のマナ残量を取得
   */
  getMana(type?: WeaponType): number {
    return this.manaMap[type ?? this.currentWeapon] ?? 0;
  }

  /**
   * 指定武器（または現在装備武器）の最大マナ値を取得
   */
  getMaxMana(type?: WeaponType): number {
    return WEAPON_DEFINITIONS[type ?? this.currentWeapon]?.maxMana ?? 100;
  }

  /**
   * 指定武器（または現在装備武器）の1発あたり消費マナ量を取得
   */
  getManaCost(type?: WeaponType): number {
    return WEAPON_DEFINITIONS[type ?? this.currentWeapon]?.manaCost ?? 10;
  }

  /**
   * 指定武器（または現在装備武器）のマナバー分割数（最大値 / 1発消費量）を取得
   */
  getManaSegments(type?: WeaponType): number {
    const def = WEAPON_DEFINITIONS[type ?? this.currentWeapon];
    if (!def || def.manaCost <= 0) return 1;
    return Math.max(1, Math.round(def.maxMana / def.manaCost));
  }

  /**
   * 指定武器のマナ残量を直接設定（テスト・初期化用）
   */
  setMana(weapon: WeaponType, amount: number): void {
    const max = this.getMaxMana(weapon);
    this.manaMap[weapon] = Math.max(0, Math.min(max, amount));
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
   * 連射レートおよびマナ残量を考慮して発射可能かどうか判定
   */
  canFire(time: number): boolean {
    const weapon = this.getWeaponDefinition();
    const currentMana = this.manaMap[this.currentWeapon] ?? 0;
    const hasEnoughMana = currentMana >= weapon.manaCost;
    return time > this.lastFired && hasEnoughMana;
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
   * 指定したプレイヤー座標と幾何角度へ弾を発射（武器タイプに応じた弾道・威力・SE・マナ消費）
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
      this.manaMap[this.currentWeapon] = Math.max(
        0,
        this.manaMap[this.currentWeapon] - weapon.manaCost,
      );
      this.lastFired = currentTime + weapon.fireRateMs;
      return true;
    }

    return false;
  }

  /**
   * 毎フレームの更新処理
   * - 全武器のマナ自然回復（非選択武器も常時回復）
   * - 弾薬の生存判定（プレイヤーからの距離またはワールド境界外で破棄）
   */
  update(playerX: number, playerY: number, worldSize: number, deltaMs?: number): void {
    // 1. 全武器の常時マナ自然回復
    if (typeof deltaMs === "number" && deltaMs > 0) {
      const dtSeconds = deltaMs / 1000;
      for (const key of Object.keys(WEAPON_DEFINITIONS) as WeaponType[]) {
        const def = WEAPON_DEFINITIONS[key];
        const current = this.manaMap[key] ?? 0;
        this.manaMap[key] = Math.min(def.maxMana, current + def.manaRecoveryPerSecond * dtSeconds);
      }
    }

    // 2. 弾丸の生存距離・境界チェック
    const bullets = this.bullets?.getChildren() as Phaser.Physics.Arcade.Image[] | undefined;
    if (bullets) {
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
