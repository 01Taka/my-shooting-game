import type Phaser from "phaser";

import { Enemy } from "../../Enemy";
import type { ResistanceConfig } from "../../resistance";
import { BOMBER_TEXTURE_KEYS, ensureBomberTextures } from "./graphics";
import { BOMBER_TABLE, type BomberState, bomberWatcher } from "./table";

/** Bomber のデフォルト耐性値（爆発物なのでスタン耐性は低め） */
export const BOMBER_DEFAULT_RESISTANCES: ResistanceConfig = {
  stunResistance: 10,
  slowResistance: 10,
};

/**
 * Bomber (自爆特攻型エネミー)
 */
export class BomberEnemy extends Enemy<BomberState> {
  private isDying = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    resistances: ResistanceConfig = BOMBER_DEFAULT_RESISTANCES,
    texture: string = BOMBER_TEXTURE_KEYS.MAIN,
  ) {
    ensureBomberTextures(scene);
    super(scene, x, y, "CHASE", BOMBER_TABLE, bomberWatcher, resistances, "STUN", texture);
  }

  /**
   * 撃破（HP <= 0）時に強制自爆シーケンスをトリガーする
   * 通常と同じ自爆猶予（700msの膨張・点滅予兆）を経て周囲に爆発ダメージを与えて消滅する
   */
  public override handleDeath(): boolean {
    if (this.isDying) {
      return true;
    }
    this.isDying = true;
    this.setData("isDying", true);

    // 物理移動を停止し、再度の接触判定を無効化
    this.stopMoving();
    if (this.body) {
      this.body.checkCollision.none = true;
    }

    // 強制的に自爆予兆（EXPLODE）へ遷移
    this.requestState("EXPLODE");
    return true; // 即時 destroy をスキップし、自爆アクションの完了時に destroy させる
  }
}

/**
 * Bomber敵を生成するファクトリ関数
 */
export function createBomberEnemy(
  scene: Phaser.Scene,
  x: number,
  y: number,
  resistances: ResistanceConfig = BOMBER_DEFAULT_RESISTANCES,
  texture: string = BOMBER_TEXTURE_KEYS.MAIN,
): BomberEnemy {
  return new BomberEnemy(scene, x, y, resistances, texture);
}
