import Phaser from "phaser";

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
    // プレイヤー用自機グラフィック (64x64)
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x38bdf8, 1);
    playerGraphics.fillTriangle(0, 64, 32, 0, 64, 64);
    playerGraphics.generateTexture("player", 64, 64);
    playerGraphics.destroy();

    // 弾グラフィック (16x16)
    const bulletGraphics = this.make.graphics({ x: 0, y: 0 });
    bulletGraphics.fillStyle(0xfacc15, 1);
    bulletGraphics.fillCircle(8, 8, 8);
    bulletGraphics.generateTexture("bullet", 16, 16);
    bulletGraphics.destroy();

    // 敵グラフィック (56x56)
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    enemyGraphics.fillStyle(0xf43f5e, 1);
    enemyGraphics.fillRoundedRect(0, 0, 56, 56, 12);
    enemyGraphics.generateTexture("enemy", 56, 56);
    enemyGraphics.destroy();
  }

  // ==========================================
  // 共通プリロード処理（プログレスバー等）
  // ==========================================

  preload() {
    const { width, height } = this.scale;

    // タイトル・ローディングテキスト（高解像度テキスト）
    const loadingText = addCrispText(this, width / 2, height / 2 - 80, "Now Loading...", {
      fontSize: "40px",
      fontFamily: "monospace",
      color: "#ffffff",
    }).setOrigin(0.5);

    const percentText = addCrispText(this, width / 2, height / 2 + 70, "0%", {
      fontSize: "30px",
      fontFamily: "monospace",
      color: "#94a3b8",
    }).setOrigin(0.5);

    // プログレスバーの枠
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x334155, 0.8);
    progressBox.fillRoundedRect(width / 2 - 300, height / 2 - 20, 600, 40, 12);

    // プログレスバー本体
    const progressBar = this.add.graphics();

    this.load.on("progress", (value: number) => {
      percentText.setText(`${Math.floor(value * 100)}%`);
      progressBar.clear();
      progressBar.fillStyle(0x38bdf8, 1);
      progressBar.fillRoundedRect(width / 2 - 294, height / 2 - 14, 588 * value, 28, 8);
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
