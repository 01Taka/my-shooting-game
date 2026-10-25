import Phaser from "phaser";

import { EventBus } from "../EventBus";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    const { width, height } = this.scale;

    EventBus.emit("current-scene-ready", this);

    // タイトル文字
    this.add
      .text(width / 2, height / 2 - 120, "SPACE SHOOTER", {
        fontSize: "44px",
        fontFamily: "sans-serif",
        fontStyle: "bold",
        color: "#38bdf8",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 60, "- 横画面スマホ対応シューティング -", {
        fontSize: "16px",
        fontFamily: "sans-serif",
        color: "#94a3b8",
      })
      .setOrigin(0.5);

    // 「スタート」ボタン
    this.createButton(width / 2, height / 2 + 30, "ゲームスタート", 0x0284c7, () => {
      this.scene.start("GameScene");
    });

    // 「設定」ボタン（React側の設定モーダルを開く）
    this.createButton(width / 2, height / 2 + 100, "設定", 0x475569, () => {
      EventBus.emit("open-settings");
    });
  }

  private createButton(x: number, y: number, label: string, color: number, onClick: () => void) {
    const btnWidth = 220;
    const btnHeight = 48;

    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 10);

    const text = this.add
      .text(0, 0, label, {
        fontSize: "18px",
        fontFamily: "sans-serif",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(btnWidth, btnHeight);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => {
      container.setScale(1.05);
    });

    container.on("pointerout", () => {
      container.setScale(1.0);
    });

    container.on("pointerdown", () => {
      container.setScale(0.95);
    });

    container.on("pointerup", () => {
      container.setScale(1.0);
      onClick();
    });

    return container;
  }
}
