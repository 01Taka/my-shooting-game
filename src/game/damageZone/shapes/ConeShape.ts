import type Phaser from "phaser";

import type { ShapeContext } from "../types";
import type { DamageZoneShape } from "./DamageZoneShape";

export interface ConeShapeOptions {
  /** 扇形の開き角（ラジアン） */
  arcAngleRad?: number;
  /** 時間経過による開き角の拡大速度（rad/s） */
  angleGrowthPerSec?: number;
}

/**
 * 扇形・コーン当たり判定形状 (ConeShape)
 * 近接爪攻撃、剣の薙ぎ払い、前方火炎放射・ブレス攻撃などに使用
 */
export class ConeShape implements DamageZoneShape {
  public readonly type = "cone";
  private options: ConeShapeOptions;

  constructor(options: ConeShapeOptions = {}) {
    this.options = options;
  }

  /** 現在の開き角（ラジアン）を取得 */
  public getEffectiveArc(ctx: ShapeContext): number {
    let arc = this.options.arcAngleRad ?? (75 * Math.PI) / 180;
    if (this.options.angleGrowthPerSec) {
      arc += (this.options.angleGrowthPerSec * ctx.elapsedMs) / 1000;
    }
    return Math.min(Math.PI * 2, Math.max(0.01, arc));
  }

  containsPoint(point: { x: number; y: number }, ctx: ShapeContext): boolean {
    const dx = point.x - ctx.x;
    const dy = point.y - ctx.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > ctx.size * ctx.size) return false;

    const angleToTarget = Math.atan2(dy, dx);
    const diff = this.normalizeAngle(angleToTarget - ctx.angleRad);
    const halfArc = this.getEffectiveArc(ctx) / 2;
    return Math.abs(diff) <= halfArc;
  }

  intersectsCircle(center: { x: number; y: number }, radius: number, ctx: ShapeContext): boolean {
    const dx = center.x - ctx.x;
    const dy = center.y - ctx.y;
    const distSq = dx * dx + dy * dy;

    // 1. 対象円の中心が扇形内に含まれる場合
    const angleToCenter = Math.atan2(dy, dx);
    const diff = this.normalizeAngle(angleToCenter - ctx.angleRad);
    const halfArc = this.getEffectiveArc(ctx) / 2;

    if (Math.abs(diff) <= halfArc && distSq <= (ctx.size + radius) * (ctx.size + radius)) {
      return true;
    }

    // 2. 扇形の円弧境界または2本のエッジ線分と交差するか判定
    const rSq = radius * radius;
    // 扇形の中心と円が重なっている場合
    if (distSq <= rSq) return true;

    // 左右のエッジ線分に対する最近接点との距離
    const leftAngle = ctx.angleRad - halfArc;
    const rightAngle = ctx.angleRad + halfArc;

    if (this.distSqToSegment(center, ctx.x, ctx.y, leftAngle, ctx.size) <= rSq) {
      return true;
    }
    if (this.distSqToSegment(center, ctx.x, ctx.y, rightAngle, ctx.size) <= rSq) {
      return true;
    }

    return false;
  }

  renderDebug(graphics: Phaser.GameObjects.Graphics, ctx: ShapeContext, isHitting = false): void {
    const arc = this.getEffectiveArc(ctx);
    const halfArc = arc / 2;
    const startAngle = ctx.angleRad - halfArc;
    const endAngle = ctx.angleRad + halfArc;

    const color = isHitting ? 0xff0044 : 0xff7700;
    graphics.fillStyle(color, isHitting ? 0.4 : 0.2);
    graphics.slice(ctx.x, ctx.y, ctx.size, startAngle, endAngle, false);
    graphics.fillPath();

    graphics.lineStyle(2, color, 0.9);
    graphics.slice(ctx.x, ctx.y, ctx.size, startAngle, endAngle, false);
    graphics.strokePath();
  }

  private normalizeAngle(rad: number): number {
    rad = (rad + Math.PI) % (Math.PI * 2);
    if (rad < 0) rad += Math.PI * 2;
    return rad - Math.PI;
  }

  /** (ox, oy) から angle 方向に長さ len 伸びる線分と point との最短距離の二乗 */
  private distSqToSegment(
    p: { x: number; y: number },
    ox: number,
    oy: number,
    angle: number,
    len: number,
  ): number {
    const ex = ox + Math.cos(angle) * len;
    const ey = oy + Math.sin(angle) * len;
    const segX = ex - ox;
    const segY = ey - oy;
    const segLenSq = segX * segX + segY * segY;

    if (segLenSq === 0) {
      const ddx = p.x - ox;
      const ddy = p.y - oy;
      return ddx * ddx + ddy * ddy;
    }

    // 線分への正射影パラメータ t (0 <= t <= 1 にクランプ)
    const t = Math.max(0, Math.min(1, ((p.x - ox) * segX + (p.y - oy) * segY) / segLenSq));
    const projX = ox + t * segX;
    const projY = oy + t * segY;
    const ddx = p.x - projX;
    const ddy = p.y - projY;
    return ddx * ddx + ddy * ddy;
  }
}
