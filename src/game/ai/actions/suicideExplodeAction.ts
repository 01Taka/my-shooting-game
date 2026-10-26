import { CircleShape } from "../../damageZone/shapes/CircleShape";
import type { ActionAnimResolver } from "./utils/animation";
import { defineAction } from "./utils/defineAction";

export interface SuicideExplodeArgs {
  /** 爆発モーション（膨張・赤点滅）の溜め時間（ms） */
  windupDurationMs: number;
  /** 爆発の半径（px） */
  explosionRadius: number;
  /** 爆発ダメージ */
  damage: number;
  /** ノックバック力（省略時 260） */
  knockback?: number;
  /** スタン付与時間（ms、省略時 0） */
  stunDurationMs?: number;
  anims?: {
    windup?: ActionAnimResolver;
  };
  /** 爆発時に生成するエフェクトのフレーム配列（攻撃範囲と同じ半径を可視化） */
  explosionEffectFrames?: readonly string[];
}

interface SuicideExplodeData {
  timer: number;
}

/**
 * 自爆特攻アクション (suicideExplodeAction)
 * 移動を停止して自爆モーション（膨張・発光）に入り、一定時間経過後に攻撃範囲と同じ爆発エフェクトと判定を発生させて消滅する
 */
export const suicideExplodeAction = defineAction<SuicideExplodeData, SuicideExplodeArgs>({
  initData: (enemy, _context, args: SuicideExplodeArgs) => {
    enemy.stopMoving();
    enemy.applyAnim?.(args.anims?.windup, 0, args.windupDurationMs);
    return { timer: 0 };
  },

  update: (enemy, context, data, args: SuicideExplodeArgs, delta) => {
    data.timer += delta;
    enemy.applyAnim?.(args.anims?.windup, data.timer, args.windupDurationMs);

    if (data.timer >= args.windupDurationMs) {
      // 爆発ダメージ判定ゾーンの生成（円形、単発大ダメージ）
      if (context.damageZoneManager) {
        context.damageZoneManager.createZone({
          shape: new CircleShape(),
          faction: "enemy",
          x: enemy.x,
          y: enemy.y,
          size: args.explosionRadius,
          durationMs: 180,
          damageIntervalMs: 0,
          maxHitsPerTarget: 1,
          effect: {
            damage: args.damage,
            knockback: args.knockback ?? 260,
            stunDurationMs: args.stunDurationMs,
          },
        });
      }

      // 攻撃範囲（半径 args.explosionRadius）と同じ範囲の爆発エフェクトを発生
      if (context.scene) {
        const textures =
          context.scene.textures ??
          (context.scene as { sys?: { textures?: { exists: (key: string) => boolean } } }).sys
            ?.textures;
        const frames = args.explosionEffectFrames;
        const initialKey = frames?.[0] ?? "bomber_explosion_fx_0";
        if (textures?.exists(initialKey)) {
          const expSprite = context.scene.add.image(enemy.x, enemy.y, initialKey);
          expSprite.setDepth(15); // オブジェクトより前面
          const animDuration = 240;

          if (frames && frames.length > 1) {
            let frameIdx = 0;
            const timer = context.scene.time.addEvent({
              delay: animDuration / frames.length,
              repeat: frames.length - 1,
              callback: () => {
                frameIdx++;
                if (frameIdx < frames.length && expSprite.active) {
                  expSprite.setTexture(frames[frameIdx]);
                }
              },
            });
            expSprite.once("destroy", () => timer.remove());
          }

          if (context.scene.tweens) {
            context.scene.tweens.add({
              targets: expSprite,
              alpha: 0,
              duration: animDuration,
              onComplete: () => {
                expSprite.destroy();
              },
            });
          }
        }
      }

      // 敵自身は自爆によりHP 0となり消滅
      enemy.setData("hp", 0);
      enemy.destroy();
      return "done";
    }
  },

  onReset: (enemy) => {
    enemy.stopMoving();
  },
});
