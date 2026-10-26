import { loopFrames } from "../../ai/actions/utils/animation";
import { TRAP_TEXTURE_KEYS } from "../textures";
import type { TrapConfig } from "../types";

export interface PoisonSwampOptions {
  size?: number;
  durationMs?: number;
  damageIntervalMs?: number;
  damage?: number;
  slowAmount?: number;
  faction?: "player" | "enemy" | "neutral";
}

/**
 * 毒沼トラップ（Poison Swamp）の構成設定を生成するヘルパー関数
 * - 継続エリア型 (Hazard)
 * - 範囲内に入った対象にスロウ（アイスメーター蓄積）と持続tickダメージを与える
 */
export function createPoisonSwampConfig(
  x: number,
  y: number,
  options: PoisonSwampOptions = {},
): TrapConfig {
  const size = options.size ?? 70;
  const damage = options.damage ?? 4;
  const slowAmount = options.slowAmount ?? 25;

  return {
    type: "hazard",
    faction: options.faction ?? "enemy",
    x,
    y,
    size,
    durationMs: options.durationMs ?? 6000,
    damageIntervalMs: options.damageIntervalMs ?? 400,
    initialTexture: TRAP_TEXTURE_KEYS.SWAMP_0,
    anims: {
      active: loopFrames([TRAP_TEXTURE_KEYS.SWAMP_0, TRAP_TEXTURE_KEYS.SWAMP_1], 300),
    },
    hazardEffect: {
      damage,
      slowAmount,
    },
  };
}
