import Phaser from "phaser";

import { EventBus } from "../EventBus";
import { addCrispText } from "../utils/text";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  // ==========================================
  // ゲーム特有の設定・カスタマイズメソッド
  // （派生ゲーム作成時はここをオーバーライドまたは編集）
  // ==========================================

  /**
   * タイトル画面のテキスト設定を取得
   */
  protected getTitleConfig() {
    return {
      title: "SPACE SHOOTER",
      titleStyle: {
        fontSize: "80px",
        fontStyle: "bold",
        color: "#38bdf8",
      },
      subTitle: "- 横画面スマホ対応シューティング -",
      subTitleStyle: {
        fontSize: "28px",
        color: "#94a3b8",
      },
    };
  }

  /**
   * タイトル画面のメニューボタン定義を取得
   */
  protected getMenuButtons() {
    return [
      {
        label: "ゲームスタート",
        color: 0x0284c7,
        yOffset: 60,
        onClick: () => this.scene.start("GameScene"),
      },
      {
        label: "設定",
        color: 0x475569,
        yOffset: 190,
        onClick: () => EventBus.emit("open-settings"),
      },
    ];
  }

  // ==========================================
  // 共通描画処理
  // ==========================================

  create() {
    const { width, height } = this.scale;

    EventBus.emit("current-scene-ready", this);

    const config = this.getTitleConfig();

    // タイトル文字
    addCrispText(this, width / 2, height / 2 - 200, config.title, config.titleStyle).setOrigin(0.5);

    // サブタイトル文字
    addCrispText(
      this,
      width / 2,
      height / 2 - 100,
      config.subTitle,
      config.subTitleStyle,
    ).setOrigin(0.5);

    // メニューボタン生成
    const buttons = this.getMenuButtons();
    for (const btn of buttons) {
      this.createButton(width / 2, height / 2 + btn.yOffset, btn.label, btn.color, btn.onClick);
    }
  }

  protected createButton(x: number, y: number, label: string, color: number, onClick: () => void) {
    const btnWidth = 440;
    const btnHeight = 90;

    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 18);

    const text = addCrispText(this, 0, 0, label, {
      fontSize: "32px",
      color: "#ffffff",
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(btnWidth, btnHeight);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => container.setScale(1.05));
    container.on("pointerout", () => container.setScale(1.0));
    container.on("pointerdown", () => container.setScale(0.95));
    container.on("pointerup", () => {
      container.setScale(1.0);
      onClick();
    });

    return container;
  }
}
