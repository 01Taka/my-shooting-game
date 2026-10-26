import type Phaser from "phaser";

import { ENEMY_TEXTURE_SIZE, SHADOW_COLOR } from "../../../../constants";

/** Predator の基本テクスチャキー */
export const PREDATOR_TEXTURE_KEYS = {
  MAIN: "enemy",
  RIGHT: "enemy_right",
  LEFT: "enemy_left",
  FRONT_RIGHT: "enemy_front_right",
  FRONT_LEFT: "enemy_front_left",
  BACK_RIGHT: "enemy_back_right",
  BACK_LEFT: "enemy_back_left",
  SHADOW: "enemy_shadow",
} as const;

/** Predator のアニメーション用ベーステクスチャキー */
export const PREDATOR_ANIM_KEYS = {
  MOVE_0: "predator_move_0",
  MOVE_1: "predator_move_1",
  SHOOT_0: "predator_shoot_0",
  SHOOT_1: "predator_shoot_1",
  DASH_0: "predator_dash_0",
  DASH_1: "predator_dash_1",
  SLASH_0: "predator_slash_0",
  SLASH_1: "predator_slash_1",
  STUN_0: "predator_stun_0",
  CLAW_FX_0: "predator_claw_fx_0",
  CLAW_FX_1: "predator_claw_fx_1",
  CLAW_FX_2: "predator_claw_fx_2",
} as const;

// 共通カラーパレット（深紅の有機的クリーチャー）
const cBioDark = 0x450a0a; // 深い影・血肉
const cBioMain = 0x991b1b; // 肉体メイン
const cBioLight = 0xdc2626; // ハイライト肉
const cBioBelly = 0xf87171; // 柔らかい腹部
const cSclera = 0xfef08a; // 黄色い眼球
const cPupil = 0x000000; // 縦スリット瞳孔
const cFang = 0xffffff; // 鋭い牙

interface PredatorBodyOptions {
  tailYOffset?: number;
  mouthScale?: number;
  spikesRaised?: boolean;
  eyeState?: "normal" | "glow" | "stun";
  clawOut?: boolean;
}

/**
 * 生物敵 Predator の体をプロシージャル描画する汎用内部関数
 */
