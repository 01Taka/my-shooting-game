import Phaser from "phaser";

import {
  calcEffectiveStunDuration,
  meterToTimeScale,
  type ResistanceConfig,
  resolveSlowProfile,
  type SlowProfile,
} from "./resistance";

/**
 * 敵基盤クラス (EnemyBase)
 * 物理・時間倍率(timeScale)・クールダウン・行動阻害デバフ（スタン・スロウ／凍結）を管理する基底クラス
 */
export abstract class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  // --- 耐性ステータス (0〜100) ---
  public readonly stunResistance: number;
  public readonly slowResistance: number;
  public readonly slowProfile: SlowProfile;

  // --- デバフ実行時状態 ---
  /** アイスメーター (0 〜 slowProfile.maxIceMeter) */
  public iceMeter = 0;
  /** 現在の行動速度倍率 (1.0 = 通常, 0 < t < 1 = スロウ, 0.0 = 凍結) */
  public timeScale = 1;
  /** 直近の applyStun で確定した実効スタン時間(ms) */
  public pendingStunDurationMs = 0;

  private baseVelocity = new Phaser.Math.Vector2();
  private cooldowns: Record<string, number> = {};

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string = "enemy",
    resistances: ResistanceConfig = {},
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.stunResistance = Phaser.Math.Clamp(resistances.stunResistance ?? 0, 0, 100);
    this.slowResistance = Phaser.Math.Clamp(resistances.slowResistance ?? 0, 0, 100);
    this.slowProfile = resolveSlowProfile(this.slowResistance);
  }

  // =====================================================================
  // 1. 行動阻害デバフ付与API（被弾判定などから呼ぶ）
  // =====================================================================

  /**
   * スタンを付与する。
   * - 耐性100の場合は実効時間が 0 となり、行動キャンセル（状態遷移）自体が発生しない。
   */
  public applyStun(baseDurationMs: number): void {
    const duration = calcEffectiveStunDuration(baseDurationMs, this.stunResistance);
    if (duration <= 0) return; // 耐性100：キャンセルも発生させない

    this.pendingStunDurationMs = duration;
    this.onStunTriggered();
  }

  /**
   * スロウ（アイスメーター）を蓄積させる。
   */
  public applySlow(amount: number): void {
    if (amount <= 0) return;

    this.iceMeter = Math.min(this.slowProfile.maxIceMeter, this.iceMeter + amount);
    this.timeScale = meterToTimeScale(this.iceMeter, this.slowProfile.freezeThreshold);
  }

  /** サブクラス（Enemy<K> や Boss）で「スタン状態への強制遷移」を実装するフック */
  protected abstract onStunTriggered(): void;

  // =====================================================================
  // 2. アクション向け移動・クールダウンAPI
  // =====================================================================

  public moveAt(angle: number, speed: number): void {
    if (this.scene && this.scene.physics) {
      this.scene.physics.velocityFromRotation(angle, speed, this.baseVelocity);
    } else {
      this.baseVelocity.setTo(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  public stopMoving(): void {
    this.baseVelocity.set(0, 0);
  }

  public startCooldown(key: string, ms: number): void {
    this.cooldowns[key] = ms;
  }

  public isReady(key: string): boolean {
    return (this.cooldowns[key] ?? 0) <= 0;
  }

  // =====================================================================
  // 3. 毎フレームの更新処理
  // =====================================================================

  /** 毎フレーム冒頭に呼ぶ。timeScale 適用後の delta (ミリ秒) を返す */
  protected tickBase(delta: number): number {
    this.updateIceMeter(delta);
    const scaledDelta = delta * this.timeScale;

    // クールダウンは scaledDelta で進行（凍結中は進まない、スロウ中は遅く進む）
    for (const key in this.cooldowns) {
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - scaledDelta);
    }

    // アニメーション速度も timeScale に完全同期（anims が存在する場合）
    if (this.anims) {
      this.anims.timeScale = this.timeScale;
    }
    return scaledDelta;
  }

  /** 基準速度 × timeScale を物理ボディへ反映する */
  protected applyVelocity(): void {
    if (this.body) {
      this.body.setVelocity(
        this.baseVelocity.x * this.timeScale,
        this.baseVelocity.y * this.timeScale,
      );
    }
  }

  /** アイスメーターの自然減衰と timeScale の更新（減衰自体は実時間 delta で進む） */
  private updateIceMeter(delta: number): void {
    if (this.iceMeter > 0) {
      const decay = (this.slowProfile.decayPerSec * delta) / 1000;
      this.iceMeter = Math.max(0, this.iceMeter - decay);
    }
    this.timeScale = meterToTimeScale(this.iceMeter, this.slowProfile.freezeThreshold);
  }
}
