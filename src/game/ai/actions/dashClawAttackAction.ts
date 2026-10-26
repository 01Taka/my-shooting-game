import Phaser from "phaser";

import type { DamageZone } from "../../damageZone/DamageZone";
import { ConeShape } from "../../damageZone/shapes/ConeShape";
import { type ActionAnimResolver, ActionEffectSprite } from "./utils/animation";
import { defineAction } from "./utils/defineAction";

export interface DashClawArgs {
  dashSpeed: number; // 突進速度
  dashDurationMs: number; // 突進時間
  recoveryDurationMs: number; // 爪を振り抜いた後の硬直
  cooldownMs: number; // 次に発動できるまでの時間
  anims?: {
    dash?: ActionAnimResolver;
    slash?: ActionAnimResolver;
    recovery?: ActionAnimResolver;
  };
  clawEffectAnim?: ActionAnimResolver;
}

interface DashClawData {
  timer: number;
  step: "DASH" | "RECOVERY";
  dashAngle: number;
  activeZone?: DamageZone;
  effectSprite?: ActionEffectSprite;
}

/**
 * ダッシュ爪攻撃アクション (dashClawAttackAction)
 * 急接近して攻撃を行い、後隙を経て完了。終了時にクールダウンを開始
 */
export const dashClawAttackAction = defineAction<DashClawData, DashClawArgs>({
  initData: (enemy, _context, args: DashClawArgs) => {
    enemy.applyAnim?.(args.anims?.dash, 0, args.dashDurationMs);
    return {
      timer: 0,
      step: "DASH",
      dashAngle: 0,
    };
  },

  update: (enemy, context, data, args: DashClawArgs, delta) => {
    data.timer += delta;

    // ステップ1: プレイヤーに向かって高速突進
    if (data.step === "DASH") {
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, context.player.x, context.player.y);
      data.dashAngle = angle;
      enemy.moveAt(angle, args.dashSpeed);
      enemy.faceAngle?.(angle);
      enemy.applyAnim?.(args.anims?.dash, data.timer, args.dashDurationMs);

      // 突進時間終了：爪で攻撃
      if (data.timer >= args.dashDurationMs) {
        enemy.stopMoving();
        enemy.faceAngle?.(angle);

        // ダメージゾーンの生成（扇形爪攻撃判定、オーナーと同期）
        const zoneDurationMs = 220;
        if (context.damageZoneManager) {
          data.activeZone = context.damageZoneManager.createZone({
            shape: new ConeShape({ arcAngleRad: (80 * Math.PI) / 180 }),
            faction: "enemy",
            owner: enemy,
            attachTo: () => ({ x: enemy.x, y: enemy.y, angleRad: data.dashAngle }),
            size: 90,
            durationMs: zoneDurationMs,
            damageIntervalMs: 0,
            maxHitsPerTarget: 1,
            effect: {
              damage: 20,
              stunDurationMs: 400,
            },
          });
        }

        // 斬撃エフェクトスプライトの生成
        if (args.clawEffectAnim && context.scene) {
          const initialKey = args.clawEffectAnim({ elapsedMs: 0, durationMs: zoneDurationMs });
          data.effectSprite = new ActionEffectSprite(
            context.scene,
            enemy.x,
            enemy.y,
            initialKey,
            args.clawEffectAnim,
          );
          data.effectSprite.update(enemy.x, enemy.y, data.dashAngle, 0, zoneDurationMs);
        }

        data.step = "RECOVERY";
        data.timer = 0;
        enemy.applyAnim?.(args.anims?.slash ?? args.anims?.recovery, 0, args.recoveryDurationMs);
      }
      return;
    }

    // ステップ2: 爪攻撃後の硬直
    enemy.faceAngle?.(data.dashAngle);
    enemy.applyAnim?.(
      args.anims?.slash ?? args.anims?.recovery,
      data.timer,
      args.recoveryDurationMs,
    );

    // エフェクトスプライトのフレーム進行同期
    if (data.effectSprite) {
      if (data.activeZone && data.activeZone.isActive) {
        data.effectSprite.update(
          enemy.x,
          enemy.y,
          data.dashAngle,
          data.activeZone.elapsedMs,
          data.activeZone.durationMs,
        );
      } else {
        data.effectSprite.destroy();
        data.effectSprite = undefined;
      }
    }

    if (data.timer >= args.recoveryDurationMs) return "done";
  },

  onReset: (enemy, data, args: DashClawArgs) => {
    // 中断または完了時にゾーンとエフェクトを確実に破棄
    data.activeZone?.destroy();
    data.activeZone = undefined;
    data.effectSprite?.destroy();
    data.effectSprite = undefined;

    enemy.clearFacingAngle?.();
    enemy.stopMoving();
    enemy.startCooldown("claw", args.cooldownMs);
  },
});
