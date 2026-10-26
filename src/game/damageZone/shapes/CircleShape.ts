import type Phaser from "phaser";

import type { ShapeContext } from "../types";
import type { DamageZoneShape } from "./DamageZoneShape";

export interface CircleShapeOptions {
  /** 半径拡大速度（px/s、時間経過で広がる衝撃波等に使用） */
  radiusGrowthPerSec?: number;
  /** 最大半径上限（px） */
  maxRadius?: number;
}

/**
 * 円形当たり判定形状 (CircleShape)
 * 範囲攻撃、爆発、毒沼、拡大する衝撃波などに使用
 */
export class CircleShape implements DamageZoneShape {
  public readonly type = "circle";
  private options: CircleShapeOptions;

  constructor(options: CircleShapeOptions = {}) {
    this.options = options;
  }

  /** 経過時間を考慮した現在の実効半径を取得 */
  public getEffectiveRadius(ctx: ShapeContext): number {
    let r = ctx.size;
    if (this.options.radiusGrowthPerSec) {
      r += (this.options.radiusGrowthPerSec * ctx.elapsedMs) / 1000;
    }
    if (this.options.maxRadius !== undefined) {
      r = Math.min(this.options.maxRadius, r);
    }
    return Math.max(0, r);
  }

  containsPoint(point: { x: number; y: number }, ctx: ShapeContext): boolean {
    const r = this.getEffectiveRadius(ctx);
    const dx = point.x - ctx.x;
    const dy = point.y - ctx.y;
    return dx * dx + dy * dy <= r * r;
  }

  intersectsCircle(center: { x: number; y: number }, radius: number, ctx: ShapeContext): boolean {
    const r = this.getEffectiveRadius(ctx);
    const totalR = r + radius;
    const dx = center.x - ctx.x;
    const dy = center.y - ctx.y;
    return dx * dx + dy * dy <= totalR * totalR;
  }

  renderDebug(graphics: Phaser.GameObjects.Graphics, ctx: ShapeContext, isHitting = false): void {
    const r = this.getEffectiveRadius(ctx);
    const color = isHitting ? 0xff0044 : 0x00e5ff;
    graphics.fillStyle(color, isHitting ? 0.35 : 0.18);
    graphics.fillCircle(ctx.x, ctx.y, r);
    graphics.lineStyle(2, color, 0.85);
    graphics.strokeCircle(ctx.x, ctx.y, r);
  }
}
