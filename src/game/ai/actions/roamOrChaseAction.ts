import Phaser from "phaser";

import type { ActionAnimResolver } from "./utils/animation";
import { defineAction } from "./utils/defineAction";

export interface RoamOrChaseArgs {
  speed: number;
  chaseThresholdDistance: number; // この距離より遠ければ追従、近ければランダム
  minDurationMs: number;
  maxDurationMs: number;
  anim?: ActionAnimResolver;
}

interface RoamOrChaseData {
  timer: number;
  durationMs: number;
}

/**
 * 移動アクション (roamOrChaseAction)
 * 状態進入時に移動時間と進行方向を決定し、直線移動を行う
 */
export const roamOrChaseAction = defineAction<RoamOrChaseData, RoamOrChaseArgs>({
  initData: (enemy, context, args: RoamOrChaseArgs) => {
    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, context.player.x, context.player.y);
    const angle =
      dist > args.chaseThresholdDistance
        ? Phaser.Math.Angle.Between(enemy.x, enemy.y, context.player.x, context.player.y)
        : Phaser.Math.RND.realInRange(0, Math.PI * 2);

    const durationMs = Phaser.Math.Between(args.minDurationMs, args.maxDurationMs);
    enemy.moveAt(angle, args.speed);
    enemy.faceAngle?.(angle);
    enemy.applyAnim?.(args.anim, 0, durationMs);

    return {
      timer: 0,
      durationMs,
    };
  },

  update: (enemy, _context, data, args: RoamOrChaseArgs, delta) => {
    data.timer += delta;
    enemy.applyAnim?.(args.anim, data.timer, data.durationMs);
    if (data.timer >= data.durationMs) return "done";
  },

  onReset: (enemy) => {
    enemy.stopMoving();
    enemy.clearFacingAngle?.();
  },
});
