import type Phaser from "phaser";

import { ENEMY_TEXTURE_SIZE } from "../../../../constants";

export const BOMBER_TEXTURE_KEYS = {
  MAIN: "bomber",
  RIGHT: "bomber_right",
  LEFT: "bomber_left",
} as const;

export const BOMBER_ANIM_KEYS = {
  MOVE_0: "bomber_move_0",
  MOVE_1: "bomber_move_1",
  WINDUP_0: "bomber_windup_0",
  WINDUP_1: "bomber_windup_1",
  EXPLOSION_FX_0: "bomber_explosion_fx_0",
  EXPLOSION_FX_1: "bomber_explosion_fx_1",
  EXPLOSION_FX_2: "bomber_explosion_fx_2",
} as const;

function drawBomberBody(
  g: Phaser.GameObjects.Graphics,
  facing: "right" | "left",
  opts: { legOffset?: number; coreScale?: number; isFlashing?: boolean } = {},
): void {
  const isRight = facing === "right";
  const size = ENEMY_TEXTURE_SIZE;
  const half = size / 2;
  const mx = (x: number) => (isRight ? x : size - x);

  const legOffset = opts.legOffset ?? 0;
  const coreScale = opts.coreScale ?? 1.0;
  const isFlashing = opts.isFlashing ?? false;

  // 1. 機械的な脚・スパイク
  g.lineStyle(3, 0x1e293b, 1);
  g.lineBetween(mx(half - 10), half + 10, mx(half - 22), half + 26 + legOffset);
  g.lineBetween(mx(half + 10), half + 10, mx(half + 22), half + 26 - legOffset);
  g.lineBetween(mx(half - 4), half + 12, mx(half - 8), half + 28);
  g.lineBetween(mx(half + 4), half + 12, mx(half + 8), half + 28);

  // 2. 外郭装甲（金属球体）
  g.fillStyle(0x334155, 1);
  g.fillCircle(mx(half), half, 20);
  g.lineStyle(2, 0x64748b, 1);
  g.strokeCircle(mx(half), half, 20);

  // 3. 不安定な高エネルギー爆縮コア
  const coreRadius = Math.round(13 * coreScale);
  const outerCoreColor = isFlashing ? 0xff0055 : 0xea580c;
  const innerCoreColor = isFlashing ? 0xfecdd3 : 0xfef08a;

  g.fillStyle(outerCoreColor, 0.9);
  g.fillCircle(mx(half), half, coreRadius);
  g.fillStyle(innerCoreColor, 1);
  g.fillCircle(mx(half), half, Math.round(coreRadius * 0.55));
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(mx(half - 2), half - 2, Math.round(coreRadius * 0.25));

  // 4. 前方センサー・レンズ
  g.fillStyle(0x0f172a, 1);
  g.fillCircle(mx(half + 14), half - 3, 5);
  g.fillStyle(isFlashing ? 0xff0055 : 0x38bdf8, 1);
  g.fillCircle(mx(half + 15), half - 3, 3);
}

function registerDirectionalBomber(
  scene: Phaser.Scene,
  baseKey: string,
  opts: { legOffset?: number; coreScale?: number; isFlashing?: boolean } = {},
): void {
  const size = ENEMY_TEXTURE_SIZE;

  // 右向き
  const gRight = scene.make.graphics({ x: 0, y: 0 });
  drawBomberBody(gRight, "right", opts);
  gRight.generateTexture(`${baseKey}_right`, size, size);
  gRight.destroy();

  // 左向き
  const gLeft = scene.make.graphics({ x: 0, y: 0 });
  drawBomberBody(gLeft, "left", opts);
  gLeft.generateTexture(`${baseKey}_left`, size, size);
  gLeft.destroy();
}

