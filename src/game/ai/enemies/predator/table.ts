import Phaser from "phaser";

import {
  dashClawAttackAction,
  loopFrames,
  m,
  roamOrChaseAction,
  sequenceFrames,
  staticFrame,
  stunAction,
  tripleShotAction,
} from "../../actions";
import type { StateTable, Watcher } from "../../types";
import { PREDATOR_ANIM_KEYS } from "./graphics";

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
      anim: loopFrames([PREDATOR_ANIM_KEYS.MOVE_0, PREDATOR_ANIM_KEYS.MOVE_1], 180),
    }),
    // 確率分岐：3連射 または もう一度移動
    onDone: [
      { state: "TRIPLE_SHOT", weight: 3 },
      { state: "MOVE", weight: 1 },
    ],
  },
  TRIPLE_SHOT: {
    run: tripleShotAction({
      totalShots: 3,
      intervalMs: 250,
      postDelayMs: 400,
      anims: {
        windup: sequenceFrames([PREDATOR_ANIM_KEYS.SHOOT_0, PREDATOR_ANIM_KEYS.SHOOT_1]),
        recovery: staticFrame(PREDATOR_ANIM_KEYS.MOVE_0),
      },
    }),
    onDone: "MOVE",
  },
  DASH_CLAW: {
    run: dashClawAttackAction({
      dashSpeed: m(5.2),
      dashDurationMs: 300,
      recoveryDurationMs: 450,
      cooldownMs: 1500,
      anims: {
        dash: loopFrames([PREDATOR_ANIM_KEYS.DASH_0, PREDATOR_ANIM_KEYS.DASH_1], 80),
        slash: sequenceFrames([PREDATOR_ANIM_KEYS.SLASH_0, PREDATOR_ANIM_KEYS.SLASH_1]),
      },
      clawEffectAnim: sequenceFrames([
        PREDATOR_ANIM_KEYS.CLAW_FX_0,
        PREDATOR_ANIM_KEYS.CLAW_FX_1,
        PREDATOR_ANIM_KEYS.CLAW_FX_2,
      ]),
    }),
    onDone: "MOVE",
  },
  STUN: {
    run: stunAction({
      anim: staticFrame(PREDATOR_ANIM_KEYS.STUN_0),
    }),
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
