import type Phaser from "phaser";

/** トラップ用テクスチャキー定義 */
export const TRAP_TEXTURE_KEYS = {
  SWAMP_0: "swamp_bubble_0",
  SWAMP_1: "swamp_bubble_1",
  MINE_ARMED: "mine_armed",
  MINE_FLASH: "mine_flash",
  MINE_EXPLOSION: "mine_explosion",
} as const;

/**
 * 毒沼（Poison Swamp）のプロシージャルテクスチャ（2コマ）を生成する
 */
export function generatePoisonSwampTextures(scene: Phaser.Scene): void {
  const size = 160;
  const half = size / 2;

  // 1. コマ0: 濃緑の有機的毒液溜まり＋小さな泡
  const g0 = scene.make.graphics({ x: 0, y: 0 });
  // 外縁の暗い酸性液
  g0.fillStyle(0x064e3b, 0.65);
  g0.fillEllipse(half, half, size * 0.9, size * 0.7);
  // 内側の粘性毒液
  g0.fillStyle(0x047857, 0.75);
  g0.fillEllipse(half - 4, half + 2, size * 0.75, size * 0.55);
  // 表層の鮮やかな有毒グリーン
  g0.fillStyle(0x10b981, 0.85);
  g0.fillEllipse(half + 6, half - 4, size * 0.5, size * 0.35);
  // 小さな気泡
  g0.fillStyle(0xa7f3d0, 0.9);
  g0.fillCircle(half - 20, half - 10, 5);
  g0.fillCircle(half + 18, half + 12, 7);
  g0.fillStyle(0xffffff, 0.8);
  g0.fillCircle(half - 22, half - 12, 1.5);
  g0.fillCircle(half + 16, half + 10, 2);

  g0.generateTexture(TRAP_TEXTURE_KEYS.SWAMP_0, size, size);
  g0.destroy();

  // 2. コマ1: 気泡が膨らみ別の箇所から泡立つ変化
  const g1 = scene.make.graphics({ x: 0, y: 0 });
  g1.fillStyle(0x064e3b, 0.65);
  g1.fillEllipse(half, half, size * 0.9, size * 0.7);
  g1.fillStyle(0x047857, 0.75);
  g1.fillEllipse(half - 4, half + 2, size * 0.75, size * 0.55);
  g1.fillStyle(0x10b981, 0.85);
  g1.fillEllipse(half + 4, half - 2, size * 0.52, size * 0.38);
  // 泡が膨張・破裂し新しく発生
  g1.fillStyle(0xa7f3d0, 0.95);
  g1.fillCircle(half - 20, half - 10, 8); // 膨張
  g1.fillCircle(half + 10, half - 15, 6); // 新規
  g1.fillCircle(half + 22, half + 14, 4); // 縮小
  g1.fillStyle(0xffffff, 0.85);
  g1.fillCircle(half - 23, half - 13, 2.5);
  g1.fillCircle(half + 8, half - 17, 1.8);

  g1.generateTexture(TRAP_TEXTURE_KEYS.SWAMP_1, size, size);
  g1.destroy();
}

/**
 * 感知地雷（Landmine）のプロシージャルテクスチャを生成する
 */
export function generateLandmineTextures(scene: Phaser.Scene): void {
  const size = 64;
  const half = size / 2;

  // 1. 待機中 (mine_armed)
  const gArmed = scene.make.graphics({ x: 0, y: 0 });
  // 外枠金属プレート
  gArmed.fillStyle(0x334155, 1);
  gArmed.fillCircle(half, half, 22);
  gArmed.lineStyle(2, 0x64748b, 1);
  gArmed.strokeCircle(half, half, 22);
  // 中央コア
  gArmed.fillStyle(0x0f172a, 1);
  gArmed.fillCircle(half, half, 13);
  // 待機LED（黄緑色）
  gArmed.fillStyle(0x84cc16, 1);
  gArmed.fillCircle(half, half, 5);
  gArmed.generateTexture(TRAP_TEXTURE_KEYS.MINE_ARMED, size, size);
  gArmed.destroy();

  // 2. 感知・警告フラッシュ (mine_flash)
  const gFlash = scene.make.graphics({ x: 0, y: 0 });
  gFlash.fillStyle(0x334155, 1);
  gFlash.fillCircle(half, half, 22);
  // 警告赤色リング
  gFlash.lineStyle(3, 0xef4444, 0.9);
  gFlash.strokeCircle(half, half, 24);
  gFlash.fillStyle(0x7f1d1d, 1);
  gFlash.fillCircle(half, half, 13);
  // 発光赤LED
  gFlash.fillStyle(0xff0055, 1);
  gFlash.fillCircle(half, half, 7);
  gFlash.fillStyle(0xffffff, 0.9);
  gFlash.fillCircle(half, half, 3);
  gFlash.generateTexture(TRAP_TEXTURE_KEYS.MINE_FLASH, size, size);
  gFlash.destroy();

  // 3. 爆発エフェクト (mine_explosion)
  const expSize = 128;
  const expHalf = expSize / 2;
  const gExp = scene.make.graphics({ x: 0, y: 0 });
  // 爆風衝撃波
  gExp.fillStyle(0xf97316, 0.7);
  gExp.fillCircle(expHalf, expHalf, 50);
  gExp.fillStyle(0xfacc15, 0.85);
  gExp.fillCircle(expHalf, expHalf, 34);
  gExp.fillStyle(0xffffff, 0.95);
  gExp.fillCircle(expHalf, expHalf, 18);
  gExp.generateTexture(TRAP_TEXTURE_KEYS.MINE_EXPLOSION, expSize, expSize);
  gExp.destroy();
}

/**
 * トラップ用テクスチャを必要に応じて初期化登録する安全関数
 */
export function ensureTrapTextures(scene: Phaser.Scene): void {
  if (scene.textures && !scene.textures.exists(TRAP_TEXTURE_KEYS.SWAMP_0)) {
    generatePoisonSwampTextures(scene);
    generateLandmineTextures(scene);
  }
}
