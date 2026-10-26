import Phaser from "phaser";

import { type ActionAnimResolver } from "./utils/animation";
import { defineAction } from "./utils/defineAction";

export interface AimedShotArgs {
  /** 前隙（エイム・溜め）時間（ms、デフォルト 1000ms） */
  windupDurationMs?: number;
  /** 弾速（px/s、デフォルト 520） */
  bulletSpeed?: number;
  /** 弾ダメージ（デフォルト 15） */
  damage?: number;
  /** 発射後の後隙時間（ms、デフォルト 200ms） */
  postDelayMs?: number;
  anims?: {
    windup?: ActionAnimResolver;
    shoot?: ActionAnimResolver;
  };
}

interface AimedShotData {
  timer: number;
  hasShot: boolean;
  aimAngle: number;
}

/**
 * 前隙1秒の単発狙撃アクション
 * 溜め時間中は移動を停止してプレイヤーを狙い、満了時に敵弾を発射。わずかな後隙を経て完了する。
 */
export const aimedShotAction = defineAction<AimedShotData, AimedShotArgs>({
  initData: (enemy, context, args: AimedShotArgs) => {
    enemy.stopMoving();
    const aimAngle = Phaser.Math.Angle.Between(
      enemy.x,
      enemy.y,
      context.player.x,
      context.player.y,
    );
    enemy.faceAngle?.(aimAngle);
    const windup = args.windupDurationMs ?? 1000;
    enemy.applyAnim?.(args.anims?.windup, 0, windup);

    return {
      timer: 0,
      hasShot: false,
      aimAngle,
    };
  },

  update: (enemy, context, data, args: AimedShotArgs, delta) => {
    const windup = args.windupDurationMs ?? 1000;
    const postDelay = args.postDelayMs ?? 200;
    data.timer += delta;

    if (!data.hasShot) {
      // 溜め中はプレイヤーを追従してエイム
      data.aimAngle = Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        context.player.x,
        context.player.y,
      );
      enemy.faceAngle?.(data.aimAngle);
      enemy.applyAnim?.(args.anims?.windup, data.timer, windup);

      if (data.timer >= windup) {
        // 前隙満了 -> 弾丸発射
        data.hasShot = true;
        const speed = args.bulletSpeed ?? 520;
        const damage = args.damage ?? 15;

        if (context.bulletManager?.shoot) {
          context.bulletManager.shoot(enemy.x, enemy.y, data.aimAngle, speed, damage, enemy);
        } else if (context.bulletManager?.fire) {
          context.bulletManager.fire(enemy.x, enemy.y, data.aimAngle);
        }

        enemy.applyAnim?.(args.anims?.shoot, 0, postDelay);
      }
      return;
    }

    // 発射後の後隙
    const postTime = data.timer - windup;
    enemy.applyAnim?.(args.anims?.shoot, postTime, postDelay);

    if (postTime >= postDelay) {
      return "done";
    }
  },

  onReset: (enemy) => {
    enemy.stopMoving();
  },
});
