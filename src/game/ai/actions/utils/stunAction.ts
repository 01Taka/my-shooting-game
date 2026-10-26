import { defineAction } from "./defineAction";

/**
 * スタンアクション (stunAction)
 * 行動を中断し、耐性計算済みの実効スタン時間(pendingStunDurationMs)だけ硬直する基幹アクション
 */
export const stunAction = defineAction<{ timer: number; durationMs: number }, void>({
  initData: (enemy) => {
    enemy.stopMoving();
    enemy.setTint(0xffff66);
    return {
      timer: 0,
      durationMs: enemy.pendingStunDurationMs,
    };
  },
  update: (_enemy, _context, data, _args, delta) => {
    data.timer += delta;
    if (data.timer >= data.durationMs) return "done";
  },
  onReset: (enemy) => {
    enemy.clearTint();
  },
});
