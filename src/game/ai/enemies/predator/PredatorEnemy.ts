import type Phaser from "phaser";

import { Enemy } from "../../Enemy";
import type { ResistanceConfig } from "../../resistance";
import type { EnemyProfile } from "../../types";
import { ensurePredatorTextures, PREDATOR_TEXTURE_KEYS } from "./graphics";
import { PREDATOR_TABLE, type PredatorState, predatorWatcher } from "./table";

/** Predator の共通デフォルトプロファイル（近接急襲＆3連射ハイブリッド敵） */
export const PREDATOR_DEFAULT_PROFILE: EnemyProfile = {
  maxHp: 50,
  resistances: {
    stunResistance: 20,
    slowResistance: 15,
  },
  directionalMode: "horizontal2",
  initialDirection: "right",
};

/** @deprecated 後方互換性用（PREDATOR_DEFAULT_PROFILE.resistances を推奨） */
export const PREDATOR_DEFAULT_RESISTANCES: ResistanceConfig = PREDATOR_DEFAULT_PROFILE.resistances;

/**
 * Predator (近接急襲＆3連射ハイブリッド敵)
 */
export class PredatorEnemy extends Enemy<PredatorState> {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    profileOrResistances: EnemyProfile | ResistanceConfig = PREDATOR_DEFAULT_PROFILE,
    texture: string = PREDATOR_TEXTURE_KEYS.MAIN,
  ) {
    // 自身のグラフィック（テクスチャ）が未登録なら自動生成
    ensurePredatorTextures(scene);
    super(
      scene,
      x,
      y,
      "MOVE",
      PREDATOR_TABLE,
      predatorWatcher,
      profileOrResistances,
      "STUN",
      texture,
    );
  }
}

/**
 * Predator敵を生成するファクトリ関数
 */
export function createPredatorEnemy(
  scene: Phaser.Scene,
  x: number,
  y: number,
  profileOrResistances: EnemyProfile | ResistanceConfig = PREDATOR_DEFAULT_PROFILE,
  texture: string = PREDATOR_TEXTURE_KEYS.MAIN,
): PredatorEnemy {
  return new PredatorEnemy(scene, x, y, profileOrResistances, texture);
}
