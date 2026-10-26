import type Phaser from "phaser";

import { Enemy } from "../../Enemy";
import type { ResistanceConfig } from "../../resistance";
import type { EnemyProfile } from "../../types";
import { ensureRangerTextures, RANGER_TEXTURE_KEYS } from "./graphics";
import { RANGER_TABLE, type RangerState, rangerWatcher } from "./table";

/** Ranger の共通デフォルトプロファイル（スナイパータイプ、バランス耐性） */
export const RANGER_DEFAULT_PROFILE: EnemyProfile = {
  maxHp: 70,
  resistances: {
    stunResistance: 15,
    slowResistance: 20,
  },
  directionalMode: "horizontal2",
  initialDirection: "right",
};

/** @deprecated 後方互換性用（RANGER_DEFAULT_PROFILE.resistances を推奨） */
export const RANGER_DEFAULT_RESISTANCES: ResistanceConfig = RANGER_DEFAULT_PROFILE.resistances;

export class RangerEnemy extends Enemy<RangerState> {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    profileOrResistances: EnemyProfile | ResistanceConfig = RANGER_DEFAULT_PROFILE,
    texture: string = RANGER_TEXTURE_KEYS.RIGHT,
  ) {
    ensureRangerTextures(scene);
    super(
      scene,
      x,
      y,
      "APPROACH",
      RANGER_TABLE,
      rangerWatcher,
      profileOrResistances,
      "STUN",
      texture,
    );
  }
}
