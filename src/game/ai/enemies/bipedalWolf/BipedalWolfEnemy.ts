import type Phaser from "phaser";

import { Enemy } from "../../Enemy";
import type { ResistanceConfig } from "../../resistance";
import { ensureWolfTextures, WOLF_TEXTURE_KEYS } from "./graphics";
import { WOLF_TABLE, type WolfState, wolfWatcher } from "./table";

/** BipedalWolf のデフォルト耐性値（獣人なので高いタフネス） */
export const WOLF_DEFAULT_RESISTANCES: ResistanceConfig = {
  stunResistance: 30,
  slowResistance: 25,
};

/**
 * BipedalWolf (二足歩行狼エネミー)
 */
export class BipedalWolfEnemy extends Enemy<WolfState> {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    resistances: ResistanceConfig = WOLF_DEFAULT_RESISTANCES,
    texture: string = WOLF_TEXTURE_KEYS.MAIN,
  ) {
    ensureWolfTextures(scene);
    super(scene, x, y, "CHASE", WOLF_TABLE, wolfWatcher, resistances, "STUN", texture);
  }
}

/**
 * BipedalWolf敵を生成するファクトリ関数
 */
export function createBipedalWolfEnemy(
  scene: Phaser.Scene,
  x: number,
  y: number,
  resistances: ResistanceConfig = WOLF_DEFAULT_RESISTANCES,
  texture: string = WOLF_TEXTURE_KEYS.MAIN,
): BipedalWolfEnemy {
  return new BipedalWolfEnemy(scene, x, y, resistances, texture);
}
