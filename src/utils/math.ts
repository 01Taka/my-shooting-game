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

/**
 * 角度 currentAngle から targetAngle へ、最大 maxDeltaRad (ラジアン) だけ最短回転する
 *
 * @param currentAngle 現在の角度（ラジアン）
 * @param targetAngle 目標の角度（ラジアン）
 * @param maxDeltaRad このフレームで回転できる最大量（ラジアン）
 */
export function rotateTowardsAngle(
  currentAngle: number,
  targetAngle: number,
  maxDeltaRad: number,
): number {
  if (maxDeltaRad <= 0) return currentAngle;
  // 角度差を -PI 〜 PI に正規化
  const diff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
  if (Math.abs(diff) <= maxDeltaRad) {
    return targetAngle;
  }
  return currentAngle + Math.sign(diff) * maxDeltaRad;
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * 点 P が線分 AB から一定幅（corridorRadius）の円筒/カプセル領域内にあるかを判定する
 *
 * @param p 判定対象の障害物（他の敵）の位置
 * @param a 始点（射撃元の敵）
 * @param b 終点（標的のプレイヤー）
 * @param corridorRadius 射線の遮蔽幅（弾のサイズ＋障害物の当たり判定）
 * @param marginFromEnds 始点・終点から除外するマージン距離（自身やプレイヤーの足元除外）
 */
export function isPointBlockingLineSegment(
  p: Point2D,
  a: Point2D,
  b: Point2D,
  corridorRadius: number,
  marginFromEnds = 15,
): boolean {
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const abLenSq = abX * abX + abY * abY;
  if (abLenSq <= 0.0001) return false;

  const abLen = Math.sqrt(abLenSq);
  // 線分 AB 方向の単位ベクトル
  const ux = abX / abLen;
  const uy = abY / abLen;

  // A から P へのベクトル
  const apX = p.x - a.x;
  const apY = p.y - a.y;

  // 線分上への射影長 t
  const t = apX * ux + apY * uy;

  // 始点と終点の近傍（marginFromEnds）は除外
  if (t < marginFromEnds || t > abLen - marginFromEnds) {
    return false;
  }

  // 線分への垂直距離の2乗
  const qx = a.x + t * ux;
  const qy = a.y + t * uy;
  const distSq = (p.x - qx) * (p.x - qx) + (p.y - qy) * (p.y - qy);

  return distSq <= corridorRadius * corridorRadius;
}

/**
 * 射線（from -> to）上に、自身以外の生存中の他の敵が存在するかどうか判定する
 *
 * @param from 射撃元の位置（自身）
 * @param to 標的の位置（プレイヤー）
 * @param enemies シーン内の全敵リスト
 * @param self 自身（判定除外対象）
 * @param corridorRadius 遮蔽とみなすコリドー幅
 */
export function isLineOfSightBlockedByEnemies(
  from: Point2D,
  to: Point2D,
  enemies: unknown[] | undefined,
  self: unknown,
  corridorRadius = 32,
): boolean {
  if (!enemies || enemies.length === 0) return false;

  for (const obj of enemies) {
    if (!obj || obj === self) continue;
    const enemy = obj as { active?: boolean; x?: number; y?: number };
    // 生存中（active）かつ座標を持つ敵のみを対象とする
    if (enemy.active === false || typeof enemy.x !== "number" || typeof enemy.y !== "number") {
      continue;
    }

    if (isPointBlockingLineSegment({ x: enemy.x, y: enemy.y }, from, to, corridorRadius)) {
      return true;
    }
  }

  return false;
}
