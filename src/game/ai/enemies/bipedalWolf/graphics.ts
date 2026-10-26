import Phaser from "phaser";

import { ENEMY_TEXTURE_SIZE } from "../../../../constants";

export const WOLF_TEXTURE_KEYS = {
  MAIN: "wolf",
  RIGHT: "wolf_right",
  LEFT: "wolf_left",
} as const;

export const WOLF_ANIM_KEYS = {
  RUN_0: "wolf_run_0",
  RUN_1: "wolf_run_1",
  WINDUP_0: "wolf_windup_0",
  WINDUP_1: "wolf_windup_1",
  SLASH_0: "wolf_slash_0",
  SLASH_1: "wolf_slash_1",
  STUN_0: "wolf_stun_0",
  SLASH_FX_0: "wolf_slash_fx_0",
  SLASH_FX_1: "wolf_slash_fx_1",
  SLASH_FX_2: "wolf_slash_fx_2",
} as const;

function drawWolfBody(
  g: Phaser.GameObjects.Graphics,
  facing: "right" | "left",
  opts: {
    legSpread?: number;
    clawRaised?: boolean;
    crouchY?: number;
    snoutOpen?: number;
    isStun?: boolean;
  } = {},
): void {
  const isRight = facing === "right";
  const size = ENEMY_TEXTURE_SIZE;
  const half = size / 2;
  const mx = (x: number) => (isRight ? x : size - x);

  const legSpread = opts.legSpread ?? 0;
  const clawRaised = opts.clawRaised ?? false;
  const crouchY = opts.crouchY ?? 0;
  const snoutOpen = opts.snoutOpen ?? 0;
  const isStun = opts.isStun ?? false;

  // カラーパレット（青灰色の野獣狼）
  const cFurDark = 0x1e293b;
  const cFurMain = 0x334155;
  const cChest = 0x94a3b8;
  const cEye = 0xfacc15;
  const cClaw = 0xffffff;

  // 1. 狼の毛深い尾
  g.fillStyle(cFurDark, 1);
  g.fillTriangle(
    mx(18),
    half + 6 + crouchY,
    mx(2),
    half + 14 + crouchY,
    mx(16),
    half + 18 + crouchY,
  );
  g.fillStyle(cFurMain, 1);
  g.fillTriangle(
    mx(18),
    half + 8 + crouchY,
    mx(5),
    half + 15 + crouchY,
    mx(16),
    half + 16 + crouchY,
  );

  // 2. 二足歩行の下肢（強靭な獣脚）
  g.fillStyle(cFurDark, 1);
  g.fillTriangle(
    mx(24),
    half + 12 + crouchY,
    mx(16 - legSpread),
    size - 4,
    mx(28 - legSpread),
    size - 4,
  );
  g.fillTriangle(
    mx(34),
    half + 12 + crouchY,
    mx(38 + legSpread),
    size - 4,
    mx(48 + legSpread),
    size - 4,
  );

  // 3. 胴体（逆三角形のマッシブな体躯）
  g.fillStyle(cFurDark, 1);
  g.fillEllipse(mx(32), half + 4 + crouchY, 26, 30);
  g.fillStyle(cFurMain, 1);
  g.fillEllipse(mx(33), half + 2 + crouchY, 24, 28);
  // 胸毛（ライトグレー）
  g.fillStyle(cChest, 0.9);
  g.fillEllipse(mx(36), half + 4 + crouchY, 14, 18);

  // 4. 頭部・尖った耳・獰猛な鼻先
  g.fillStyle(cFurDark, 1);
  // 耳
  g.fillTriangle(
    mx(28),
    half - 14 + crouchY,
    mx(24),
    half - 28 + crouchY,
    mx(32),
    half - 18 + crouchY,
  );
  g.fillTriangle(
    mx(36),
    half - 14 + crouchY,
    mx(34),
    half - 26 + crouchY,
    mx(42),
    half - 16 + crouchY,
  );
  // 頭
  g.fillStyle(cFurMain, 1);
  g.fillCircle(mx(34), half - 8 + crouchY, 12);
  // マズル（鼻先）
  g.fillStyle(cFurDark, 1);
  g.fillTriangle(
    mx(38),
    half - 12 + crouchY,
    mx(54),
    half - 4 + crouchY + snoutOpen,
    mx(38),
    half + crouchY,
  );
  // 牙
  g.fillStyle(cClaw, 1);
  g.fillTriangle(
    mx(44),
    half - 6 + crouchY,
    mx(46),
    half - 1 + crouchY + snoutOpen,
    mx(48),
    half - 6 + crouchY,
  );

  // 5. 鋭い前爪（腕）
  if (clawRaised) {
    // 振り上げ / 攻撃モーション
    g.fillStyle(cFurDark, 1);
    g.fillTriangle(
      mx(36),
      half - 2 + crouchY,
      mx(52),
      half - 18 + crouchY,
      mx(44),
      half - 6 + crouchY,
    );
    g.fillStyle(cClaw, 1);
    g.fillTriangle(
      mx(52),
      half - 18 + crouchY,
      mx(62),
      half - 22 + crouchY,
      mx(50),
      half - 14 + crouchY,
    );
    g.fillTriangle(
      mx(50),
      half - 14 + crouchY,
      mx(60),
      half - 16 + crouchY,
      mx(48),
      half - 10 + crouchY,
    );
  } else {
    // 通常の構え
    g.fillStyle(cFurDark, 1);
    g.fillTriangle(
      mx(34),
      half + crouchY,
      mx(44),
      half + 12 + crouchY,
      mx(38),
      half + 16 + crouchY,
    );
    g.fillStyle(cClaw, 1);
    g.fillTriangle(
      mx(44),
      half + 12 + crouchY,
      mx(52),
      half + 15 + crouchY,
      mx(42),
      half + 16 + crouchY,
    );
  }

  // 6. 狼の金眼
  g.fillStyle(0x0f172a, 1);
  g.fillCircle(mx(39), half - 9 + crouchY, 4.5);
  g.fillStyle(isStun ? 0xffffff : cEye, 1);
  g.fillCircle(mx(39), half - 9 + crouchY, 3);
  if (!isStun) {
    g.fillStyle(0x000000, 1);
    g.fillEllipse(mx(40), half - 9 + crouchY, 1.5, 3);
  }
}

