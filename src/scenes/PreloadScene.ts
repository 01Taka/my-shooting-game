import Phaser from "phaser";

import {
  BULLET_COLOR,
  BULLET_TEXTURE_RADIUS,
  BULLET_TEXTURE_SIZE,
  ENEMY_COLOR,
  ENEMY_TEXTURE_RADIUS,
  ENEMY_TEXTURE_SIZE,
  PLAYER_COLOR,
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
  STAR_ALPHA_MAX,
  STAR_ALPHA_MIN,
  STAR_COLORS,
  STAR_RADIUS_MAX,
  STAR_RADIUS_MIN,
  STARFIELD_BG_COLOR,
  STARFIELD_GRID_ALPHA,
  STARFIELD_GRID_COLOR,
  STARFIELD_GRID_WIDTH,
  STARFIELD_STAR_COUNT,
  STARFIELD_TEXTURE_SIZE,
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
   * 動的テクスチャの生成（1600x900の高解像度に合わせて2倍サイズで生成）
   */
  protected createDummyAssets() {
    // プレイヤー用自機グラフィック
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(PLAYER_COLOR, 1);
    playerGraphics.fillTriangle(
      0,
      PLAYER_TEXTURE_SIZE,
      PLAYER_TEXTURE_SIZE / 2,
      0,
      PLAYER_TEXTURE_SIZE,
      PLAYER_TEXTURE_SIZE,
    );
    playerGraphics.generateTexture("player", PLAYER_TEXTURE_SIZE, PLAYER_TEXTURE_SIZE);
    playerGraphics.destroy();

    // 弾グラフィック
    const bulletGraphics = this.make.graphics({ x: 0, y: 0 });
    bulletGraphics.fillStyle(BULLET_COLOR, 1);
    bulletGraphics.fillCircle(BULLET_TEXTURE_RADIUS, BULLET_TEXTURE_RADIUS, BULLET_TEXTURE_RADIUS);
    bulletGraphics.generateTexture("bullet", BULLET_TEXTURE_SIZE, BULLET_TEXTURE_SIZE);
    bulletGraphics.destroy();

    // 敵グラフィック
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    enemyGraphics.fillStyle(ENEMY_COLOR, 1);
    enemyGraphics.fillRoundedRect(
      0,
      0,
      ENEMY_TEXTURE_SIZE,
      ENEMY_TEXTURE_SIZE,
      ENEMY_TEXTURE_RADIUS,
    );
    enemyGraphics.generateTexture("enemy", ENEMY_TEXTURE_SIZE, ENEMY_TEXTURE_SIZE);
    enemyGraphics.destroy();

    // 宇宙空間背景用スターフィールドテクスチャ
    const starGraphics = this.make.graphics({ x: 0, y: 0 });
    // 暗い宇宙のベース
    starGraphics.fillStyle(STARFIELD_BG_COLOR, 1);
    starGraphics.fillRect(0, 0, STARFIELD_TEXTURE_SIZE, STARFIELD_TEXTURE_SIZE);
    // ランダムな星々の配置
    for (let i = 0; i < STARFIELD_STAR_COUNT; i++) {
      const starX = Phaser.Math.Between(0, STARFIELD_TEXTURE_SIZE);
      const starY = Phaser.Math.Between(0, STARFIELD_TEXTURE_SIZE);
      const starRadius = Phaser.Math.RND.realInRange(STAR_RADIUS_MIN, STAR_RADIUS_MAX);
      const alpha = Phaser.Math.RND.realInRange(STAR_ALPHA_MIN, STAR_ALPHA_MAX);
      const color = Phaser.Math.RND.pick(STAR_COLORS);

      starGraphics.fillStyle(color, alpha);
      starGraphics.fillCircle(starX, starY, starRadius);
    }
    // うっすらとしたグリッドガイド線
    starGraphics.lineStyle(STARFIELD_GRID_WIDTH, STARFIELD_GRID_COLOR, STARFIELD_GRID_ALPHA);
    starGraphics.strokeRect(0, 0, STARFIELD_TEXTURE_SIZE, STARFIELD_TEXTURE_SIZE);
    starGraphics.generateTexture("starfield", STARFIELD_TEXTURE_SIZE, STARFIELD_TEXTURE_SIZE);
    starGraphics.destroy();
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
