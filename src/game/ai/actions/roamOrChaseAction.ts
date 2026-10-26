import Phaser from "phaser";

import { defineAction } from "./utils/defineAction";

export interface RoamOrChaseArgs {
  speed: number;
  chaseThresholdDistance: number; // この距離より遠ければ追従、近ければランダム
  minDurationMs: number;
  maxDurationMs: number;
}

/**
 * 移動アクション (roamOrChaseAction)
 * 状態進入時に移動時間と進行方向を決定し、直線移動を行う
 */
export const roamOrChaseAction = defineAction({
  initData: (enemy, context, args: RoamOrChaseArgs) => {
    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, context.player.x, context.player.y);
    const angle =
      dist > args.chaseThresholdDistance
        ? Phaser.Math.Angle.Between(enemy.x, enemy.y, context.player.x, context.player.y)
        : Phaser.Math.RND.realInRange(0, Math.PI * 2);

    enemy.moveAt(angle, args.speed);
    enemy.setRotation(angle + Math.PI / 2);

    return {
      timer: 0,
      durationMs: Phaser.Math.Between(args.minDurationMs, args.maxDurationMs),
    };
  },

  update: (_enemy, _context, data, _args, delta) => {
    data.timer += delta;
    if (data.timer >= data.durationMs) return "done";
  },

  onReset: (enemy) => {
    enemy.stopMoving();
  },
});