function registerDirectionalWolf(
  scene: Phaser.Scene,
  baseKey: string,
  opts: {
    legSpread?: number;
    clawRaised?: boolean;
    crouchY?: number;
    snoutOpen?: number;
    isStun?: boolean;
  } = {},
): void {
  const size = ENEMY_TEXTURE_SIZE;

  // 右向き
  const gRight = scene.make.graphics({ x: 0, y: 0 });
  drawWolfBody(gRight, "right", opts);
  gRight.generateTexture(`${baseKey}_right`, size, size);
  gRight.destroy();

  // 左向き
  const gLeft = scene.make.graphics({ x: 0, y: 0 });
  drawWolfBody(gLeft, "left", opts);
  gLeft.generateTexture(`${baseKey}_left`, size, size);
  gLeft.destroy();
}

export function generateWolfTextures(scene: Phaser.Scene): void {
  // 基本
  registerDirectionalWolf(scene, WOLF_TEXTURE_KEYS.MAIN);
  if (scene.textures.exists("wolf_right")) {
    const rightImg = scene.textures.get("wolf_right").getSourceImage();
    scene.textures.addImage(WOLF_TEXTURE_KEYS.RIGHT, rightImg as HTMLImageElement);
  }
  if (scene.textures.exists("wolf_left")) {
    const leftImg = scene.textures.get("wolf_left").getSourceImage();
    scene.textures.addImage(WOLF_TEXTURE_KEYS.LEFT, leftImg as HTMLImageElement);
  }

  // 走行 (2コマ)
  registerDirectionalWolf(scene, WOLF_ANIM_KEYS.RUN_0, { legSpread: 4 });
  registerDirectionalWolf(scene, WOLF_ANIM_KEYS.RUN_1, { legSpread: -4 });

  // 予兆・構え（身を低く屈め爪を構える、2コマ）
  registerDirectionalWolf(scene, WOLF_ANIM_KEYS.WINDUP_0, {
    crouchY: 3,
    clawRaised: true,
    snoutOpen: 2,
  });
  registerDirectionalWolf(scene, WOLF_ANIM_KEYS.WINDUP_1, {
    crouchY: 5,
    clawRaised: true,
    snoutOpen: 4,
  });

  // 突進・爪撃（大きく一歩前進、2コマ）
  registerDirectionalWolf(scene, WOLF_ANIM_KEYS.SLASH_0, {
    crouchY: 1,
    clawRaised: true,
    legSpread: 6,
    snoutOpen: 5,
  });
  registerDirectionalWolf(scene, WOLF_ANIM_KEYS.SLASH_1, {
    crouchY: 0,
    clawRaised: false,
    legSpread: 2,
  });

  // スタン
  registerDirectionalWolf(scene, WOLF_ANIM_KEYS.STUN_0, {
    crouchY: 4,
    isStun: true,
    snoutOpen: 1,
  });

  // 攻撃範囲（リーチ85px・扇形70度）を可視化する斬撃エフェクト
  generateWolfSlashEffectTextures(scene);
}

