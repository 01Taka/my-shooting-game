import Phaser from "phaser";

import { rotateTowardsAngle } from "../../../utils/math";
import type { DamageZone } from "../../damageZone/DamageZone";
import { ConeShape } from "../../damageZone/shapes/ConeShape";
import { type ActionAnimResolver, ActionEffectSprite } from "./utils/animation";
import { defineAction } from "./utils/defineAction";

export interface LungeAttackArgs {
  /** 予兆モーション（構え・溜め）時間（ms） */
  windupDurationMs: number;
  /** モーション中の最大旋回速度（rad/s） */
  windupTurnRateRadPerSec?: number;
  /** 大きく一歩前進する突進速度（px/s） */
  lungeSpeed: number;
  /** 一歩前進の持続時間（ms） */
  lungeDurationMs: number;
  /** 前方攻撃判定のリーチ（px） */
  attackRange?: number;
  /** 踏み込み完了後の斬撃判定・エフェクト持続時間（ms） */
  slashDurationMs?: number;
  /** 攻撃ダメージ */
  damage: number;
  /** 攻撃後の硬直時間（ms） */
  recoveryDurationMs: number;
  /** 次の攻撃までのクールダウン（ms） */
  cooldownMs: number;
  anims?: {
    windup?: ActionAnimResolver;
    lunge?: ActionAnimResolver;
    slash?: ActionAnimResolver;
    recovery?: ActionAnimResolver;
  };
  clawEffectAnim?: ActionAnimResolver;
}

interface LungeAttackData {
  timer: number;
  step: "WINDUP" | "LUNGE" | "SLASH" | "RECOVERY";
  currentAngle: number;
  activeZone?: DamageZone;
  effectSprite?: ActionEffectSprite;
}

/**
 * 前進強撃アクション (lungeAttackAction)
 * 1. 予兆モーションに入るとプレイヤー方向への旋回速度が制限（ゆっくり追従）
 * 2. 大きく一歩前進（踏み込み完了までは攻撃判定を持たない）
 * 3. 踏み込み完了の瞬間に前方扇形の攻撃判定と同時に斬撃エフェクトを発生
 * 4. 硬直を経て完了する
 */
export const lungeAttackAction = defineAction<LungeAttackData, LungeAttackArgs>({
  initData: (enemy, context, args: LungeAttackArgs) => {
    enemy.stopMoving();
    const initialAngle = Phaser.Math.Angle.Between(
      enemy.x,
      enemy.y,
      context.player.x,
      context.player.y,
    );
    enemy.faceAngle?.(initialAngle);
    enemy.applyAnim?.(args.anims?.windup, 0, args.windupDurationMs);

    return {
      timer: 0,
      step: "WINDUP",
      currentAngle: initialAngle,
    };
  },

  update: (enemy, context, data, args: LungeAttackArgs, delta) => {
    data.timer += delta;

    // ステップ1: 予兆（構え） - 旋回速度がゆっくりに制限され、フリックが制限される
    if (data.step === "WINDUP") {
      const targetAngle = Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        context.player.x,
        context.player.y,
      );
      const turnRate = args.windupTurnRateRadPerSec ?? Math.PI * 0.75;
      const maxDelta = (turnRate * delta) / 1000;
      data.currentAngle = rotateTowardsAngle(data.currentAngle, targetAngle, maxDelta);

      enemy.faceAngle?.(data.currentAngle);
      enemy.applyAnim?.(args.anims?.windup, data.timer, args.windupDurationMs);

      if (data.timer >= args.windupDurationMs) {
        // 予兆完了 -> 大きく一歩前進（LUNGE開始：まだ攻撃判定は持たない）
        data.step = "LUNGE";
        data.timer = 0;
        enemy.moveAt(data.currentAngle, args.lungeSpeed);
        enemy.faceAngle?.(data.currentAngle);
        enemy.applyAnim?.(args.anims?.lunge, 0, args.lungeDurationMs);
      }
      return;
    }

    // ステップ2: 一歩前進（突進・踏み込み移動中。攻撃判定なし）
    if (data.step === "LUNGE") {
      enemy.faceAngle?.(data.currentAngle);
      enemy.applyAnim?.(args.anims?.lunge, data.timer, args.lungeDurationMs);

      if (data.timer >= args.lungeDurationMs) {
        // 踏み込み完了 -> 移動停止し、その瞬間に攻撃判定と斬撃エフェクトを発生
        enemy.stopMoving();
        data.step = "SLASH";
        data.timer = 0;

        const slashDuration = args.slashDurationMs ?? 200;
        const attackRange = args.attackRange ?? 85;

        if (context.damageZoneManager) {
          data.activeZone = context.damageZoneManager.createZone({
            shape: new ConeShape({ arcAngleRad: (70 * Math.PI) / 180 }),
            faction: "enemy",
            owner: enemy,
            attachTo: () => ({ x: enemy.x, y: enemy.y, angleRad: data.currentAngle }),
            size: attackRange,
            durationMs: slashDuration,
            damageIntervalMs: 0,
            maxHitsPerTarget: 1,
            effect: {
              damage: args.damage,
            },
          });
        }

        // 踏み込み完了と同時にその場へ斬撃エフェクトを発生
        if (args.clawEffectAnim && context.scene) {
          const initialKey = args.clawEffectAnim({
            elapsedMs: 0,
            durationMs: slashDuration,
          });
          data.effectSprite = new ActionEffectSprite(
            context.scene,
            enemy.x,
            enemy.y,
            initialKey,
            args.clawEffectAnim,
            { x: 0, y: 0.5 }, // 扇形の根本（敵位置）を原点とする
          );
          data.effectSprite.update(enemy.x, enemy.y, data.currentAngle, 0, slashDuration);
        }

        enemy.applyAnim?.(args.anims?.slash ?? args.anims?.lunge, 0, slashDuration);
      }
      return;
    }

    // ステップ3: 踏み込み直後の斬撃発生中（エフェクト＆攻撃判定持続中）
    if (data.step === "SLASH") {
      const slashDuration = args.slashDurationMs ?? 200;
      enemy.faceAngle?.(data.currentAngle);
      enemy.applyAnim?.(args.anims?.slash ?? args.anims?.lunge, data.timer, slashDuration);

      if (data.effectSprite) {
        if (data.activeZone && data.activeZone.isActive) {
          data.effectSprite.update(
            enemy.x,
            enemy.y,
            data.currentAngle,
            data.activeZone.elapsedMs,
            slashDuration,
          );
        } else {
          data.effectSprite.destroy();
          data.effectSprite = undefined;
        }
      }

      if (data.timer >= slashDuration) {
        if (data.effectSprite) {
          data.effectSprite.destroy();
          data.effectSprite = undefined;
        }
        data.step = "RECOVERY";
        data.timer = 0;
        enemy.applyAnim?.(args.anims?.recovery, 0, args.recoveryDurationMs);
      }
      return;
    }

    // ステップ4: 攻撃後の硬直
    enemy.faceAngle?.(data.currentAngle);
    enemy.applyAnim?.(args.anims?.recovery, data.timer, args.recoveryDurationMs);

    if (data.effectSprite) {
      data.effectSprite.destroy();
      data.effectSprite = undefined;
    }

    if (data.timer >= args.recoveryDurationMs) return "done";
  },

  onReset: (enemy, data, args: LungeAttackArgs) => {
    data.activeZone?.destroy();
    data.activeZone = undefined;
    data.effectSprite?.destroy();
    data.effectSprite = undefined;

    enemy.stopMoving();
    enemy.clearFacingAngle?.();
    enemy.startCooldown("lunge", args.cooldownMs);
  },
});
