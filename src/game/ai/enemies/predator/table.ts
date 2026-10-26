import Phaser from "phaser";

import {
  dashClawAttackAction,
  m,
  roamOrChaseAction,
  stunAction,
  tripleShotAction,
} from "../../actions";
import type { StateTable, Watcher } from "../../types";

export type PredatorState = "MOVE" | "TRIPLE_SHOT" | "DASH_CLAW" | "STUN";

/**
 * 行動テーブル：Predator専用の行動定義
 */
export const PREDATOR_TABLE: StateTable<PredatorState> = {
  MOVE: {
    run: roamOrChaseAction({
      speed: m(2),
      chaseThresholdDistance: m(7),
      minDurationMs: 1000,
      maxDurationMs: 3000,
    }),
    // 確率分岐：75% で 3連射、25% でもう一度移動（weight 省略 = 1）
    onDone: [
      { state: "TRIPLE_SHOT", weight: 3 },
      { state: "MOVE", weight: 1 },
    ],
  },
  TRIPLE_SHOT: {
    run: tripleShotAction({ totalShots: 3, intervalMs: 250, postDelayMs: 400 }),
    onDone: "MOVE",
  },
  DASH_CLAW: {
    run: dashClawAttackAction({
      dashSpeed: m(7.6),
      dashDurationMs: 300,
      recoveryDurationMs: 450,
      cooldownMs: 1500,
    }),
    onDone: "MOVE",
  },
  STUN: {
    run: stunAction(), // 時間は enemy.pendingStunDurationMs から動的に取得
    onDone: "MOVE",
  },
};

/**
 * 常時監視：至近距離に入ったら爪攻撃。クールダウン中・スタン中・爪攻撃中は発動しない
 */
export const predatorWatcher: Watcher<PredatorState> = (self, context) => {
  if (self.currentState === "DASH_CLAW" || self.currentState === "STUN") return;
  if (!self.isReady("claw")) return;

  const dist = Phaser.Math.Distance.Between(self.x, self.y, context.player.x, context.player.y);
  if (dist <= m(4)) return "DASH_CLAW";
};