function drawPredatorBody(
  g: Phaser.GameObjects.Graphics,
  facing: "right" | "left",
  opts: PredatorBodyOptions = {},
): void {
  const isRight = facing === "right";
  const tailY = opts.tailYOffset ?? 0;
  const mouthScale = opts.mouthScale ?? 1.0;
  const spikesRaised = opts.spikesRaised ?? false;
  const eyeState = opts.eyeState ?? "normal";
  const clawOut = opts.clawOut ?? false;

  // X軸の反転ヘルパー (基準幅 64)
  const mx = (x: number) => (isRight ? x : 64 - x);

  // 1. しなる尾/触手
  g.fillStyle(cBioDark, 1);
  g.fillTriangle(mx(18), 30 + tailY, mx(2), 24 + tailY * 1.5, mx(16), 40 + tailY);
  g.fillStyle(cBioMain, 1);
  g.fillTriangle(mx(20), 32 + tailY, mx(6), 26 + tailY * 1.5, mx(18), 38 + tailY);

  // 2. 背中の骨棘（スパイク/角）
  const spikeH = spikesRaised ? 4 : 0;
  g.fillStyle(cBioDark, 1);
  g.fillTriangle(mx(18), 18, mx(14), 8 - spikeH, mx(26), 16);
  g.fillStyle(cSclera, 0.9);
  g.fillTriangle(mx(19), 17, mx(16), 10 - spikeH, mx(25), 16);
  g.fillStyle(cBioDark, 1);
  g.fillTriangle(mx(28), 14, mx(26), 6 - spikeH, mx(36), 14);

  // 3. 肉体メインボディ
  g.fillStyle(cBioDark, 1);
  g.fillEllipse(mx(30), 32, 32, 28);
  g.fillStyle(cBioMain, 1);
  g.fillEllipse(mx(31), 30, 30, 26);
  // 上面筋肉ハイライト
  g.fillStyle(cBioLight, 0.9);
  g.fillEllipse(mx(31), 24, 24, 16);
  // 腹部
  g.fillStyle(cBioBelly, 0.85);
  g.fillEllipse(mx(32), 38, 20, 10);

  // 4. 爪（攻撃時）
  if (clawOut) {
    g.fillStyle(cFang, 1);
    g.fillTriangle(mx(42), 42, mx(56), 46, mx(44), 48);
    g.fillTriangle(mx(38), 44, mx(52), 52, mx(40), 50);
  }

  // 5. 獰猛な口と牙
  const mouthOpen = Math.round(6 * mouthScale);
  g.fillStyle(0x1a0505, 1);
  g.fillTriangle(mx(34), 34 - mouthOpen / 2, mx(48), 38, mx(34), 44 + mouthOpen / 2);
  g.fillStyle(cFang, 1);
  g.fillTriangle(mx(41), 35 - mouthOpen / 4, mx(43), 39, mx(44), 35 - mouthOpen / 4);
  g.fillTriangle(mx(45), 36 - mouthOpen / 4, mx(47), 40, mx(48), 36 - mouthOpen / 4);
  g.fillTriangle(mx(39), 43 + mouthOpen / 4, mx(41), 39, mx(43), 43 + mouthOpen / 4);

  // 6. 生きた眼球
  g.fillStyle(cBioDark, 1);
  g.fillCircle(mx(38), 23, 9);
  g.fillStyle(eyeState === "glow" ? 0xffff00 : cSclera, 1);
  g.fillCircle(mx(38), 23, 7.5);

  if (eyeState === "stun") {
    // スタン時：X目（または収縮スリット）
    g.fillStyle(cPupil, 1);
    g.fillCircle(mx(38), 23, 2.5);
    g.lineStyle(1.5, 0x000000, 1);
    g.lineBetween(mx(35), 20, mx(41), 26);
    g.lineBetween(mx(35), 26, mx(41), 20);
  } else {
    g.fillStyle(cPupil, 1);
    const pupilW = eyeState === "glow" ? 4.5 : 3;
    g.fillEllipse(mx(39), 23, pupilW, 7);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(mx(37), 21, 2);
  }
}

/**
 * 左右向きのグラフィックスを生成してテクスチャ登録するヘルパー
 */
function registerDirectionalFrames(
  scene: Phaser.Scene,
  baseKey: string,
  opts: PredatorBodyOptions = {},
): void {
  const ew = ENEMY_TEXTURE_SIZE;
  const eh = ENEMY_TEXTURE_SIZE;

  // 右向き
  const gRight = scene.make.graphics({ x: 0, y: 0 });
  drawPredatorBody(gRight, "right", opts);
  gRight.generateTexture(`${baseKey}_right`, ew, eh);
  gRight.destroy();

  // 左向き
  const gLeft = scene.make.graphics({ x: 0, y: 0 });
  drawPredatorBody(gLeft, "left", opts);
  gLeft.generateTexture(`${baseKey}_left`, ew, eh);
  gLeft.destroy();
}

/**
 * 連続線を描画するヘルパー
 */
function drawPolyline(
  g: Phaser.GameObjects.Graphics,
  pts: Array<[number, number]>,
  lineWidth: number,
  color: number,
  alpha = 1,
): void {
  if (pts.length < 2) return;
  g.lineStyle(lineWidth, color, alpha);
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    g.lineTo(pts[i][0], pts[i][1]);
  }
  g.strokePath();
}

/**
 * 扇形爪斬撃エフェクト (predator_claw_fx_0..2) を生成する
 */
