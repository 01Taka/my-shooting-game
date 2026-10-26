import Phaser from "phaser";

/** 敵に設定する2つの耐性（0〜100） */
export interface ResistanceConfig {
  stunResistance?: number; // 0〜100（省略時 0）
  slowResistance?: number; // 0〜100（省略時 0）
}

/** スロウ耐性(0〜100)から一意に導出される特性プロファイル */
export interface SlowProfile {
  /** 凍結状態になるボーダー閾値（現行仕様では常に 100） */
  freezeThreshold: number;
  /** アイスメーターの減少速度（1秒あたりの自然減少量） */
  decayPerSec: number;
  /** アイスメーターの上限（freezeThreshold 未満なら凍結無効、以上なら超過分が凍結持続時間になる） */
  maxIceMeter: number;
}

/**
 * スタン耐性(0〜100)から実効スタン時間(ms)を計算する
 * - 耐性 0   -> 100% 適用
 * - 耐性 100 -> 0ms（スタン無効・行動キャンセルなし）
 */
export function calcEffectiveStunDuration(baseDurationMs: number, stunResistance: number): number {
  const r = Phaser.Math.Clamp(stunResistance, 0, 100);
  if (r >= 100 || baseDurationMs <= 0) return 0;
  return baseDurationMs * (1 - r / 100);
}

/**
 * スロウ耐性(0〜100)からパラメータを一意に決定する
 * ※ 具体的な係数・計算式は仮置き（バランス調整時にここだけを変更する）
 */
export function resolveSlowProfile(slowResistance: number): SlowProfile {
  const r = Phaser.Math.Clamp(slowResistance, 0, 100);
  const ratio = r / 100; // 0.0 〜 1.0

  return {
    // 凍結ボーダー：slowResistance に関わらず常に 100
    freezeThreshold: 100,

    // メーター減少速度（例: 耐性0で 毎秒15減少、耐性100で 毎秒60減少）
    decayPerSec: Phaser.Math.Linear(15, 60, ratio),

    // メーター上限（例: 耐性0で 上限150[凍結あり]、耐性80以上で 100未満[完全凍結しない]）
    maxIceMeter: Phaser.Math.Linear(150, 50, ratio),
  };
}

/**
 * アイスメーター蓄積率から timeScale (0.0 〜 1.0) を算出する
 * - 0% 以下      : 1.0 (通常速度 100%)
 * - 100% 以上    : 0.0 (凍結・完全停止)
 * - 0% 〜 100%   : 溜まるほど滑らかに減速 (1 - ratio)
 */
export function meterToTimeScale(iceMeter: number, freezeThreshold: number): number {
  if (iceMeter <= 0) return 1.0;
  if (iceMeter >= freezeThreshold) return 0.0;

  const ratio = iceMeter / freezeThreshold;
  return 1.0 - ratio;
}
