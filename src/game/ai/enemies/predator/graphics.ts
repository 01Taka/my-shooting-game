import type Phaser from "phaser";

import { ENEMY_TEXTURE_SIZE, SHADOW_COLOR } from "../../../../constants";

/** Predator の使用テクスチャキー */
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

/**
 * Predator敵のプロシージャルテクスチャ群を生成してPhaserテクスチャマネージャーに登録する
 */
export function generatePredatorTextures(scene: Phaser.Scene): void {
  const ew = ENEMY_TEXTURE_SIZE;
  const eh = ENEMY_TEXTURE_SIZE;

  // パレット（深紅の有機的クリーチャー）
  const cBioDark = 0x450a0a; // 深い影・血肉
  const cBioMain = 0x991b1b; // 肉体メイン
  const cBioLight = 0xdc2626; // ハイライト肉
  const cBioBelly = 0xf87171; // 柔らかい腹部
  const cSclera = 0xfef08a; // 黄色い眼球
  const cPupil = 0x000000; // 縦スリット瞳孔
  const cFang = 0xffffff; // 鋭い牙

  // ----------------------------------------------------
  // A. 生物敵 右向き (enemy_right)
  // ----------------------------------------------------
  const eRightG = scene.make.graphics({ x: 0, y: 0 });
  // しなる尾/触手
  eRightG.fillStyle(cBioDark, 1);
  eRightG.fillTriangle(18, 30, 2, 24, 16, 40);
  eRightG.fillStyle(cBioMain, 1);
  eRightG.fillTriangle(20, 32, 6, 26, 18, 38);

  // 背中の骨棘（スパイク/角）
  eRightG.fillStyle(cBioDark, 1);
  eRightG.fillTriangle(18, 18, 14, 8, 26, 16);
  eRightG.fillStyle(cSclera, 0.9);
  eRightG.fillTriangle(19, 17, 16, 10, 25, 16);
  eRightG.fillStyle(cBioDark, 1);
  eRightG.fillTriangle(28, 14, 26, 6, 36, 14);

  // 肉体メインボディ
  eRightG.fillStyle(cBioDark, 1);
  eRightG.fillEllipse(30, 32, 32, 28);
  eRightG.fillStyle(cBioMain, 1);
  eRightG.fillEllipse(31, 30, 30, 26);
  // 上面筋肉ハイライト
  eRightG.fillStyle(cBioLight, 0.9);
  eRightG.fillEllipse(31, 24, 24, 16);
  // 腹部
  eRightG.fillStyle(cBioBelly, 0.85);
  eRightG.fillEllipse(32, 38, 20, 10);

  // 獰猛な口と牙
  eRightG.fillStyle(0x1a0505, 1);
  eRightG.fillTriangle(34, 34, 48, 38, 34, 44);
  eRightG.fillStyle(cFang, 1);
  eRightG.fillTriangle(41, 35, 43, 39, 44, 35);
  eRightG.fillTriangle(45, 36, 47, 40, 48, 36);
  eRightG.fillTriangle(39, 43, 41, 39, 43, 43);

  // 生きた眼球
  eRightG.fillStyle(cBioDark, 1);
  eRightG.fillCircle(38, 23, 9);
  eRightG.fillStyle(cSclera, 1);
  eRightG.fillCircle(38, 23, 7.5);
  eRightG.fillStyle(cPupil, 1);
  eRightG.fillEllipse(39, 23, 3, 7);
  eRightG.fillStyle(0xffffff, 0.95);
  eRightG.fillCircle(37, 21, 2);

  eRightG.generateTexture(PREDATOR_TEXTURE_KEYS.RIGHT, ew, eh);
  eRightG.generateTexture(PREDATOR_TEXTURE_KEYS.MAIN, ew, eh);
  eRightG.destroy();

  // ----------------------------------------------------
  // B. 生物敵 左向き (enemy_left)
  // ----------------------------------------------------
  const eLeftG = scene.make.graphics({ x: 0, y: 0 });
  eLeftG.fillStyle(cBioDark, 1);
  eLeftG.fillTriangle(38, 30, 54, 24, 40, 40);
  eLeftG.fillStyle(cBioMain, 1);
  eLeftG.fillTriangle(36, 32, 50, 26, 38, 38);

  eLeftG.fillStyle(cBioDark, 1);
  eLeftG.fillTriangle(38, 18, 42, 8, 30, 16);
  eLeftG.fillStyle(cSclera, 0.9);
  eLeftG.fillTriangle(37, 17, 40, 10, 31, 16);
  eLeftG.fillStyle(cBioDark, 1);
  eLeftG.fillTriangle(28, 14, 30, 6, 20, 14);

  eLeftG.fillStyle(cBioDark, 1);
  eLeftG.fillEllipse(26, 32, 32, 28);
  eLeftG.fillStyle(cBioMain, 1);
  eLeftG.fillEllipse(25, 30, 30, 26);
  eLeftG.fillStyle(cBioLight, 0.9);
  eLeftG.fillEllipse(25, 24, 24, 16);
  eLeftG.fillStyle(cBioBelly, 0.85);
  eLeftG.fillEllipse(24, 38, 20, 10);

  eLeftG.fillStyle(0x1a0505, 1);
  eLeftG.fillTriangle(22, 34, 8, 38, 22, 44);
  eLeftG.fillStyle(cFang, 1);
  eLeftG.fillTriangle(15, 35, 13, 39, 12, 35);
  eLeftG.fillTriangle(11, 36, 9, 40, 8, 36);
  eLeftG.fillTriangle(17, 43, 15, 39, 13, 43);

  eLeftG.fillStyle(cBioDark, 1);
  eLeftG.fillCircle(18, 23, 9);
  eLeftG.fillStyle(cSclera, 1);
  eLeftG.fillCircle(18, 23, 7.5);
  eLeftG.fillStyle(cPupil, 1);
  eLeftG.fillEllipse(17, 23, 3, 7);
  eLeftG.fillStyle(0xffffff, 0.95);
  eLeftG.fillCircle(19, 21, 2);

  eLeftG.generateTexture(PREDATOR_TEXTURE_KEYS.LEFT, ew, eh);
  eLeftG.destroy();

  // ----------------------------------------------------
  // C. 斜め4方向用テクスチャ
  // ----------------------------------------------------
  // 右前 (front_right)
  const eFrontRightG = scene.make.graphics({ x: 0, y: 0 });
  eFrontRightG.fillStyle(cBioDark, 1);
  eFrontRightG.fillTriangle(20, 32, 4, 28, 16, 42);
  eFrontRightG.fillEllipse(29, 32, 32, 28);
  eFrontRightG.fillStyle(cBioMain, 1);
  eFrontRightG.fillEllipse(29, 30, 30, 26);
  eFrontRightG.fillStyle(cBioLight, 0.9);
  eFrontRightG.fillEllipse(29, 24, 24, 16);
  eFrontRightG.fillStyle(cBioDark, 1);
  eFrontRightG.fillTriangle(34, 34, 47, 40, 34, 45);
  eFrontRightG.fillStyle(cFang, 1);
  eFrontRightG.fillTriangle(41, 36, 43, 41, 45, 37);
  eFrontRightG.fillStyle(cBioDark, 1);
  eFrontRightG.fillCircle(36, 23, 9);
  eFrontRightG.fillStyle(cSclera, 1);
  eFrontRightG.fillCircle(36, 23, 7.5);
  eFrontRightG.fillStyle(cPupil, 1);
  eFrontRightG.fillEllipse(37, 23, 3.5, 7);
  eFrontRightG.fillStyle(0xffffff, 0.95);
  eFrontRightG.fillCircle(35, 21, 2);
  eFrontRightG.generateTexture(PREDATOR_TEXTURE_KEYS.FRONT_RIGHT, ew, eh);
  eFrontRightG.destroy();

  // 左前 (front_left)
  const eFrontLeftG = scene.make.graphics({ x: 0, y: 0 });
  eFrontLeftG.fillStyle(cBioDark, 1);
  eFrontLeftG.fillTriangle(36, 32, 52, 28, 40, 42);
  eFrontLeftG.fillEllipse(27, 32, 32, 28);
  eFrontLeftG.fillStyle(cBioMain, 1);
  eFrontLeftG.fillEllipse(27, 30, 30, 26);
  eFrontLeftG.fillStyle(cBioLight, 0.9);
  eFrontLeftG.fillEllipse(27, 24, 24, 16);
  eFrontLeftG.fillStyle(cBioDark, 1);
  eFrontLeftG.fillTriangle(22, 34, 9, 40, 22, 45);
  eFrontLeftG.fillStyle(cFang, 1);
  eFrontLeftG.fillTriangle(15, 36, 13, 41, 11, 37);
  eFrontLeftG.fillStyle(cBioDark, 1);
  eFrontLeftG.fillCircle(20, 23, 9);
  eFrontLeftG.fillStyle(cSclera, 1);
  eFrontLeftG.fillCircle(20, 23, 7.5);
  eFrontLeftG.fillStyle(cPupil, 1);
  eFrontLeftG.fillEllipse(19, 23, 3.5, 7);
  eFrontLeftG.fillStyle(0xffffff, 0.95);
  eFrontLeftG.fillCircle(21, 21, 2);
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

  // ----------------------------------------------------
  // D. 敵用影テクスチャ
  // ----------------------------------------------------
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