export function generateBomberTextures(scene: Phaser.Scene): void {
  // 基本
  registerDirectionalBomber(scene, BOMBER_TEXTURE_KEYS.MAIN);
  if (scene.textures.exists("bomber_right")) {
    const rightImg = scene.textures.get("bomber_right").getSourceImage();
    scene.textures.addImage(BOMBER_TEXTURE_KEYS.RIGHT, rightImg as HTMLImageElement);
  }
  if (scene.textures.exists("bomber_left")) {
    const leftImg = scene.textures.get("bomber_left").getSourceImage();
    scene.textures.addImage(BOMBER_TEXTURE_KEYS.LEFT, leftImg as HTMLImageElement);
  }

  // 移動 (2コマ)
  registerDirectionalBomber(scene, BOMBER_ANIM_KEYS.MOVE_0, { legOffset: 0, coreScale: 1.0 });
  registerDirectionalBomber(scene, BOMBER_ANIM_KEYS.MOVE_1, { legOffset: 4, coreScale: 1.1 });

  // 爆発予兆（膨張・激しい赤点滅、2コマ）
  registerDirectionalBomber(scene, BOMBER_ANIM_KEYS.WINDUP_0, {
    coreScale: 1.3,
    isFlashing: false,
    legOffset: -2,
  });
  registerDirectionalBomber(scene, BOMBER_ANIM_KEYS.WINDUP_1, {
    coreScale: 1.55,
    isFlashing: true,
    legOffset: 2,
  });

  // 攻撃範囲と一致する大爆発エフェクト
  generateBomberExplosionEffectTextures(scene);
}

function generateBomberExplosionEffectTextures(scene: Phaser.Scene): void {
  const size = 240;
  const half = size / 2;
  const rMax = 110; // 攻撃判定半径と一致

  // FX 0: 超高輝度フラッシュ ＋ 衝撃波リング出現
  const fx0 = scene.make.graphics({ x: 0, y: 0 });
  // 攻撃範囲全体を覆う発光円
  fx0.fillStyle(0xffffff, 0.95);
  fx0.fillCircle(half, half, rMax * 0.4);
  fx0.fillStyle(0xfde047, 0.7);
  fx0.fillCircle(half, half, rMax * 0.75);
  fx0.lineStyle(4, 0xff0055, 1);
  fx0.strokeCircle(half, half, rMax);
  fx0.generateTexture(BOMBER_ANIM_KEYS.EXPLOSION_FX_0, size, size);
  fx0.destroy();

  // FX 1: 最大爆炎球（炎と衝撃波境界）
  const fx1 = scene.make.graphics({ x: 0, y: 0 });
  // 爆風領域（最外殻）
  fx1.fillStyle(0xe11d48, 0.45);
  fx1.fillCircle(half, half, rMax);
  // 中間火炎
  fx1.fillStyle(0xf97316, 0.75);
  fx1.fillCircle(half, half, rMax * 0.85);
  // コア火炎
  fx1.fillStyle(0xfacc15, 0.9);
  fx1.fillCircle(half, half, rMax * 0.55);
  // 中心核
  fx1.fillStyle(0xffffff, 1);
  fx1.fillCircle(half, half, rMax * 0.25);
  // 明確な衝撃波リング境界
  fx1.lineStyle(3.5, 0xff0055, 0.9);
  fx1.strokeCircle(half, half, rMax);
  fx1.generateTexture(BOMBER_ANIM_KEYS.EXPLOSION_FX_1, size, size);
  fx1.destroy();

  // FX 2: 拡散・消滅（薄れる衝撃波リングと残煙）
  const fx2 = scene.make.graphics({ x: 0, y: 0 });
  fx2.fillStyle(0x475569, 0.25);
  fx2.fillCircle(half, half, rMax);
  fx2.fillStyle(0xf97316, 0.35);
  fx2.fillCircle(half, half, rMax * 0.7);
  fx2.lineStyle(2, 0xf43f5e, 0.5);
  fx2.strokeCircle(half, half, rMax);
  fx2.generateTexture(BOMBER_ANIM_KEYS.EXPLOSION_FX_2, size, size);
  fx2.destroy();
}

export function ensureBomberTextures(scene: Phaser.Scene): void {
  if (scene.textures && !scene.textures.exists(BOMBER_TEXTURE_KEYS.MAIN)) {
    generateBomberTextures(scene);
  }
}
