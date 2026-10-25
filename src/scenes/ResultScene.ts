import confetti from "canvas-confetti";
import Phaser from "phaser";

import { addCrispText } from "../utils/text";

export class ResultScene extends Phaser.Scene {
  protected resultType: "gameover" | "clear" = "gameover";
  protected finalScore = 0;

  constructor() {
    super("ResultScene");
  }

  // ==========================================
  // ゲーム特有のリザルト設定
  // （派生ゲーム作成時はここをオーバーライドまたは編集）
  // ==========================================

  /**
   * 結果表示テキストおよびスタイルの定義
   */
  protected getResultConfig(isClear: boolean, score: number) {
    return {
      titleText: isClear ? "STAGE CLEAR!" : "GAME OVER",
      titleColor: isClear ? "#38bdf8" : "#f43f5e",
      scoreText: `FINAL SCORE: ${score}`,
      triggerConfetti: isClear,
    };
  }

  /**
   * リザルト画面のアクションボタン一覧
   */
  protected getActionButtons() {
    return [
      {
        label: "もう一度遊ぶ",
        color: 0x0284c7,
        yOffset: 40,
        onClick: () => this.cleanupAndStart("GameScene"),
      },
      {
        label: "タイトルへ戻る",
        color: 0x475569,
        yOffset: 105,
        onClick: () => this.cleanupAndStart("TitleScene"),
      },
    ];
  }

  // ==========================================
  // 共通リザルト制御
  // ==========================================

  init(data: { result?: "gameover" | "clear"; score?: number }) {
    this.resultType = data.result ?? "gameover";
    this.finalScore = data.score ?? 0;
  }

  create() {
    const { width, height } = this.scale;
    const isClear = this.resultType === "clear";
    const config = this.getResultConfig(isClear, this.finalScore);

    // 背後にゲーム画面が見えるように半透明のオーバーレイ
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x020617, 0.8);
    backdrop.fillRect(0, 0, width, height);

    // クリア時の紙吹雪演出
    if (config.triggerConfetti) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // 例外を安全に無視
      }
    }

    // メインメッセージ
    addCrispText(this, width / 2, height / 2 - 90, config.titleText, {
      fontSize: "36px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: config.titleColor,
    }).setOrigin(0.5);

    // スコア表示
    addCrispText(this, width / 2, height / 2 - 25, config.scoreText, {
      fontSize: "20px",
      fontFamily: "monospace",
      color: "#ffffff",
    }).setOrigin(0.5);

    // ボタン生成
    const actionButtons = this.getActionButtons();
    for (const btn of actionButtons) {
      this.createButton(width / 2, height / 2 + btn.yOffset, btn.label, btn.color, btn.onClick);
    }
  }

  protected cleanupAndStart(targetScene: "GameScene" | "TitleScene") {
    this.scene.stop("ResultScene");
    this.scene.stop("UIScene");
    this.scene.stop("ControllerScene");
    this.scene.stop("GameScene");
    this.scene.start(targetScene);
  }

  protected createButton(x: number, y: number, label: string, color: number, onClick: () => void) {
    const btn = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-100, -20, 200, 40, 8);

    const txt = addCrispText(this, 0, 0, label, {
      fontSize: "15px",
      fontFamily: "sans-serif",
      color: "#ffffff",
    }).setOrigin(0.5);

    btn.add([bg, txt]);
    btn.setSize(200, 40);
    btn.setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setScale(1.04));
    btn.on("pointerout", () => btn.setScale(1.0));
    btn.on("pointerdown", () => btn.setScale(0.96));
    btn.on("pointerup", () => {
      btn.setScale(1.0);
      onClick();
    });

    return btn;
  }
}
