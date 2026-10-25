import Phaser from "phaser";

import { EventBus } from "../EventBus";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    const { width, height } = this.scale;

    // タイトル・ローディングテキスト
    const loadingText = this.add
      .text(width / 2, height / 2 - 50, "Now Loading...", {
        fontSize: "24px",
        fontFamily: "monospace",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const percentText = this.add
      .text(width / 2, height / 2 + 40, "0%", {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#94a3b8",
      })
      .setOrigin(0.5);

    // プログレスバーの枠
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x334155, 0.8);
    progressBox.fillRoundedRect(width / 2 - 160, height / 2 - 15, 320, 30, 8);

    // プログレスバー本体
    const progressBar = this.add.graphics();

    this.load.on("progress", (value: number) => {
      percentText.setText(`${Math.floor(value * 100)}%`);
      progressBar.clear();
      progressBar.fillStyle(0x38bdf8, 1);
      progressBar.fillRoundedRect(width / 2 - 155, height / 2 - 10, 310 * value, 20, 5);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();

      // ロード完了後、TitleScene へ遷移
      this.scene.start("TitleScene");
    });

    // ここでダミーのアセットや本番用アセットをロード（ロード完了イベントを確実に発火させるため軽量なデータやタイマー）
    // 図形テクスチャの動的生成
    this.createDummyAssets();
  }

  private createDummyAssets() {
    // プレイヤー用自機グラフィック
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x38bdf8, 1);
    playerGraphics.fillTriangle(0, 32, 16, 0, 32, 32);
    playerGraphics.generateTexture("player", 32, 32);
    playerGraphics.destroy();

    // 弾グラフィック
    const bulletGraphics = this.make.graphics({ x: 0, y: 0 });
    bulletGraphics.fillStyle(0xfacc15, 1);
    bulletGraphics.fillCircle(4, 4, 4);
    bulletGraphics.generateTexture("bullet", 8, 8);
    bulletGraphics.destroy();

    // 敵グラフィック
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    enemyGraphics.fillStyle(0xf43f5e, 1);
    enemyGraphics.fillRoundedRect(0, 0, 28, 28, 6);
    enemyGraphics.generateTexture("enemy", 28, 28);
    enemyGraphics.destroy();
  }

  create() {
    EventBus.emit("current-scene-ready", this);
  }
}
