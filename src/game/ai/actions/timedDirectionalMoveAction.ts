import Phaser from "phaser";

import { type ActionAnimResolver } from "./utils/animation";
import { defineAction } from "./utils/defineAction";

export type DirectionalMoveMode = "approach" | "backstep" | "flank";

export interface TimedDirectionalMoveArgs {
  /** 移動モード: "approach"（接近） | "backstep"（後退） | "flank"（左右迂回） */
  mode: DirectionalMoveMode;
  /** 移動速度（px/s） */
  speed: number;
  /** 移動時間（ms、デフォルト 1000ms） */
  durationMs?: number;
  /** 迂回時の左右指定（省略時は 50% 確率でランダムに 1 (時計回り90°) または -1 (反時計回り90°)） */
  flankSide?: 1 | -1;
  anim?: ActionAnimResolver;
}

interface TimedDirectionalMoveData {
  timer: number;
  moveAngle: number;
}

/**
 * 時間指定の方向性移動アクション（接近・後退・左右迂回）
 * 指定された持続時間（デフォルト1000ms）の間等速で移動し、完了時に "done" を返す
 */
export const timedDirectionalMoveAction = defineAction<
  TimedDirectionalMoveData,
  TimedDirectionalMoveArgs
>({
  initData: (enemy, context, args: TimedDirectionalMoveArgs) => {
    const duration = args.durationMs ?? 1000;
    const baseAngle = Phaser.Math.Angle.Between(
      enemy.x,
      enemy.y,
      context.player.x,
      context.player.y,
    );

    let moveAngle = baseAngle;
    if (args.mode === "backstep") {
      // プレイヤーから離れる方向
      moveAngle = baseAngle + Math.PI;
    } else if (args.mode === "flank") {
      // 左右ランダム（または指定側）に 90度 直交移動
      const side = args.flankSide ?? (Math.random() < 0.5 ? 1 : -1);
      moveAngle = baseAngle + side * (Math.PI / 2);
    }

    enemy.moveAt(moveAngle, args.speed);
    // 顔の向きは移動方向（またはプレイヤー方向）を向く
    enemy.faceAngle?.(baseAngle);
    enemy.applyAnim?.(args.anim, 0, duration);

    return {
      timer: 0,
      moveAngle,
    };
  },

  update: (enemy, context, data, args: TimedDirectionalMoveArgs, delta) => {
    const duration = args.durationMs ?? 1000;
    data.timer += delta;

    // approach モードの場合は進行中もプレイヤーを追従して舵を切る
    if (args.mode === "approach") {
      data.moveAngle = Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        context.player.x,
        context.player.y,
      );
      enemy.moveAt(data.moveAngle, args.speed);
    }

    const baseAngle = Phaser.Math.Angle.Between(
      enemy.x,
      enemy.y,
      context.player.x,
      context.player.y,
    );
    enemy.faceAngle?.(baseAngle);
    enemy.applyAnim?.(args.anim, data.timer, duration);

    if (data.timer >= duration) {
      enemy.stopMoving();
      return "done";
    }
  },

  onReset: (enemy) => {
    enemy.stopMoving();
  },
});
