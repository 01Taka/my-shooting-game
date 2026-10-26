import type Phaser from "phaser";

import { Enemy } from "../../Enemy";
import type { ResistanceConfig } from "../../resistance";
import type { EnemyProfile } from "../../types";
import { ensureWolfTextures, WOLF_TEXTURE_KEYS } from "./graphics";
import { WOLF_TABLE, type WolfState, wolfWatcher } from "./table";

/** BipedalWolf の共通デフォルトプロファイル（獣人なので高いタフネス） */
export const WOLF_DEFAULT_PROFILE: EnemyProfile = {
  maxHp: 80,
  resistances: {
    stunResistance: 30,
    slowResistance: 25,
  },
  directionalMode: "horizontal2",
  initialDirection: "right",
};

/** @deprecated 後方互換性用（WOLF_DEFAULT_PROFILE.resistances を推奨） */
export const WOLF_DEFAULT_RESISTANCES: ResistanceConfig = WOLF_DEFAULT_PROFILE.resistances;

/**
 * BipedalWolf (二足歩行狼エネミー)
 */
export class BipedalWolfEnemy extends Enemy<WolfState> {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    profileOrResistances: EnemyProfile | ResistanceConfig = WOLF_DEFAULT_PROFILE,
    texture: string = WOLF_TEXTURE_KEYS.MAIN,
  ) {
    ensureWolfTextures(scene);
    super(scene, x, y, "CHASE", WOLF_TABLE, wolfWatcher, profileOrResistances, "STUN", texture);
  }
}

/**
 * BipedalWolf敵を生成するファクトリ関数
 */
export function createBipedalWolfEnemy(
  scene: Phaser.Scene,
  x: number,
  y: number,
  profileOrResistances: EnemyProfile | ResistanceConfig = WOLF_DEFAULT_PROFILE,
  texture: string = WOLF_TEXTURE_KEYS.MAIN,
): BipedalWolfEnemy {
  return new BipedalWolfEnemy(scene, x, y, profileOrResistances, texture);
}
