import type Phaser from "phaser";

import { ENEMY_TEXTURE_SIZE } from "../../../../constants";

export const RANGER_TEXTURE_KEYS = {
  MAIN: "ranger",
  RIGHT: "ranger_right",
  LEFT: "ranger_left",
} as const;

export const RANGER_ANIM_KEYS = {
  RUN_0: "ranger_run_0",
  RUN_1: "ranger_run_1",
  AIM_0: "ranger_aim_0",
  AIM_1: "ranger_aim_1",
  SHOOT_0: "ranger_shoot_0",
  SLASH_0: "ranger_slash_0",
  SLASH_1: "ranger_slash_1",
  STUN_0: "ranger_stun_0",
} as const;

function drawRangerBody(
  g: Phaser.GameObjects.Graphics,
  facing: "right" | "left",
  opts: {
    legSpread?: number;
    aimRaised?: boolean;
    isShooting?: boolean;
    isSlashing?: boolean;
    isStun?: boolean;
  } = {},
): void {
  const isRight = facing === "right";
  const size = ENEMY_TEXTURE_SIZE;
  const half = size / 2;
  const mx = (x: number) => (isRight ? x : size - x);

  const legSpread = opts.legSpread ?? 0;
  const aimRaised = opts.aimRaised ?? false;
  const isShooting = opts.isShooting ?? false;
  const isSlashing = opts.isSlashing ?? false;
  const isStun = opts.isStun ?? false;

  // カラーパレット（森林・狙撃兵カラー）
  const cCloakDark = 0x14532d; // 深緑マント
  const cCloakMain = 0x166534; // グリーン
  const cTunic = 0x27272a; // インナースーツ
  const cLeather = 0x78350f; // 革ベルト
  const cScope = 0x22c55e; // 発光照準器
  const cBow = 0xa16207; // ライフル/クロスボウのウッド
  const cMetal = 0x94a3b8; // 銃身メタル

  // 1. なびくマント（背後へ流れる）
  g.fillStyle(cCloakDark, 1);
  g.fillTriangle(mx(half - 6), half - 4, mx(half - 22), half + 22, mx(half + 2), half + 18);
  g.fillStyle(cCloakMain, 1);
  g.fillTriangle(mx(half - 4), half - 2, mx(half - 18), half + 20, mx(half + 4), half + 16);

  // 2. 脚（ブーツ）
  g.fillStyle(cLeather, 1);
  g.fillRect(mx(half - 8 - legSpread), half + 14, 5, 12);
  g.fillRect(mx(half + 3 + legSpread), half + 14, 5, 12);

  // 3. 胴体（レザージャケット）
  g.fillStyle(cTunic, 1);
  g.fillRoundedRect(mx(half - 8), half - 6, 16, 20, 3);
  g.fillStyle(cLeather, 1);
  g.fillRect(mx(half - 8), half + 6, 16, 3);

  // 4. フード付き頭部
  g.fillStyle(cCloakDark, 1);
  g.fillCircle(mx(half + 2), half - 12, 10);
  g.fillStyle(cCloakMain, 1);
  g.fillCircle(mx(half + 2), half - 12, 8.5);

  // 顔の影とスコープアイ（照準光）
  g.fillStyle(0x09090b, 1);
  g.fillCircle(mx(half + 5), half - 11, 4.5);
  g.fillStyle(isStun ? 0xffffff : cScope, 1);
  g.fillCircle(mx(half + 6), half - 11, 2.5);

  // 5. 武器（クロスボウ/ライフル）
  if (isSlashing) {
    // 近接爪/短剣攻撃の構え
    g.lineStyle(3, cMetal, 1);
    g.lineBetween(mx(half + 4), half + 2, mx(half + 26), half + 10);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(mx(half + 24), half + 8, mx(half + 32), half + 12, mx(half + 22), half + 14);
  } else {
    // 遠距離ライフル / ボウ
    const recoilX = isShooting ? -4 : 0;
    const aimY = aimRaised ? -3 : 0;

    g.lineStyle(3, cBow, 1);
    g.lineBetween(
      mx(half - 4 + recoilX),
      half + 6 + aimY,
      mx(half + 18 + recoilX),
      half - 4 + aimY,
    );
    // 銃身
    g.lineStyle(2, cMetal, 1);
    g.lineBetween(
      mx(half + 14 + recoilX),
      half - 2 + aimY,
      mx(half + 26 + recoilX),
      half - 7 + aimY,
    );

    // エイム中のスコープ発光
    if (aimRaised) {
      g.fillStyle(0x4ade80, 0.8);
      g.fillCircle(mx(half + 22 + recoilX), half - 5 + aimY, 3);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(mx(half + 22 + recoilX), half - 5 + aimY, 1.5);
    }
  }
}

function registerDirectionalRanger(
  scene: Phaser.Scene,
  baseKey: string,
  opts: {
    legSpread?: number;
    aimRaised?: boolean;
    isShooting?: boolean;
    isSlashing?: boolean;
    isStun?: boolean;
  } = {},
): void {
  const size = ENEMY_TEXTURE_SIZE;

  // 右向き
  const gRight = scene.make.graphics({ x: 0, y: 0 });
  drawRangerBody(gRight, "right", opts);
  gRight.generateTexture(`${baseKey}_right`, size, size);
  gRight.destroy();

  // 左向き
  const gLeft = scene.make.graphics({ x: 0, y: 0 });
  drawRangerBody(gLeft, "left", opts);
  gLeft.generateTexture(`${baseKey}_left`, size, size);
  gLeft.destroy();
}

export function generateRangerTextures(scene: Phaser.Scene): void {
  // 基本左右
  registerDirectionalRanger(scene, RANGER_TEXTURE_KEYS.MAIN);

  // 左右スプライト存在時にデフォルトキー "ranger" も登録
  if (scene.textures.exists("ranger_right")) {
    const rImg = scene.textures.get("ranger_right").getSourceImage();
    scene.textures.addImage(RANGER_TEXTURE_KEYS.MAIN, rImg as HTMLImageElement);
  }

  // 移動 (2コマ)
  registerDirectionalRanger(scene, RANGER_ANIM_KEYS.RUN_0, { legSpread: 4 });
  registerDirectionalRanger(scene, RANGER_ANIM_KEYS.RUN_1, { legSpread: -4 });

  // 照準・エイム (2コマ)
  registerDirectionalRanger(scene, RANGER_ANIM_KEYS.AIM_0, { aimRaised: true });
  registerDirectionalRanger(scene, RANGER_ANIM_KEYS.AIM_1, {
    aimRaised: true,
    legSpread: 2,
  });

  // 射撃発射反動 (1コマ)
  registerDirectionalRanger(scene, RANGER_ANIM_KEYS.SHOOT_0, {
    isShooting: true,
  });

  // 近接突進爪撃 (2コマ)
  registerDirectionalRanger(scene, RANGER_ANIM_KEYS.SLASH_0, {
    isSlashing: true,
    legSpread: 5,
  });
  registerDirectionalRanger(scene, RANGER_ANIM_KEYS.SLASH_1, {
    isSlashing: true,
    legSpread: 1,
  });

  // スタン
  registerDirectionalRanger(scene, RANGER_ANIM_KEYS.STUN_0, { isStun: true });
}

export function ensureRangerTextures(scene: Phaser.Scene): void {
  if (scene.textures && !scene.textures.exists(RANGER_TEXTURE_KEYS.MAIN)) {
    generateRangerTextures(scene);
  }
}