function generateClawEffectTextures(scene: Phaser.Scene): void {
  const size = 96;

  // FX 0: 発生直後の鋭い3本爪閃光
  const fx0 = scene.make.graphics({ x: 0, y: 0 });
  drawPolyline(
    fx0,
    [
      [30, 18],
      [65, 35],
      [80, 48],
      [65, 61],
      [30, 78],
    ],
    3.5,
    0xffffff,
    1,
  );
  drawPolyline(
    fx0,
    [
      [22, 24],
      [55, 38],
      [70, 48],
      [55, 58],
      [22, 72],
    ],
    2,
    0xff0055,
    0.9,
  );
  fx0.generateTexture(PREDATOR_ANIM_KEYS.CLAW_FX_0, size, size);
  fx0.destroy();

  // FX 1: 斬撃が最大に広がり深紅の衝撃波が走る
  const fx1 = scene.make.graphics({ x: 0, y: 0 });
  drawPolyline(
    fx1,
    [
      [35, 12],
      [75, 32],
      [92, 48],
      [75, 64],
      [35, 84],
    ],
    5,
    0xff0055,
    0.95,
  );
  drawPolyline(
    fx1,
    [
      [35, 14],
      [73, 32],
      [90, 48],
      [73, 64],
      [35, 82],
    ],
    2.5,
    0xffffff,
    1,
  );
  drawPolyline(
    fx1,
    [
      [25, 20],
      [60, 38],
      [76, 48],
      [60, 58],
      [25, 76],
    ],
    3,
    0x991b1b,
    0.8,
  );
  fx1.generateTexture(PREDATOR_ANIM_KEYS.CLAW_FX_1, size, size);
  fx1.destroy();

  // FX 2: 拡散し消えゆく残光
  const fx2 = scene.make.graphics({ x: 0, y: 0 });
  drawPolyline(
    fx2,
    [
      [42, 10],
      [80, 30],
      [96, 48],
      [80, 66],
      [42, 86],
    ],
    2.5,
    0x991b1b,
    0.5,
  );
  drawPolyline(
    fx2,
    [
      [30, 24],
      [68, 40],
      [82, 48],
      [68, 56],
      [30, 72],
    ],
    1.5,
    0xff5577,
    0.4,
  );
  fx2.generateTexture(PREDATOR_ANIM_KEYS.CLAW_FX_2, size, size);
  fx2.destroy();
}

/**
 * Predator敵のプロシージャルテクスチャ群を生成してPhaserテクスチャマネージャーに登録する
 */
