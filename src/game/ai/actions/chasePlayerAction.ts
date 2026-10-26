import Phaser from "phaser";

import type { ActionAnimResolver } from "./utils/animation";
import { defineAction } from "./utils/defineAction";

export interface ChasePlayerArgs {
  speed: number;
  /** この距離（px）以下まで近づいたら完了して次の状態へ遷移する */
  stopDistance: number;
  /** 最大追従時間（ms）。超過した場合は一旦完了とする（省略時は無制限） */
  maxDurationMs?: number;
  anim?: ActionAnimResolver;
}

interface ChasePlayerData {
  timer: number;
}

/**
 * プレイヤー追従移動アクション (chasePlayerAction)
 * 毎フレームプレイヤーの現在位置へ向かって直進し、一定距離まで接近したら完了する
 */
export const chasePlayerAction = defineAction<ChasePlayerData, ChasePlayerArgs>({
  initData: (enemy, context, args: ChasePlayerArgs) => {
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, context.player.x, context.player.y);
    enemy.moveAt(angle, args.speed);
    enemy.faceAngle?.(angle);
    enemy.applyAnim?.(args.anim, 0, args.maxDurationMs);

    return { timer: 0 };
  },

  update: (enemy, context, data, args: ChasePlayerArgs, delta) => {
    data.timer += delta;

    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, context.player.x, context.player.y);
    if (dist <= args.stopDistance) {
      enemy.stopMoving();
      return "done";
    }

    if (args.maxDurationMs !== undefined && data.timer >= args.maxDurationMs) {
      enemy.stopMoving();
      return "done";
    }

    // 毎フレームプレイヤーに向かって舵を取り直す
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, context.player.x, context.player.y);
    enemy.moveAt(angle, args.speed);
    enemy.faceAngle?.(angle);
    enemy.applyAnim?.(args.anim, data.timer, args.maxDurationMs);
  },

  onReset: (enemy) => {
    enemy.stopMoving();
    enemy.clearFacingAngle?.();
  },
});
