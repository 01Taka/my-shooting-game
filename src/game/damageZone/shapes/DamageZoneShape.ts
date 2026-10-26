import type Phaser from "phaser";

import type { ShapeContext } from "../types";

/**
 * ダメージゾーンの当たり判定形状インターフェース
 * 1つの形状につき1つのファイルとして独立して実装可能
 */
export interface DamageZoneShape {
  /** 形状の識別名 */
  readonly type: string;

  /** 指定した座標点が形状内に含まれるか判定 */
  containsPoint(point: { x: number; y: number }, ctx: ShapeContext): boolean;

  /** 指定した円（対象のバウンディング円）と形状が交差・接触しているか判定 */
  intersectsCircle(center: { x: number; y: number }, radius: number, ctx: ShapeContext): boolean;

  /** デバッグモード時のビジュアル描画 */
  renderDebug(graphics: Phaser.GameObjects.Graphics, ctx: ShapeContext, isHitting?: boolean): void;
}
