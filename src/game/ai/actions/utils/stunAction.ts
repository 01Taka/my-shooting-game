import type { ActionAnimResolver } from "./animation";
import { defineAction } from "./defineAction";

export interface StunActionArgs {
  anim?: ActionAnimResolver;
}

/**
 * スタンアクション (stunAction)
 * 行動を中断し、耐性計算済みの実効スタン時間(pendingStunDurationMs)だけ硬直する基幹アクション
 */
export const stunAction = defineAction<
  { timer: number; durationMs: number },
  StunActionArgs | undefined
>({
  initData: (enemy, _context, args?: StunActionArgs) => {
    enemy.stopMoving();
    enemy.applyAnim?.(args?.anim, 0, enemy.pendingStunDurationMs);
    return {
      timer: 0,
      durationMs: enemy.pendingStunDurationMs,
    };
  },
  update: (enemy, _context, data, args?: StunActionArgs, delta = 0) => {
    data.timer += delta;
    enemy.applyAnim?.(args?.anim, data.timer, data.durationMs);
    if (data.timer >= data.durationMs) return "done";
  },
});
