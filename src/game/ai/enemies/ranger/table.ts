import Phaser from "phaser";

import { isLineOfSightBlockedByEnemies } from "../../../../utils/math";
import {
  aimedShotAction,
  loopFrames,
  lungeAttackAction,
  m,
  sequenceFrames,
  staticFrame,
  stunAction,
  timedDirectionalMoveAction,
} from "../../actions";
import type { Enemy } from "../../Enemy";
import type { GameContext, NextCallback, StateTable, Watcher } from "../../types";
import { WOLF_ANIM_KEYS } from "../bipedalWolf/graphics";
import { RANGER_ANIM_KEYS } from "./graphics";

export type RangerState = "APPROACH" | "BACKSTEP" | "LUNGE" | "FLANK" | "SHOOT" | "STUN";

// 距離の閾値
export const RANGER_CLOSE_DIST = m(1.5); // 至近距離
export const RANGER_FAR_DIST = m(11.0); // 遠距離

/**
 * 射線が遮蔽されているか判定する共通ヘルパー
 */
export function isShotBlocked(
  self: { x: number; y: number },
  context: { player: { x: number; y: number }; getEnemies?: () => unknown[] },
): boolean {
  const allEnemies = context.getEnemies?.();
  return isLineOfSightBlockedByEnemies(
    { x: self.x, y: self.y },
    { x: context.player.x, y: context.player.y },
    allEnemies,
    self,
    34, // コリドー幅（弾丸 + 敵の当たり判定）
  );
}

/**
 * レンジャーの次の行動決定コールバック (onDone 用)
 * プレイヤーとの距離および射線遮蔽を動的に判定して次のアクションを抽選する
 */
export const decideRangerNext: NextCallback<RangerState> = (
  context: GameContext,
  self: Enemy<RangerState>,
) => {
  const dist = Phaser.Math.Distance.Between(self.x, self.y, context.player.x, context.player.y);
  const shotOrFlank: RangerState = isShotBlocked(self, context) ? "FLANK" : "SHOOT";

  // ① 遠距離（一定距離以上）：移動のみ
  if (dist >= RANGER_FAR_DIST) {
    return "APPROACH";
  }

  // ② 中距離：移動 または 射撃（遮蔽時は迂回）を半々で選択
  if (dist >= RANGER_CLOSE_DIST) {
    return [
      { state: "APPROACH", weight: 1 },
      { state: shotOrFlank, weight: 1 },
    ];
  }

  // ③ 至近距離：1秒後ずさり、近接攻撃、射撃（遮蔽時は迂回）からランダム選択
  return [
    { state: "BACKSTEP", weight: 1 },
    { state: "LUNGE", weight: 1 },
    { state: shotOrFlank, weight: 1 },
  ];
};

/**
 * レンジャー（Ranger）の行動ステートテーブル
 */
export const RANGER_TABLE: StateTable<RangerState> = {
  APPROACH: {
    run: timedDirectionalMoveAction({
      mode: "approach",
      speed: m(2.8),
      durationMs: 600,
      anim: loopFrames([RANGER_ANIM_KEYS.RUN_0, RANGER_ANIM_KEYS.RUN_1], 120),
    }),
    onDone: decideRangerNext,
  },
  BACKSTEP: {
    run: timedDirectionalMoveAction({
      mode: "backstep",
      speed: m(2.8),
      durationMs: 1000,
      anim: loopFrames([RANGER_ANIM_KEYS.RUN_0, RANGER_ANIM_KEYS.RUN_1], 120),
    }),
    onDone: decideRangerNext,
  },
  LUNGE: {
    run: lungeAttackAction({
      windupDurationMs: 450,
      windupTurnRateRadPerSec: Math.PI * 0.75, // 135度/秒（フリック制限）
      lungeSpeed: m(5.2),
      lungeDurationMs: 250,
      attackRange: 85,
      damage: 30,
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
    onDone: decideRangerNext,
  },
  FLANK: {
    run: timedDirectionalMoveAction({
      mode: "flank",
      speed: m(3.0),
      durationMs: 300,
      anim: loopFrames([RANGER_ANIM_KEYS.RUN_0, RANGER_ANIM_KEYS.RUN_1], 100),
    }),
    // 迂回終了後は必ず再度射撃を試みる。遮蔽されていれば再度FLANK、射線が通ればSHOOT
    onDone: (context, self) => (isShotBlocked(self, context) ? "FLANK" : "SHOOT"),
  },
  SHOOT: {
    run: aimedShotAction({
      windupDurationMs: 400, // 前隙1秒の溜め
      bulletSpeed: 360, // 低下させた弾速
      bulletScale: 2.4, // レンジャーの大口径狙撃弾（弾サイズ拡大）
      damage: 30,
      postDelayMs: 600,
      anims: {
        windup: loopFrames([RANGER_ANIM_KEYS.AIM_0, RANGER_ANIM_KEYS.AIM_1], 100),
        shoot: staticFrame(RANGER_ANIM_KEYS.SHOOT_0),
      },
    }),
    onDone: decideRangerNext,
  },
  STUN: {
    run: stunAction({
      anim: staticFrame(RANGER_ANIM_KEYS.STUN_0),
    }),
    onDone: decideRangerNext,
  },
};

/**
 * レンジャーの常時監視（Watcher）
 * 現在はすべての意思決定が onDone のコールバックで完結しているため、外部割り込み等の追加監視用
 */
export const rangerWatcher: Watcher<RangerState> = () => {
  // onDone に意思決定を集約したため、通常時は何もしない
};