export function generatePredatorTextures(scene: Phaser.Scene): void {
  const ew = ENEMY_TEXTURE_SIZE;
  const eh = ENEMY_TEXTURE_SIZE;

  // 1. 基本テクスチャ（enemy_right, enemy_left, enemy）
  registerDirectionalFrames(scene, PREDATOR_TEXTURE_KEYS.MAIN);
  if (scene.textures.exists("enemy_right")) {
    const rightImg = scene.textures.get("enemy_right").getSourceImage();
    scene.textures.addImage(PREDATOR_TEXTURE_KEYS.RIGHT, rightImg as HTMLImageElement);
  }
  if (scene.textures.exists("enemy_left")) {
    const leftImg = scene.textures.get("enemy_left").getSourceImage();
    scene.textures.addImage(PREDATOR_TEXTURE_KEYS.LEFT, leftImg as HTMLImageElement);
  }

  // 2. 移動アニメーションフレーム (2コマ歩行ループ)
  registerDirectionalFrames(scene, PREDATOR_ANIM_KEYS.MOVE_0, { tailYOffset: 0 });
  registerDirectionalFrames(scene, PREDATOR_ANIM_KEYS.MOVE_1, { tailYOffset: -3 });

  // 3. 射撃アニメーションフレーム (2コマ予兆・発射)
  registerDirectionalFrames(scene, PREDATOR_ANIM_KEYS.SHOOT_0, {
    mouthScale: 1.2,
    eyeState: "glow",
  });
  registerDirectionalFrames(scene, PREDATOR_ANIM_KEYS.SHOOT_1, {
    mouthScale: 1.6,
    eyeState: "glow",
  });

  // 4. 突進アニメーションフレーム (2コマ高速突進)
  registerDirectionalFrames(scene, PREDATOR_ANIM_KEYS.DASH_0, {
    spikesRaised: true,
    mouthScale: 0.8,
    tailYOffset: 2,
  });
  registerDirectionalFrames(scene, PREDATOR_ANIM_KEYS.DASH_1, {
    spikesRaised: true,
    mouthScale: 1.3,
    tailYOffset: -2,
  });

  // 5. 爪攻撃アニメーションフレーム (2コマ爪振り抜き・硬直)
  registerDirectionalFrames(scene, PREDATOR_ANIM_KEYS.SLASH_0, {
    clawOut: true,
    mouthScale: 1.4,
    spikesRaised: true,
  });
  registerDirectionalFrames(scene, PREDATOR_ANIM_KEYS.SLASH_1, {
    clawOut: false,
    mouthScale: 0.6,
  });

  // 6. スタンフレーム
  registerDirectionalFrames(scene, PREDATOR_ANIM_KEYS.STUN_0, {
    eyeState: "stun",
    tailYOffset: 4,
    mouthScale: 0.4,
  });

  // 7. 爪斬撃エフェクトスプライト用フレーム (3コマ)
  generateClawEffectTextures(scene);

  // 8. 斜め4方向用テクスチャ（従来のフォールバック維持）
  // 右前 (front_right)
  const eFrontRightG = scene.make.graphics({ x: 0, y: 0 });
  drawPredatorBody(eFrontRightG, "right", { mouthScale: 1.1 });
  eFrontRightG.generateTexture(PREDATOR_TEXTURE_KEYS.FRONT_RIGHT, ew, eh);
  eFrontRightG.destroy();

  // 左前 (front_left)
  const eFrontLeftG = scene.make.graphics({ x: 0, y: 0 });
  drawPredatorBody(eFrontLeftG, "left", { mouthScale: 1.1 });
  eFrontLeftG.generateTexture(PREDATOR_TEXTURE_KEYS.FRONT_LEFT, ew, eh);
  eFrontLeftG.destroy();

  // 右後ろ (back_right)
  const eBackRightG = scene.make.graphics({ x: 0, y: 0 });
  eBackRightG.fillStyle(cBioDark, 1);
  eBackRightG.fillEllipse(28, 30, 32, 28);
  eBackRightG.fillTriangle(20, 18, 16, 6, 28, 14);
  eBackRightG.fillTriangle(30, 16, 32, 4, 38, 16);
  eBackRightG.fillStyle(cBioMain, 1);
  eBackRightG.fillEllipse(28, 28, 30, 26);
  eBackRightG.fillStyle(cBioLight, 0.85);
  eBackRightG.fillEllipse(30, 24, 24, 16);
  eBackRightG.generateTexture(PREDATOR_TEXTURE_KEYS.BACK_RIGHT, ew, eh);
  eBackRightG.destroy();

  // 左後ろ (back_left)
  const eBackLeftG = scene.make.graphics({ x: 0, y: 0 });
  eBackLeftG.fillStyle(cBioDark, 1);
  eBackLeftG.fillEllipse(28, 30, 32, 28);
  eBackLeftG.fillTriangle(36, 18, 40, 6, 28, 14);
  eBackLeftG.fillTriangle(26, 16, 24, 4, 18, 16);
  eBackLeftG.fillStyle(cBioMain, 1);
  eBackLeftG.fillEllipse(28, 28, 30, 26);
  eBackLeftG.fillStyle(cBioLight, 0.85);
  eBackLeftG.fillEllipse(26, 24, 24, 16);
  eBackLeftG.generateTexture(PREDATOR_TEXTURE_KEYS.BACK_LEFT, ew, eh);
  eBackLeftG.destroy();

  // 9. 敵用影テクスチャ
  const enemyShadowGraphics = scene.make.graphics({ x: 0, y: 0 });
  enemyShadowGraphics.fillStyle(SHADOW_COLOR, 0.25);
  enemyShadowGraphics.fillEllipse(ew / 2, eh / 2, ew * 0.82, eh * 0.44);
  enemyShadowGraphics.fillStyle(SHADOW_COLOR, 0.55);
  enemyShadowGraphics.fillEllipse(ew / 2, eh / 2, ew * 0.62, eh * 0.3);
  enemyShadowGraphics.generateTexture(PREDATOR_TEXTURE_KEYS.SHADOW, ew, eh);
  enemyShadowGraphics.destroy();
}

/**
 * テクスチャが存在しない場合にのみ自動生成する安全関数
 */
export function ensurePredatorTextures(scene: Phaser.Scene): void {
  if (scene.textures && !scene.textures.exists(PREDATOR_TEXTURE_KEYS.MAIN)) {
    generatePredatorTextures(scene);
  }
}
