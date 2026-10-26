import type Phaser from "phaser";

import type { ResistanceConfig } from "../../resistance";
import { RANGER_TEXTURE_KEYS } from "./graphics";
import { RangerEnemy } from "./RangerEnemy";

export * from "./graphics";
export * from "./RangerEnemy";
export * from "./table";

export function createRangerEnemy(
  scene: Phaser.Scene,
  x: number,
  y: number,
  resistances?: ResistanceConfig,
  texture: string = RANGER_TEXTURE_KEYS.RIGHT,
): RangerEnemy {
  return new RangerEnemy(scene, x, y, resistances, texture);
}