function generateWolfSlashEffectTextures(scene: Phaser.Scene): void {
  const w = 110;
  const h = 130;
  const oy = h / 2; // y中心 = 65

  // FX 0: 鋭い閃光・爪痕の出現
  const fx0 = scene.make.graphics({ x: 0, y: 0 });
  // 扇状の薄い予告残光
  fx0.fillStyle(0x0284c7, 0.25);
  fx0.slice(0, oy, 85, Phaser.Math.DegToRad(-35), Phaser.Math.DegToRad(35), false);
  fx0.fillPath();
  // 三連爪痕
  fx0.lineStyle(3, 0x38bdf8, 0.9);
  fx0.beginPath();
  fx0.arc(0, oy, 72, Phaser.Math.DegToRad(-30), Phaser.Math.DegToRad(30), false);
  fx0.strokePath();
  fx0.lineStyle(2, 0xffffff, 1);
  fx0.beginPath();
  fx0.arc(0, oy, 60, Phaser.Math.DegToRad(-25), Phaser.Math.DegToRad(25), false);
  fx0.strokePath();
  fx0.generateTexture(WOLF_ANIM_KEYS.SLASH_FX_0, w, h);
  fx0.destroy();

  // FX 1: 最大切断アーク（リーチ85pxの最大展開・高輝度）
  const fx1 = scene.make.graphics({ x: 0, y: 0 });
  fx1.fillStyle(0x38bdf8, 0.35);
  fx1.slice(0, oy, 85, Phaser.Math.DegToRad(-35), Phaser.Math.DegToRad(35), false);
  fx1.fillPath();
  // 鋭い3本爪痕
  for (const r of [55, 70, 85]) {
    fx1.lineStyle(3.5, 0x0284c7, 0.9);
    fx1.beginPath();
    fx1.arc(0, oy, r, Phaser.Math.DegToRad(-35), Phaser.Math.DegToRad(35), false);
    fx1.strokePath();
    fx1.lineStyle(2, 0xffffff, 1);
    fx1.beginPath();
    fx1.arc(0, oy, r, Phaser.Math.DegToRad(-32), Phaser.Math.DegToRad(32), false);
    fx1.strokePath();
  }
  fx1.generateTexture(WOLF_ANIM_KEYS.SLASH_FX_1, w, h);
  fx1.destroy();

  // FX 2: 拡散・消えゆく残光
  const fx2 = scene.make.graphics({ x: 0, y: 0 });
  fx2.fillStyle(0x0284c7, 0.15);
  fx2.slice(0, oy, 88, Phaser.Math.DegToRad(-35), Phaser.Math.DegToRad(35), false);
  fx2.fillPath();
  fx2.lineStyle(2, 0x38bdf8, 0.5);
  fx2.beginPath();
  fx2.arc(0, oy, 85, Phaser.Math.DegToRad(-35), Phaser.Math.DegToRad(35), false);
  fx2.strokePath();
  fx2.lineStyle(1.5, 0xffffff, 0.6);
  fx2.beginPath();
  fx2.arc(0, oy, 70, Phaser.Math.DegToRad(-25), Phaser.Math.DegToRad(25), false);
  fx2.strokePath();
  fx2.generateTexture(WOLF_ANIM_KEYS.SLASH_FX_2, w, h);
  fx2.destroy();
}

export function ensureWolfTextures(scene: Phaser.Scene): void {
  if (scene.textures && !scene.textures.exists(WOLF_TEXTURE_KEYS.MAIN)) {
    generateWolfTextures(scene);
  }
}

export const generateBipedalWolfTextures = generateWolfTextures;
