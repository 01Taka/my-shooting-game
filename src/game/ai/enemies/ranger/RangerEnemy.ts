import type Phaser from "phaser";

import { Enemy } from "../../Enemy";
import type { ResistanceConfig } from "../../resistance";
import { ensureRangerTextures, RANGER_TEXTURE_KEYS } from "./graphics";
import { RANGER_TABLE, type RangerState, rangerWatcher } from "./table";

export class RangerEnemy extends Enemy<RangerState> {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    resistances?: ResistanceConfig,
    texture: string = RANGER_TEXTURE_KEYS.RIGHT,
  ) {
    ensureRangerTextures(scene);
    super(scene, x, y, "DECIDE", RANGER_TABLE, rangerWatcher, resistances, "STUN", texture);
    this.setData("maxHp", 60);
    this.setData("hp", 60);
    this.directionalMode = "horizontal2";
    this.direction = "right";
  }
}
