import type Phaser from "phaser";

import type { ResistanceConfig } from "../../resistance";
import type { EnemyProfile } from "../../types";
import { RANGER_TEXTURE_KEYS } from "./graphics";
import { RANGER_DEFAULT_PROFILE, RangerEnemy } from "./RangerEnemy";

export * from "./graphics";
export * from "./RangerEnemy";
export * from "./table";

export function createRangerEnemy(
  scene: Phaser.Scene,
  x: number,
  y: number,
  profileOrResistances: EnemyProfile | ResistanceConfig = RANGER_DEFAULT_PROFILE,
  texture: string = RANGER_TEXTURE_KEYS.RIGHT,
): RangerEnemy {
  return new RangerEnemy(scene, x, y, profileOrResistances, texture);
}
