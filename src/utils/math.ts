import Phaser from "phaser";

export interface SmoothDampResult {
  value: number;
  velocity: number;
}

/**
 * 臨界減衰スプリング（SmoothDamp）計算
 * 目標値に向かって滑らかに加速・減速し、オーバーシュートなしで収束する。
 *
 * @param current 現在値
 * @param target 目標値
 * @param currentVelocity 現在の速度
 * @param smoothTime 到達目標時間（秒単位）
 * @param maxSpeed 最大速度上限（単位/秒）
 * @param deltaTime 経過時間（秒単位）
 */
export function smoothDamp(
  current: number,
  target: number,
  currentVelocity: number,
  smoothTime: number,
  maxSpeed: number,
  deltaTime: number,
): SmoothDampResult {
  const safeSmoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / safeSmoothTime;

  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  let change = current - target;
  const originalTo = target;

  // 最大速度制限による変化量のクランプ
  const maxChange = maxSpeed * safeSmoothTime;
  change = Phaser.Math.Clamp(change, -maxChange, maxChange);
  const clampedTarget = current - change;

  const temp = (currentVelocity + omega * change) * deltaTime;
  let newVelocity = (currentVelocity - omega * temp) * exp;
  let output = clampedTarget + (change + temp) * exp;

  // オーバーシュート（目標を行き過ぎての揺れ戻し）を防止
  if (originalTo - current > 0.0 === output > originalTo) {
    output = originalTo;
    newVelocity = (output - originalTo) / deltaTime;
  }

  return { value: output, velocity: newVelocity };
}
