import Phaser from "phaser";

import { ConeShape } from "../../damageZone/shapes/ConeShape";
import { defineAction } from "./utils/defineAction";

export interface DashClawArgs {
  dashSpeed: number; // 突進速度
  dashDurationMs: number; // 突進時間
  recoveryDurationMs: number; // 爪を振り抜いた後の硬直
  cooldownMs: number; // 次に発動できるまでの時間
}

/**
 * ダッシュ爪攻撃アクション (dashClawAttackAction)
 * 急接近して攻撃を行い、後隙を経て完了。終了時にクールダウンを開始
 */
export const dashClawAttackAction = defineAction({
  initData: () => ({
    timer: 0,
    step: "DASH" as "DASH" | "RECOVERY",
  }),

  update: (enemy, context, data, args: DashClawArgs, delta) => {
    data.timer += delta;

    // ステップ1: プレイヤーに向かって高速突進
    if (data.step === "DASH") {
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, context.player.x, context.player.y);
      enemy.moveAt(angle, args.dashSpeed);
      enemy.setRotation(angle + Math.PI / 2);

      // 突進時間終了：爪で攻撃
      if (data.timer >= args.dashDurationMs) {
        enemy.stopMoving();
        enemy.setTint(0xff0055); // 攻撃演出の赤フラッシュ

        // ダメージゾーンの生成（扇形爪攻撃判定）
        if (context.damageZoneManager) {
          context.damageZoneManager.createZone({
            shape: new ConeShape({ arcAngleRad: (80 * Math.PI) / 180 }),
            faction: "enemy",
            x: enemy.x,
            y: enemy.y,
            angleRad: angle,
            size: 90,
            durationMs: 220,
            damageIntervalMs: 0,
            maxHitsPerTarget: 1,
            effect: {
              damage: 20,
              stunDurationMs: 400,
            },
          });
        }

        data.step = "RECOVERY";
        data.timer = 0;
      }
      return;
    }

    // ステップ2: 爪攻撃後の硬直
    if (data.timer >= args.recoveryDurationMs) return "done";
  },

  onReset: (enemy, _data, args: DashClawArgs) => {
    enemy.clearTint();
    enemy.stopMoving();
    enemy.startCooldown("claw", args.cooldownMs);
  },
});
