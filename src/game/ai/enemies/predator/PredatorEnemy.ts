import type Phaser from "phaser";

import { Enemy } from "../../Enemy";
import type { ResistanceConfig } from "../../resistance";
import { ensurePredatorTextures, PREDATOR_TEXTURE_KEYS } from "./graphics";
import { PREDATOR_TABLE, type PredatorState, predatorWatcher } from "./table";

/** Predator のデフォルト耐性値 */
export const PREDATOR_DEFAULT_RESISTANCES: ResistanceConfig = {
  stunResistance: 20,
  slowResistance: 15,
};

/**
 * Predator (近接急襲＆3連射ハイブリッド敵)
 */
export class PredatorEnemy extends Enemy<PredatorState> {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    resistances: ResistanceConfig = PREDATOR_DEFAULT_RESISTANCES,
    texture: string = PREDATOR_TEXTURE_KEYS.MAIN,
  ) {
    // 自身のグラフィック（テクスチャ）が未登録なら自動生成
    ensurePredatorTextures(scene);
    super(scene, x, y, "MOVE", PREDATOR_TABLE, predatorWatcher, resistances, "STUN", texture);
  }
}

/**
 * Predator敵を生成するファクトリ関数
 */
export function createPredatorEnemy(
  scene: Phaser.Scene,
  x: number,
  y: number,
  resistances: ResistanceConfig = PREDATOR_DEFAULT_RESISTANCES,
  texture: string = PREDATOR_TEXTURE_KEYS.MAIN,
): PredatorEnemy {
  return new PredatorEnemy(scene, x, y, resistances, texture);
}
