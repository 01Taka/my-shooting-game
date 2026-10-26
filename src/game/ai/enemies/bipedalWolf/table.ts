import Phaser from "phaser";

import {
  chasePlayerAction,
  loopFrames,
  lungeAttackAction,
  m,
  sequenceFrames,
  staticFrame,
  stunAction,
} from "../../actions";
import type { StateTable, Watcher } from "../../types";
import { WOLF_ANIM_KEYS } from "./graphics";

export type WolfState = "CHASE" | "LUNGE" | "STUN";

/**
 * 二足歩行狼（Bipedal Wolf）の行動テーブル
 * プレイヤーに直線的に接近し、一定距離で構えに入り、旋回速度がゆっくり制限された後、
 * 大きく一歩前進しながら前方を薙ぎ払う
 */
export const WOLF_TABLE: StateTable<WolfState> = {
  CHASE: {
    run: chasePlayerAction({
      speed: m(3.4), // 安定した追走速度
      stopDistance: m(3.0), // 3.0m まで近づいたら攻撃モーションへ
      anim: loopFrames([WOLF_ANIM_KEYS.RUN_0, WOLF_ANIM_KEYS.RUN_1], 160),
    }),
    onDone: "LUNGE",
  },
  LUNGE: {
    run: lungeAttackAction({
      windupDurationMs: 450, // 450msの溜め
      windupTurnRateRadPerSec: Math.PI * 0.75, // 135度/秒のゆっくり旋回（フリック制限）
      lungeSpeed: m(7.5), // 前進強撃（7.5m/s）
      lungeDurationMs: 250,
      attackRange: 85,
      damage: 28,
      recoveryDurationMs: 400,
      cooldownMs: 1400,
      anims: {
        windup: loopFrames([WOLF_ANIM_KEYS.WINDUP_0, WOLF_ANIM_KEYS.WINDUP_1], 120),
        lunge: sequenceFrames([WOLF_ANIM_KEYS.SLASH_0, WOLF_ANIM_KEYS.SLASH_1]),
        recovery: staticFrame(WOLF_ANIM_KEYS.RUN_0),
      },
      clawEffectAnim: sequenceFrames([
        WOLF_ANIM_KEYS.SLASH_FX_0,
        WOLF_ANIM_KEYS.SLASH_FX_1,
        WOLF_ANIM_KEYS.SLASH_FX_2,
      ]),
    }),
    onDone: "CHASE",
  },
  STUN: {
    run: stunAction({
      anim: staticFrame(WOLF_ANIM_KEYS.STUN_0),
    }),
    onDone: "CHASE",
  },
};

/**
 * 常時監視：3.0m以内に入ったら強撃を発動。クールダウン中・スタン中・攻撃中は発動しない
 */
export const wolfWatcher: Watcher<WolfState> = (self, context) => {
  if (self.currentState === "LUNGE" || self.currentState === "STUN") return;
  if (!self.isReady("lunge")) return;

  const dist = Phaser.Math.Distance.Between(self.x, self.y, context.player.x, context.player.y);
  if (dist <= m(3.0)) return "LUNGE";
};
