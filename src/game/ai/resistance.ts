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
 * - 耐性 0   -> スタン時間全額適用
 * - 耐性 100 -> スタン無効（行動キャンセルなし）
 */
export function calcEffectiveStunDuration(baseDurationMs: number, stunResistance: number): number {
  const r = Phaser.Math.Clamp(stunResistance, 0, 100);
  if (r >= 100 || baseDurationMs <= 0) return 0;
  return baseDurationMs * (1 - r / 100);
}

/**
 * スロウ耐性(0〜100)からパラメータを一意に決定する
 */
export function resolveSlowProfile(slowResistance: number): SlowProfile {
  const r = Phaser.Math.Clamp(slowResistance, 0, 100);
  const ratio = r / 100; // 0.0 〜 1.0

  return {
    // 凍結ボーダー：slowResistance に関わらず常に 100
    freezeThreshold: 100,

    // メーター減少速度
    decayPerSec: Phaser.Math.Linear(15, 60, ratio),

    // メーター上限
    maxIceMeter: Phaser.Math.Linear(150, 50, ratio),
  };
}

/**
 * アイスメーター蓄積率から timeScale (0.0 〜 1.0) を算出する
 * - 未蓄積    : 通常速度 (1.0)
 * - 閾値到達時: 凍結・完全停止 (0.0)
 * - 蓄積中    : 溜まるほど滑らかに減速 (1 - ratio)
 */
export function meterToTimeScale(iceMeter: number, freezeThreshold: number): number {
  if (iceMeter <= 0) return 1.0;
  if (iceMeter >= freezeThreshold) return 0.0;

  const ratio = iceMeter / freezeThreshold;
  return 1.0 - ratio;
}
