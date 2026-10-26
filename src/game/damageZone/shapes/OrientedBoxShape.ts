import type Phaser from "phaser";

import type { ShapeContext } from "../types";
import type { DamageZoneShape } from "./DamageZoneShape";

export interface OrientedBoxShapeOptions {
  /** 進行方向（長さ）に対する幅の比率 */
  widthRatio?: number;
  /** 進行方向の長さの比率 */
  lengthRatio?: number;
  /** 長さの伸張速度（px/s、レーザーが伸びる演出等に使用） */
  growthLengthPerSec?: number;
}

/**
 * 回転矩形当たり判定形状 (OrientedBoxShape)
 * 突進攻撃のヒットボックス、レーザー照射ゾーン、直線状の衝撃波などに使用
 */
export class OrientedBoxShape implements DamageZoneShape {
  public readonly type = "orientedBox";
  private options: OrientedBoxShapeOptions;

  constructor(options: OrientedBoxShapeOptions = {}) {
    this.options = options;
  }

  public getDimensions(ctx: ShapeContext): { halfLength: number; halfWidth: number } {
    let length = ctx.size * (this.options.lengthRatio ?? 1.0);
    if (this.options.growthLengthPerSec) {
      length += (this.options.growthLengthPerSec * ctx.elapsedMs) / 1000;
    }
    const width = ctx.size * (this.options.widthRatio ?? 0.5);
    return {
      halfLength: Math.max(0, length / 2),
      halfWidth: Math.max(0, width / 2),
    };
  }

  containsPoint(point: { x: number; y: number }, ctx: ShapeContext): boolean {
    const { halfLength, halfWidth } = this.getDimensions(ctx);
    const { lx, ly } = this.toLocal(point.x, point.y, ctx);
    return Math.abs(lx) <= halfLength && Math.abs(ly) <= halfWidth;
  }

  intersectsCircle(center: { x: number; y: number }, radius: number, ctx: ShapeContext): boolean {
    const { halfLength, halfWidth } = this.getDimensions(ctx);
    const { lx, ly } = this.toLocal(center.x, center.y, ctx);

    // ローカル座標系における矩形（AABB）の最近接点をクランプ
    const closestX = Math.max(-halfLength, Math.min(halfLength, lx));
    const closestY = Math.max(-halfWidth, Math.min(halfWidth, ly));

    const dx = lx - closestX;
    const dy = ly - closestY;
    return dx * dx + dy * dy <= radius * radius;
  }

  renderDebug(graphics: Phaser.GameObjects.Graphics, ctx: ShapeContext, isHitting = false): void {
    const { halfLength, halfWidth } = this.getDimensions(ctx);
    const cos = Math.cos(ctx.angleRad);
    const sin = Math.sin(ctx.angleRad);

    const corners = [
      { lx: -halfLength, ly: -halfWidth },
      { lx: halfLength, ly: -halfWidth },
      { lx: halfLength, ly: halfWidth },
      { lx: -halfLength, ly: halfWidth },
    ].map((c) => ({
      x: ctx.x + c.lx * cos - c.ly * sin,
      y: ctx.y + c.lx * sin + c.ly * cos,
    }));

    const color = isHitting ? 0xff0044 : 0xaa00ff;
    graphics.fillStyle(color, isHitting ? 0.4 : 0.2);
    graphics.lineStyle(2, color, 0.9);

    graphics.beginPath();
    graphics.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      graphics.lineTo(corners[i].x, corners[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  /** グローバル座標を矩形のローカル座標系（中心原点、向きがX軸）に逆変換 */
  private toLocal(gx: number, gy: number, ctx: ShapeContext): { lx: number; ly: number } {
    const dx = gx - ctx.x;
    const dy = gy - ctx.y;
    const cos = Math.cos(-ctx.angleRad);
    const sin = Math.sin(-ctx.angleRad);
    return {
      lx: dx * cos - dy * sin,
      ly: dx * sin + dy * cos,
    };
  }
}
