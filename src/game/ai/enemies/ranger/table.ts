import Phaser from "phaser";

import { isLineOfSightBlockedByEnemies } from "../../../../utils/math";
import {
  aimedShotAction,
  defineAction,
  loopFrames,
  lungeAttackAction,
  m,
  sequenceFrames,
  staticFrame,
  stunAction,
  timedDirectionalMoveAction,
} from "../../actions";
import type { StateTable, Watcher } from "../../types";
import { WOLF_ANIM_KEYS } from "../bipedalWolf/graphics";
import { RANGER_ANIM_KEYS } from "./graphics";

export type RangerState =
  "DECIDE" | "APPROACH" | "BACKSTEP" | "LUNGE" | "CHECK_ATTACK" | "FLANK" | "SHOOT" | "STUN";

// 距離の閾値
export const RANGER_CLOSE_DIST = m(3.5); // 至近距離 (175px)
export const RANGER_FAR_DIST = m(8.0); // 遠距離 (400px)

/** 状態遷移用の即時完了アクション */
const noopAction = defineAction({
  initData: () => {},
  update: () => "done",
});

/**
 * 射線が遮蔽されているか判定する共通ヘルパー
 */
function isShotBlocked(
  self: unknown,
  context: { player: { x: number; y: number }; getEnemies?: () => unknown[] },
): boolean {
  const selfObj = self as { x: number; y: number };
  const allEnemies = context.getEnemies?.();
  return isLineOfSightBlockedByEnemies(
    { x: selfObj.x, y: selfObj.y },
    { x: context.player.x, y: context.player.y },
    allEnemies,
    self,
    34, // コリドー幅（弾丸 + 敵の当たり判定）
  );
}

/**
 * レンジャー（Ranger）の行動ステートテーブル
 */
export const RANGER_TABLE: StateTable<RangerState> = {
  DECIDE: {
    run: noopAction(),
    onDone: "DECIDE",
  },
  APPROACH: {
    run: timedDirectionalMoveAction({
      mode: "approach",
      speed: m(4.0),
      durationMs: 1000,
      anim: loopFrames([RANGER_ANIM_KEYS.RUN_0, RANGER_ANIM_KEYS.RUN_1], 120),
    }),
    onDone: "DECIDE",
  },
  BACKSTEP: {
    run: timedDirectionalMoveAction({
      mode: "backstep",
      speed: m(3.2),
      durationMs: 1000,
      anim: loopFrames([RANGER_ANIM_KEYS.RUN_0, RANGER_ANIM_KEYS.RUN_1], 120),
    }),
    onDone: "DECIDE",
  },
  LUNGE: {
    run: lungeAttackAction({
      windupDurationMs: 450,
      windupTurnRateRadPerSec: Math.PI * 0.75, // 135度/秒（フリック制限）
      lungeSpeed: m(7.5),
      lungeDurationMs: 250,
      attackRange: 85,
      damage: 25,
      recoveryDurationMs: 400,
      cooldownMs: 1400,
      anims: {
        windup: loopFrames([RANGER_ANIM_KEYS.AIM_0, RANGER_ANIM_KEYS.AIM_1], 120),
        lunge: sequenceFrames([RANGER_ANIM_KEYS.SLASH_0, RANGER_ANIM_KEYS.SLASH_1]),
        recovery: staticFrame(RANGER_ANIM_KEYS.RUN_0),
      },
      clawEffectAnim: sequenceFrames([
        WOLF_ANIM_KEYS.SLASH_FX_0,
        WOLF_ANIM_KEYS.SLASH_FX_1,
        WOLF_ANIM_KEYS.SLASH_FX_2,
      ]),
    }),
    onDone: "DECIDE",
  },
  CHECK_ATTACK: {
    run: noopAction(),
    onDone: "CHECK_ATTACK",
  },
  FLANK: {
    run: timedDirectionalMoveAction({
      mode: "flank",
      speed: m(4.5),
      durationMs: 1000,
      anim: loopFrames([RANGER_ANIM_KEYS.RUN_0, RANGER_ANIM_KEYS.RUN_1], 100),
    }),
    // 迂回終了後は必ず再度攻撃判定（CHECK_ATTACK）へ遷移する
    onDone: "CHECK_ATTACK",
  },
  SHOOT: {
    run: aimedShotAction({
      windupDurationMs: 1000, // 前隙1秒の溜め
      bulletSpeed: 540,
      damage: 18,
      postDelayMs: 200,
      anims: {
        windup: loopFrames([RANGER_ANIM_KEYS.AIM_0, RANGER_ANIM_KEYS.AIM_1], 100),
        shoot: staticFrame(RANGER_ANIM_KEYS.SHOOT_0),
      },
    }),
    onDone: "DECIDE",
  },
  STUN: {
    run: stunAction({
      anim: staticFrame(RANGER_ANIM_KEYS.STUN_0),
    }),
    onDone: "DECIDE",
  },
};

/**
 * レンジャーの常時監視（Watcher）
 * DECIDE 状態での距離別抽選、および CHECK_ATTACK での射線遮蔽による FLANK/SHOOT 分岐を担当
 */
export const rangerWatcher: Watcher<RangerState> = (self, context) => {
  // スタン中や行動実行中は何もしない
  if (self.currentState === "STUN") return;

  // 1. 迂回終了後などの攻撃確定チェック
  if (self.currentState === "CHECK_ATTACK") {
    if (isShotBlocked(self, context)) {
      return "FLANK";
    }
    return "SHOOT";
  }

  // 2. DECIDE 状態での行動決定
  if (self.currentState === "DECIDE") {
    const dist = Phaser.Math.Distance.Between(self.x, self.y, context.player.x, context.player.y);

    // ① 遠距離（一定距離以上）：移動のみ
    if (dist >= RANGER_FAR_DIST) {
      return "APPROACH";
    }

    // ② 中距離（一定距離以内〜至近距離以外）：移動 または 前隙1秒の射撃
    if (dist >= RANGER_CLOSE_DIST) {
      const roll = Math.random();
      if (roll < 0.5) {
        return "APPROACH";
      }
      // 射撃を選択した場合、射線をチェックして遮蔽なら迂回、クリアなら射撃
      if (isShotBlocked(self, context)) {
        return "FLANK";
      }
      return "SHOOT";
    }

    // ③ 至近距離：1秒後ずさり、二足歩行狼と同じ近接攻撃、前隙1秒の射撃 の中からランダム選択
    const roll = Math.random();
    if (roll < 1 / 3) {
      return "BACKSTEP";
    }
    if (roll < 2 / 3) {
      return "LUNGE";
    }
    // 射撃を選択した場合、射線をチェックして遮蔽なら迂回、クリアなら射撃
    if (isShotBlocked(self, context)) {
      return "FLANK";
    }
    return "SHOOT";
  }
};
