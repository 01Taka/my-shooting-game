import { staticFrame } from "../../ai/actions/utils/animation";
import { TRAP_TEXTURE_KEYS } from "../textures";
import type { TrapConfig } from "../types";

export interface LandmineOptions {
  size?: number;
  armingDurationMs?: number;
  triggerDelayMs?: number;
  damage?: number;
  stunDurationMs?: number;
  knockback?: number;
  faction?: "player" | "enemy" | "neutral";
}

/**
 * 感知地雷トラップ（Landmine）の構成設定を生成するヘルパー関数
 * - 感知起爆型 (Mine)
 * - 設置後アーム状態になり、対象が踏むと警告フラッシュの後、大ダメージ爆発を起こして消滅する
 */
export function createLandmineConfig(
  x: number,
  y: number,
  options: LandmineOptions = {},
): TrapConfig {
  const size = options.size ?? 25;
  const damage = options.damage ?? 35;

  return {
    type: "mine",
    faction: options.faction ?? "enemy",
    x,
    y,
    size,
    durationMs: -1, // 起爆するまで無期限に待機
    armingDurationMs: options.armingDurationMs ?? 400,
    triggerDelayMs: options.triggerDelayMs ?? 200,
    explosionDurationMs: 250,
    initialTexture: TRAP_TEXTURE_KEYS.MINE_ARMED,
    anims: {
      active: staticFrame(TRAP_TEXTURE_KEYS.MINE_ARMED),
      triggered: staticFrame(TRAP_TEXTURE_KEYS.MINE_FLASH),
      exploding: staticFrame(TRAP_TEXTURE_KEYS.MINE_EXPLOSION),
    },
    explosionEffect: {
      damage,
      stunDurationMs: options.stunDurationMs ?? 300,
      knockback: options.knockback ?? 200,
    },
  };
}
