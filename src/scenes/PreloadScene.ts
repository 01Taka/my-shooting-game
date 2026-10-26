import Phaser from "phaser";

import {
  BULLET_COLOR,
  BULLET_TEXTURE_RADIUS,
  BULLET_TEXTURE_SIZE,
  DIRT_BASE_COLOR,
  DIRT_CRACK_COUNT,
  DIRT_GRAIN_COUNT,
  DIRT_PATCH_COLORS,
  DIRT_PATCH_COUNT,
  DIRT_PEBBLE_COLORS,
  DIRT_PEBBLE_COUNT,
  ENEMY_TEXTURE_SIZE,
  GROUND_TEXTURE_SIZE,
  PLAYER_TEXTURE_SIZE,
  PRELOAD_BAR_COLOR,
  PRELOAD_BAR_HEIGHT,
  PRELOAD_BAR_RADIUS,
  PRELOAD_BAR_WIDTH,
  PRELOAD_BOX_ALPHA,
  PRELOAD_BOX_COLOR,
  PRELOAD_BOX_HEIGHT,
  PRELOAD_BOX_RADIUS,
  PRELOAD_BOX_WIDTH,
  PRELOAD_LOADING_TEXT_Y_OFFSET,
  PRELOAD_PERCENT_TEXT_Y_OFFSET,
  SHADOW_COLOR,
} from "../constants";
import { EventBus } from "../EventBus";
import { addCrispText } from "../utils/text";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  // ==========================================
  // ゲーム特有のアセット読み込み・生成メソッド
  // （派生ゲーム作成時はここをオーバーライドまたは編集）
  // ==========================================

  /**
   * ゲームで使用する個別アセット（画像・音声・テクスチャ等）の読み込み・生成
   */
  protected loadCustomAssets() {
    // 外部ファイル読み込み例:
    // this.load.image("background", "assets/bg.png");
    // this.load.audio("laser", "assets/laser.mp3");

    // 動的テクスチャ生成
    this.createDummyAssets();
  }

  /**
   * 動的テクスチャの生成（土の地面、立体的な2.5Dプレイヤー/敵、影テクスチャ等）
   */
  protected createDummyAssets() {
    // ----------------------------------------------------
    // 1. シルエット重視のスタイリッシュな魔法使いプレイヤー
    // （少数の大きなシェイプ：ウィザードハット、なびくローブ、鋭い発光アイ、魔導スタッフ＆オーブ）
    // ----------------------------------------------------
    const pw = PLAYER_TEXTURE_SIZE;
    const ph = PLAYER_TEXTURE_SIZE;

    // パレット（深遠なローブと輝く魔力光）
    const cRobeDark = 0x111827; // ディープミッドナイト
    const cRobeMain = 0x1e1b4b; // 魔導ダークパープル
    const cRobeTrim = 0x4338ca; // ローブの縁取り
    const cMagicCyan = 0x38bdf8; // 発光魔力
    const cMagicCore = 0xffffff; // オーブの中心核
    const cStaff = 0x475569; // 杖の木軸

    // A. 魔法使い 右向き (player_right) - メイン2枚スプライト
    const pRightG = this.make.graphics({ x: 0, y: 0 });
    // 1. なびくマント/ローブ裾（後方・左へ流れる大きなシルエット）
    pRightG.fillStyle(cRobeDark, 1);
    pRightG.fillTriangle(30, 26, 12, ph - 10, 36, ph - 8);
    pRightG.fillStyle(cRobeMain, 1);
    pRightG.fillTriangle(32, 28, 16, ph - 12, 38, ph - 8);
    pRightG.fillStyle(cRobeTrim, 0.85);
    pRightG.fillTriangle(32, 36, 16, ph - 12, 24, ph - 10);

    // 2. 前方に突き出した魔導スタッフ（杖）
    pRightG.lineStyle(3, cStaff, 1);
    pRightG.lineBetween(28, 38, 48, 26);
    // 杖先端の浮遊マジックオーブ（光彩グロー ＋ 高輝度コア）
    pRightG.fillStyle(cMagicCyan, 0.45);
    pRightG.fillCircle(50, 24, 8);
    pRightG.fillStyle(cMagicCyan, 0.95);
    pRightG.fillCircle(50, 24, 5);
    pRightG.fillStyle(cMagicCore, 1);
    pRightG.fillCircle(49, 23, 2.5);

    // 3. 胴体・腕（ローブの袖）
    pRightG.fillStyle(cRobeMain, 1);
    pRightG.fillRoundedRect(24, 26, 14, 18, 4);
    pRightG.fillStyle(cRobeTrim, 1);
    pRightG.fillTriangle(26, 32, 36, 34, 30, 42);

    // 4. 顔の深影 ＋ 鋭く光る瞳（バイザーアイ）
    pRightG.fillStyle(0x030712, 1);
    pRightG.fillCircle(31, 20, 7.5);
    pRightG.fillStyle(cMagicCyan, 1);
    pRightG.fillEllipse(34, 20, 5, 2.5); // 右を見据える鋭い光
    pRightG.fillStyle(cMagicCore, 1);
    pRightG.fillEllipse(35, 20, 2.5, 1.5);

    // 5. 象徴的なウィザードハット（つば ＋ 曲がった尖り三角コーン）
    // つば（広いつば）
    pRightG.fillStyle(cRobeDark, 1);
    pRightG.fillEllipse(30, 18, 26, 7);
    pRightG.fillStyle(cRobeMain, 1);
    pRightG.fillEllipse(30, 17, 24, 5.5);
    // 尖り帽子本体（右上にクイッと曲がった格好いいシルエット）
    pRightG.fillStyle(cRobeDark, 1);
    pRightG.fillTriangle(21, 17, 39, 17, 34, 2);
    pRightG.fillStyle(cRobeMain, 1);
    pRightG.fillTriangle(23, 17, 37, 17, 33, 3);
    // 帽子のリボンバンド（シアン発光ライン）
    pRightG.fillStyle(cMagicCyan, 0.95);
    pRightG.fillRect(24, 15, 13, 2.5);

    pRightG.generateTexture("player_right", pw, ph);
    pRightG.generateTexture("player", pw, ph); // デフォルト
    pRightG.destroy();

    // B. 魔法使い 左向き (player_left) - メイン2枚スプライト
    const pLeftG = this.make.graphics({ x: 0, y: 0 });
    // 1. なびくマント/ローブ裾（後方・右へ流れる大きなシルエット）
    pLeftG.fillStyle(cRobeDark, 1);
    pLeftG.fillTriangle(34, 26, 52, ph - 10, 28, ph - 8);
    pLeftG.fillStyle(cRobeMain, 1);
    pLeftG.fillTriangle(32, 28, 48, ph - 12, 26, ph - 8);
    pLeftG.fillStyle(cRobeTrim, 0.85);
    pLeftG.fillTriangle(32, 36, 48, ph - 12, 40, ph - 10);

    // 2. 左前方に突き出した魔導スタッフ（杖）
    pLeftG.lineStyle(3, cStaff, 1);
    pLeftG.lineBetween(36, 38, 16, 26);
    // 杖先端の浮遊マジックオーブ
    pLeftG.fillStyle(cMagicCyan, 0.45);
    pLeftG.fillCircle(14, 24, 8);
    pLeftG.fillStyle(cMagicCyan, 0.95);
    pLeftG.fillCircle(14, 24, 5);
    pLeftG.fillStyle(cMagicCore, 1);
    pLeftG.fillCircle(15, 23, 2.5);

    // 3. 胴体・腕（ローブの袖）
    pLeftG.fillStyle(cRobeMain, 1);
    pLeftG.fillRoundedRect(26, 26, 14, 18, 4);
    pLeftG.fillStyle(cRobeTrim, 1);
    pLeftG.fillTriangle(38, 32, 28, 34, 34, 42);

    // 4. 顔の深影 ＋ 鋭く光る瞳
    pLeftG.fillStyle(0x030712, 1);
    pLeftG.fillCircle(33, 20, 7.5);
    pLeftG.fillStyle(cMagicCyan, 1);
    pLeftG.fillEllipse(30, 20, 5, 2.5); // 左を見据える鋭い光
    pLeftG.fillStyle(cMagicCore, 1);
    pLeftG.fillEllipse(29, 20, 2.5, 1.5);

    // 5. 象徴的なウィザードハット
    pLeftG.fillStyle(cRobeDark, 1);
    pLeftG.fillEllipse(34, 18, 26, 7);
    pLeftG.fillStyle(cRobeMain, 1);
    pLeftG.fillEllipse(34, 17, 24, 5.5);
    pLeftG.fillStyle(cRobeDark, 1);
    pLeftG.fillTriangle(43, 17, 25, 17, 30, 2);
    pLeftG.fillStyle(cRobeMain, 1);
    pLeftG.fillTriangle(41, 17, 27, 17, 31, 3);
    pLeftG.fillStyle(cMagicCyan, 0.95);
    pLeftG.fillRect(27, 15, 13, 2.5);

    pLeftG.generateTexture("player_left", pw, ph);
    pLeftG.destroy();

    // C. 斜め4方向用テクスチャ（魔法使いシルエットの互換アセット）
    // 右前 (front_right)
    const pFrontRightG = this.make.graphics({ x: 0, y: 0 });
    pFrontRightG.fillStyle(cRobeDark, 1);
    pFrontRightG.fillTriangle(30, 26, 14, ph - 10, 38, ph - 8);
    pFrontRightG.fillStyle(cRobeMain, 1);
    pFrontRightG.fillTriangle(32, 28, 18, ph - 12, 40, ph - 8);
    pFrontRightG.lineStyle(3, cStaff, 1);
    pFrontRightG.lineBetween(30, 36, 50, 30);
    pFrontRightG.fillStyle(cMagicCyan, 0.45);
    pFrontRightG.fillCircle(52, 28, 8);
    pFrontRightG.fillStyle(cMagicCyan, 0.95);
    pFrontRightG.fillCircle(52, 28, 5);
    pFrontRightG.fillStyle(cMagicCore, 1);
    pFrontRightG.fillCircle(51, 27, 2.5);
    pFrontRightG.fillStyle(cRobeMain, 1);
    pFrontRightG.fillRoundedRect(24, 26, 16, 20, 4);
    pFrontRightG.fillStyle(0x030712, 1);
    pFrontRightG.fillCircle(32, 20, 7.5);
    pFrontRightG.fillStyle(cMagicCyan, 1);
    pFrontRightG.fillEllipse(35, 20, 5, 2.5);
    pFrontRightG.fillStyle(cRobeDark, 1);
    pFrontRightG.fillEllipse(31, 18, 28, 7.5);
    pFrontRightG.fillStyle(cRobeMain, 1);
    pFrontRightG.fillEllipse(31, 17, 26, 6);
    pFrontRightG.fillStyle(cRobeDark, 1);
    pFrontRightG.fillTriangle(22, 17, 40, 17, 36, 2);
    pFrontRightG.fillStyle(cMagicCyan, 0.95);
    pFrontRightG.fillRect(25, 15, 14, 2.5);
    pFrontRightG.generateTexture("player_front_right", pw, ph);
    pFrontRightG.destroy();

    // 左前 (front_left)
    const pFrontLeftG = this.make.graphics({ x: 0, y: 0 });
    pFrontLeftG.fillStyle(cRobeDark, 1);
    pFrontLeftG.fillTriangle(34, 26, 50, ph - 10, 26, ph - 8);
    pFrontLeftG.fillStyle(cRobeMain, 1);
    pFrontLeftG.fillTriangle(32, 28, 46, ph - 12, 24, ph - 8);
    pFrontLeftG.lineStyle(3, cStaff, 1);
    pFrontLeftG.lineBetween(34, 36, 14, 30);
    pFrontLeftG.fillStyle(cMagicCyan, 0.45);
    pFrontLeftG.fillCircle(12, 28, 8);
    pFrontLeftG.fillStyle(cMagicCyan, 0.95);
    pFrontLeftG.fillCircle(12, 28, 5);
    pFrontLeftG.fillStyle(cMagicCore, 1);
    pFrontLeftG.fillCircle(13, 27, 2.5);
    pFrontLeftG.fillStyle(cRobeMain, 1);
    pFrontLeftG.fillRoundedRect(24, 26, 16, 20, 4);
    pFrontLeftG.fillStyle(0x030712, 1);
    pFrontLeftG.fillCircle(32, 20, 7.5);
    pFrontLeftG.fillStyle(cMagicCyan, 1);
    pFrontLeftG.fillEllipse(29, 20, 5, 2.5);
    pFrontLeftG.fillStyle(cRobeDark, 1);
    pFrontLeftG.fillEllipse(33, 18, 28, 7.5);
    pFrontLeftG.fillStyle(cRobeMain, 1);
    pFrontLeftG.fillEllipse(33, 17, 26, 6);
    pFrontLeftG.fillStyle(cRobeDark, 1);
    pFrontLeftG.fillTriangle(42, 17, 24, 17, 28, 2);
    pFrontLeftG.fillStyle(cMagicCyan, 0.95);
    pFrontLeftG.fillRect(25, 15, 14, 2.5);
    pFrontLeftG.generateTexture("player_front_left", pw, ph);
    pFrontLeftG.destroy();

    // 右後ろ (back_right)
    const pBackRightG = this.make.graphics({ x: 0, y: 0 });
    pBackRightG.fillStyle(cRobeDark, 1);
    pBackRightG.fillTriangle(26, 26, 12, ph - 10, 36, ph - 8);
    pBackRightG.fillStyle(cRobeMain, 1);
    pBackRightG.fillRoundedRect(24, 24, 16, 22, 5);
    pBackRightG.lineStyle(3, cStaff, 1);
    pBackRightG.lineBetween(32, 32, 48, 16);
    pFrontRightG.fillStyle(cMagicCyan, 0.95);
    pBackRightG.fillCircle(50, 14, 5);
    pBackRightG.fillStyle(cRobeDark, 1);
    pBackRightG.fillEllipse(30, 16, 26, 7);
    pBackRightG.fillTriangle(21, 16, 39, 16, 35, 2);
    pBackRightG.generateTexture("player_back_right", pw, ph);
    pBackRightG.destroy();

    // 左後ろ (back_left)
    const pBackLeftG = this.make.graphics({ x: 0, y: 0 });
    pBackLeftG.fillStyle(cRobeDark, 1);
    pBackLeftG.fillTriangle(38, 26, 52, ph - 10, 28, ph - 8);
    pBackLeftG.fillStyle(cRobeMain, 1);
    pBackLeftG.fillRoundedRect(24, 24, 16, 22, 5);
    pBackLeftG.lineStyle(3, cStaff, 1);
    pBackLeftG.lineBetween(32, 32, 16, 16);
    pBackLeftG.fillStyle(cMagicCyan, 0.95);
    pBackLeftG.fillCircle(14, 14, 5);
    pBackLeftG.fillStyle(cRobeDark, 1);
    pBackLeftG.fillEllipse(34, 16, 26, 7);
    pBackLeftG.fillTriangle(43, 16, 25, 16, 29, 2);
    pBackLeftG.generateTexture("player_back_left", pw, ph);
    pBackLeftG.destroy();

    // ----------------------------------------------------
    // 2. プレイヤー用影テクスチャ（足元に落ちるソフトシャドウ）
    // ----------------------------------------------------
    const playerShadowGraphics = this.make.graphics({ x: 0, y: 0 });
    playerShadowGraphics.fillStyle(SHADOW_COLOR, 0.25);
    playerShadowGraphics.fillEllipse(pw / 2, ph / 2, pw * 0.75, ph * 0.36);
    playerShadowGraphics.fillStyle(SHADOW_COLOR, 0.55);
    playerShadowGraphics.fillEllipse(pw / 2, ph / 2, pw * 0.52, ph * 0.22);
    playerShadowGraphics.generateTexture("player_shadow", pw, ph);
    playerShadowGraphics.destroy();

    // ----------------------------------------------------
    // 3. 弾グラフィック
    // ----------------------------------------------------
    const bulletGraphics = this.make.graphics({ x: 0, y: 0 });
    bulletGraphics.fillStyle(BULLET_COLOR, 0.5);
    bulletGraphics.fillCircle(BULLET_TEXTURE_RADIUS, BULLET_TEXTURE_RADIUS, BULLET_TEXTURE_RADIUS);
    bulletGraphics.fillStyle(0xffffff, 0.95);
    bulletGraphics.fillCircle(
      BULLET_TEXTURE_RADIUS,
      BULLET_TEXTURE_RADIUS,
      BULLET_TEXTURE_RADIUS * 0.5,
    );
    bulletGraphics.generateTexture("bullet", BULLET_TEXTURE_SIZE, BULLET_TEXTURE_SIZE);
    bulletGraphics.destroy();

    // ----------------------------------------------------
    // 4. 生物クリーチャー敵グラフィック（有機的フォルム、生きた爬虫類アイ、牙、触手尾）
    // ----------------------------------------------------
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

    // A. 生物敵 右向き (enemy_right) - メイン2枚スプライト
    const eRightG = this.make.graphics({ x: 0, y: 0 });
    // しなる尾/触手（後方・左へ伸びる）
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

    // 肉体メインボディ（有機的な前傾ティアドロップ形状）
    eRightG.fillStyle(cBioDark, 1);
    eRightG.fillEllipse(30, 32, 32, 28);
    eRightG.fillStyle(cBioMain, 1);
    eRightG.fillEllipse(31, 30, 30, 26);
    // 上面筋肉ハイライト
    eRightG.fillStyle(cBioLight, 0.9);
    eRightG.fillEllipse(31, 24, 24, 16);
    // 腹部（下部の淡い肉色）
    eRightG.fillStyle(cBioBelly, 0.85);
    eRightG.fillEllipse(32, 38, 20, 10);

    // 獰猛な口と牙（右前方に開く）
    eRightG.fillStyle(0x1a0505, 1);
    eRightG.fillTriangle(34, 34, 48, 38, 34, 44);
    // 白い上牙・下牙
    eRightG.fillStyle(cFang, 1);
    eRightG.fillTriangle(41, 35, 43, 39, 44, 35);
    eRightG.fillTriangle(45, 36, 47, 40, 48, 36);
    eRightG.fillTriangle(39, 43, 41, 39, 43, 43);

    // 生きた眼球（黄色い白眼 ＋ 縦長スリット瞳孔 ＋ 光沢ハイライト）
    eRightG.fillStyle(cBioDark, 1);
    eRightG.fillCircle(38, 23, 9); // まぶた
    eRightG.fillStyle(cSclera, 1);
    eRightG.fillCircle(38, 23, 7.5); // 黄色い眼球
    eRightG.fillStyle(cPupil, 1);
    eRightG.fillEllipse(39, 23, 3, 7); // 鋭い黒の縦スリット瞳孔
    eRightG.fillStyle(0xffffff, 0.95);
    eRightG.fillCircle(37, 21, 2); // 瞳の光彩反射

    eRightG.generateTexture("enemy_right", ew, eh);
    eRightG.generateTexture("enemy", ew, eh); // デフォルト
    eRightG.destroy();

    // B. 生物敵 左向き (enemy_left) - メイン2枚スプライト
    const eLeftG = this.make.graphics({ x: 0, y: 0 });
    // しなる尾/触手（後方・右へ伸びる）
    eLeftG.fillStyle(cBioDark, 1);
    eLeftG.fillTriangle(38, 30, 54, 24, 40, 40);
    eLeftG.fillStyle(cBioMain, 1);
    eLeftG.fillTriangle(36, 32, 50, 26, 38, 38);

    // 背中の骨棘
    eLeftG.fillStyle(cBioDark, 1);
    eLeftG.fillTriangle(38, 18, 42, 8, 30, 16);
    eLeftG.fillStyle(cSclera, 0.9);
    eLeftG.fillTriangle(37, 17, 40, 10, 31, 16);
    eLeftG.fillStyle(cBioDark, 1);
    eLeftG.fillTriangle(28, 14, 30, 6, 20, 14);

    // 肉体メインボディ
    eLeftG.fillStyle(cBioDark, 1);
    eLeftG.fillEllipse(26, 32, 32, 28);
    eLeftG.fillStyle(cBioMain, 1);
    eLeftG.fillEllipse(25, 30, 30, 26);
    // 上面筋肉ハイライト
    eLeftG.fillStyle(cBioLight, 0.9);
    eLeftG.fillEllipse(25, 24, 24, 16);
    // 腹部
    eLeftG.fillStyle(cBioBelly, 0.85);
    eLeftG.fillEllipse(24, 38, 20, 10);

    // 獰猛な口と牙（左前方に開く）
    eLeftG.fillStyle(0x1a0505, 1);
    eLeftG.fillTriangle(22, 34, 8, 38, 22, 44);
    // 白い上牙・下牙
    eLeftG.fillStyle(cFang, 1);
    eLeftG.fillTriangle(15, 35, 13, 39, 12, 35);
    eLeftG.fillTriangle(11, 36, 9, 40, 8, 36);
    eLeftG.fillTriangle(17, 43, 15, 39, 13, 43);

    // 生きた眼球（黄色い白眼 ＋ 縦長スリット瞳孔）
    eLeftG.fillStyle(cBioDark, 1);
    eLeftG.fillCircle(18, 23, 9);
    eLeftG.fillStyle(cSclera, 1);
    eLeftG.fillCircle(18, 23, 7.5);
    eLeftG.fillStyle(cPupil, 1);
    eLeftG.fillEllipse(17, 23, 3, 7);
    eLeftG.fillStyle(0xffffff, 0.95);
    eLeftG.fillCircle(19, 21, 2);

    eLeftG.generateTexture("enemy_left", ew, eh);
    eLeftG.destroy();

    // C. 斜め4方向用テクスチャ（生物クリーチャーの互換アセット）
    // 右前 (front_right)
    const eFrontRightG = this.make.graphics({ x: 0, y: 0 });
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
    eFrontRightG.generateTexture("enemy_front_right", ew, eh);
    eFrontRightG.destroy();

    // 左前 (front_left)
    const eFrontLeftG = this.make.graphics({ x: 0, y: 0 });
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
    eFrontLeftG.generateTexture("enemy_front_left", ew, eh);
    eFrontLeftG.destroy();

    // 右後ろ (back_right)
    const eBackRightG = this.make.graphics({ x: 0, y: 0 });
    eBackRightG.fillStyle(cBioDark, 1);
    eBackRightG.fillEllipse(28, 30, 32, 28);
    eBackRightG.fillTriangle(20, 18, 16, 6, 28, 14);
    eBackRightG.fillTriangle(30, 16, 32, 4, 38, 16);
    eBackRightG.fillStyle(cBioMain, 1);
    eBackRightG.fillEllipse(28, 28, 30, 26);
    eBackRightG.fillStyle(cBioLight, 0.85);
    eBackRightG.fillEllipse(30, 24, 24, 16);
    eBackRightG.generateTexture("enemy_back_right", ew, eh);
    eBackRightG.destroy();

    // 左後ろ (back_left)
    const eBackLeftG = this.make.graphics({ x: 0, y: 0 });
    eBackLeftG.fillStyle(cBioDark, 1);
    eBackLeftG.fillEllipse(28, 30, 32, 28);
    eBackLeftG.fillTriangle(36, 18, 40, 6, 28, 14);
    eBackLeftG.fillTriangle(26, 16, 24, 4, 18, 16);
    eBackLeftG.fillStyle(cBioMain, 1);
    eBackLeftG.fillEllipse(28, 28, 30, 26);
    eBackLeftG.fillStyle(cBioLight, 0.85);
    eBackLeftG.fillEllipse(26, 24, 24, 16);
    eBackLeftG.generateTexture("enemy_back_left", ew, eh);
    eBackLeftG.destroy();

    // ----------------------------------------------------
    // 5. 敵用影テクスチャ（扁平ソフトドロップシャドウ）
    // ----------------------------------------------------
    const enemyShadowGraphics = this.make.graphics({ x: 0, y: 0 });
    // 外側のソフトフェード
    enemyShadowGraphics.fillStyle(SHADOW_COLOR, 0.25);
    enemyShadowGraphics.fillEllipse(ew / 2, eh / 2, ew * 0.82, eh * 0.44);
    // 内側の濃い影
    enemyShadowGraphics.fillStyle(SHADOW_COLOR, 0.55);
    enemyShadowGraphics.fillEllipse(ew / 2, eh / 2, ew * 0.62, eh * 0.3);
    enemyShadowGraphics.generateTexture("enemy_shadow", ew, eh);
    enemyShadowGraphics.destroy();
    enemyShadowGraphics.destroy();

    // ----------------------------------------------------
    // 6. プロシージャル土の地面テクスチャ（シームレスタイリング）
    // ----------------------------------------------------
    const groundGraphics = this.make.graphics({ x: 0, y: 0 });
    const gSize = GROUND_TEXTURE_SIZE;

    // ベースの土褐色
    groundGraphics.fillStyle(DIRT_BASE_COLOR, 1);
    groundGraphics.fillRect(0, 0, gSize, gSize);

    // シームレス描画ヘルパー（境界をまたぐ場合は反対側にも描画）
    const drawSeamlessCircle = (
      gx: number,
      gy: number,
      radiusX: number,
      radiusY: number,
      color: number,
      alpha: number,
    ) => {
      groundGraphics.fillStyle(color, alpha);
      for (const ox of [0, -gSize, gSize]) {
        for (const oy of [0, -gSize, gSize]) {
          const cx = gx + ox;
          const cy = gy + oy;
          if (
            cx + radiusX >= 0 &&
            cx - radiusX <= gSize &&
            cy + radiusY >= 0 &&
            cy - radiusY <= gSize
          ) {
            groundGraphics.fillEllipse(cx, cy, radiusX * 2, radiusY * 2);
          }
        }
      }
    };

    // A. 土壌の濃淡パッチ（大きな土のムラ・斑点）
    for (let i = 0; i < DIRT_PATCH_COUNT; i++) {
      const px = Phaser.Math.Between(0, gSize);
      const py = Phaser.Math.Between(0, gSize);
      const rx = Phaser.Math.Between(35, 90);
      const ry = Phaser.Math.Between(25, 70);
      const patchColor = Phaser.Math.RND.pick(DIRT_PATCH_COLORS);
      const alpha = Phaser.Math.RND.realInRange(0.2, 0.45);
      drawSeamlessCircle(px, py, rx, ry, patchColor, alpha);
    }

    // B. 大地の微細なひび割れ（クラック）
    groundGraphics.lineStyle(1.5, 0x24160c, 0.5);
    for (let c = 0; c < DIRT_CRACK_COUNT; c++) {
      let cx = Phaser.Math.Between(40, gSize - 40);
      let cy = Phaser.Math.Between(40, gSize - 40);
      const segments = Phaser.Math.Between(3, 6);
      for (let s = 0; s < segments; s++) {
        const ncx = cx + Phaser.Math.Between(-18, 18);
        const ncy = cy + Phaser.Math.Between(-14, 18);
        groundGraphics.strokeLineShape(new Phaser.Geom.Line(cx, cy, ncx, ncy));
        cx = ncx;
        cy = ncy;
      }
    }

    // C. 小石・砂利（立体的な陰影付きのリアルな石）
    for (let p = 0; p < DIRT_PEBBLE_COUNT; p++) {
      const pebbleX = Phaser.Math.Between(0, gSize);
      const pebbleY = Phaser.Math.Between(0, gSize);
      const pebbleSize = Phaser.Math.Between(2, 6);
      const pebbleColor = Phaser.Math.RND.pick(DIRT_PEBBLE_COLORS);

      // 石の足元の影（斜め右下）
      groundGraphics.fillStyle(0x1a0f07, 0.6);
      groundGraphics.fillCircle(pebbleX + 1, pebbleY + 1.5, pebbleSize);

      // 石本体
      groundGraphics.fillStyle(pebbleColor, 0.95);
      groundGraphics.fillCircle(pebbleX, pebbleY, pebbleSize);

      // 石の上面ハイライト（左上）
      groundGraphics.fillStyle(0xd5b895, 0.4);
      groundGraphics.fillCircle(pebbleX - 0.7, pebbleY - 0.7, Math.max(1, pebbleSize * 0.4));
    }

    // D. 砂粒・テクスチャ微細ノイズ（質感を高める）
    for (let g = 0; g < DIRT_GRAIN_COUNT; g++) {
      const gx = Phaser.Math.Between(0, gSize);
      const gy = Phaser.Math.Between(0, gSize);
      const isLight = Math.random() > 0.5;
      const grainColor = isLight ? 0x9c7a59 : 0x23150b;
      const grainAlpha = Phaser.Math.RND.realInRange(0.2, 0.55);
      groundGraphics.fillStyle(grainColor, grainAlpha);
      groundGraphics.fillPoint(gx, gy, Phaser.Math.Between(1, 2));
    }

    groundGraphics.generateTexture("ground", gSize, gSize);
    // 後方互換のため "starfield" キーとしても登録
    groundGraphics.generateTexture("starfield", gSize, gSize);
    groundGraphics.destroy();
  }

  // ==========================================
  // 共通プリロード処理（プログレスバー等）
  // ==========================================

  preload() {
    const { width, height } = this.scale;

    // タイトル・ローディングテキスト（高解像度テキスト）
    const loadingText = addCrispText(
      this,
      width / 2,
      height / 2 - PRELOAD_LOADING_TEXT_Y_OFFSET,
      "Now Loading...",
      {
        fontSize: "40px",
        fontFamily: "monospace",
        color: "#ffffff",
      },
    ).setOrigin(0.5);

    const percentText = addCrispText(
      this,
      width / 2,
      height / 2 + PRELOAD_PERCENT_TEXT_Y_OFFSET,
      "0%",
      {
        fontSize: "30px",
        fontFamily: "monospace",
        color: "#94a3b8",
      },
    ).setOrigin(0.5);

    // プログレスバーの枠
    const progressBox = this.add.graphics();
    progressBox.fillStyle(PRELOAD_BOX_COLOR, PRELOAD_BOX_ALPHA);
    progressBox.fillRoundedRect(
      width / 2 - PRELOAD_BOX_WIDTH / 2,
      height / 2 - PRELOAD_BOX_HEIGHT / 2,
      PRELOAD_BOX_WIDTH,
      PRELOAD_BOX_HEIGHT,
      PRELOAD_BOX_RADIUS,
    );

    // プログレスバー本体
    const progressBar = this.add.graphics();

    this.load.on("progress", (value: number) => {
      percentText.setText(`${Math.floor(value * 100)}%`);
      progressBar.clear();
      progressBar.fillStyle(PRELOAD_BAR_COLOR, 1);
      progressBar.fillRoundedRect(
        width / 2 - PRELOAD_BAR_WIDTH / 2,
        height / 2 - PRELOAD_BAR_HEIGHT / 2,
        PRELOAD_BAR_WIDTH * value,
        PRELOAD_BAR_HEIGHT,
        PRELOAD_BAR_RADIUS,
      );
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();

      // ロード完了後、TitleScene へ遷移
      this.scene.start("TitleScene");
    });

    // ゲーム特有のアセット読み込みを実行
    this.loadCustomAssets();
  }

  create() {
    EventBus.emit("current-scene-ready", this);
  }
}
