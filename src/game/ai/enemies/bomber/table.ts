import Phaser from "phaser";

import {
  chasePlayerAction,
  loopFrames,
  m,
  staticFrame,
  stunAction,
  suicideExplodeAction,
} from "../../actions";
import type { StateTable, Watcher } from "../../types";
import { BOMBER_ANIM_KEYS } from "./graphics";

export type BomberState = "CHASE" | "EXPLODE" | "STUN";

/** 自爆開始距離（至近距離まで肉薄してカウントダウン開始） */
export const BOMBER_TRIGGER_DIST = m(1.3); // 65px
/** 接近停止距離 */
export const BOMBER_STOP_DIST = m(1.1); // 55px
/** 自爆キャンセル距離（クリーパー仕様：一定距離離れたら自爆解除） */
export const BOMBER_CANCEL_DIST = m(2.4); // 120px

/**
 * 自爆特攻型（Bomber）の行動テーブル
 * プレイヤーに肉薄接近し、停止して爆発予兆に入り、時間経過で大爆発を起こす。離れられるとキャンセルして追尾再開。
 */
export const BOMBER_TABLE: StateTable<BomberState> = {
  CHASE: {
    run: chasePlayerAction({
      speed: m(4.8), // 俊敏にプレイヤーへ接近
      stopDistance: BOMBER_STOP_DIST, // 肉薄するまで停止しない
      anim: loopFrames([BOMBER_ANIM_KEYS.MOVE_0, BOMBER_ANIM_KEYS.MOVE_1], 120),
    }),
    onDone: "EXPLODE",
  },
  EXPLODE: {
    run: suicideExplodeAction({
      windupDurationMs: 700, // 700msの予兆（プレイヤーが回避できる猶予）
      explosionRadius: 110,
      damage: 40,
      knockback: 300,
      anims: {
        windup: loopFrames([BOMBER_ANIM_KEYS.WINDUP_0, BOMBER_ANIM_KEYS.WINDUP_1], 80),
      },
      explosionEffectFrames: [
        BOMBER_ANIM_KEYS.EXPLOSION_FX_0,
        BOMBER_ANIM_KEYS.EXPLOSION_FX_1,
        BOMBER_ANIM_KEYS.EXPLOSION_FX_2,
      ],
    }),
    onDone: "CHASE", // 爆発で自身がdestroyされるが、スタン中断時のフォールバック
  },
  STUN: {
    run: stunAction({
      anim: staticFrame(BOMBER_ANIM_KEYS.MOVE_0),
    }),
    onDone: "CHASE",
  },
};

/**
 * 常時監視：
 * 1. 接近して至近距離に入ったら自爆予兆（EXPLODE）に突入
 * 2. 自爆予兆中にプレイヤーが離れたら自爆をキャンセル（通常自爆のみ。死亡強制自爆中はキャンセル不可）
 */
export const bomberWatcher: Watcher<BomberState> = (self, context) => {
  if (self.currentState === "STUN") return;

  const dist = Phaser.Math.Distance.Between(self.x, self.y, context.player.x, context.player.y);

  // 1. 自爆モード中のキャンセル判定（クリーパー仕様）
  if (self.currentState === "EXPLODE") {
    const isDying = (self.getData("isDying") as boolean) || false;
    // 死亡による強制自爆でなければ、一定距離離れるとキャンセルして追尾に戻る
    if (!isDying && dist >= BOMBER_CANCEL_DIST) {
      return "CHASE";
    }
    return;
  }

  // 2. 追従中に至近距離に入ったら自爆開始
  if (self.currentState === "CHASE") {
    if (dist <= BOMBER_TRIGGER_DIST) {
      return "EXPLODE";
    }
  }
};
