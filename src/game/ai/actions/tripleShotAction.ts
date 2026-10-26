import Phaser from "phaser";

import { defineAction } from "./utils/defineAction";

export interface TripleShotArgs {
  totalShots: number; // 例: 3発
  intervalMs: number; // 例: 250ms (最初の1発前の予兆も兼ねる)
  postDelayMs: number; // 撃ち終わりの硬直 例: 400ms
}

/**
 * 3連続射撃アクション (tripleShotAction)
 * 足を止めてプレイヤーに向き直り、一定間隔で射撃後に硬直を経て完了
 */
export const tripleShotAction = defineAction({
  initData: (enemy) => {
    enemy.stopMoving();
    return { timer: 0, shotsFired: 0, isRecovering: false };
  },

  update: (enemy, context, data, args: TripleShotArgs, delta) => {
    data.timer += delta;

    // 後隙硬直待ち
    if (data.isRecovering) {
      if (data.timer >= args.postDelayMs) return "done";
      return;
    }

    // 発射準備中：常にプレイヤーの方向をエイム
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, context.player.x, context.player.y);
    enemy.setRotation(angle + Math.PI / 2);

    // 一定間隔ごとに弾を発射
    if (data.timer >= args.intervalMs) {
      if (context.bulletManager?.shoot) {
        context.bulletManager.shoot(enemy.x, enemy.y, angle, 520, 15, enemy);
      } else if (context.bulletManager?.fire) {
        context.bulletManager.fire(enemy.x, enemy.y, angle);
      }
      data.shotsFired++;
      data.timer = 0;

      if (data.shotsFired >= args.totalShots) {
        data.isRecovering = true;
      }
    }
  },
});
