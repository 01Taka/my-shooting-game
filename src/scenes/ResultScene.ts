import confetti from "canvas-confetti";
import Phaser from "phaser";

export class ResultScene extends Phaser.Scene {
  private resultType: "gameover" | "clear" = "gameover";
  private finalScore = 0;

  constructor() {
    super("ResultScene");
  }

  init(data: { result?: "gameover" | "clear"; score?: number }) {
    this.resultType = data.result ?? "gameover";
    this.finalScore = data.score ?? 0;
  }

  create() {
    const { width, height } = this.scale;

    // 背後にゲーム画面が見えるように半透明のオーバーレイ
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x020617, 0.8);
    backdrop.fillRect(0, 0, width, height);

    const isClear = this.resultType === "clear";

    // クリア時の紙吹雪演出
    if (isClear) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // 環境による例外を安全に無視
      }
    }

    // メインメッセージ
    const titleText = isClear ? "STAGE CLEAR!" : "GAME OVER";
    const titleColor = isClear ? "#38bdf8" : "#f43f5e";

    this.add
      .text(width / 2, height / 2 - 90, titleText, {
        fontSize: "36px",
        fontFamily: "monospace",
        fontStyle: "bold",
        color: titleColor,
      })
      .setOrigin(0.5);

    // スコア表示
    this.add
      .text(width / 2, height / 2 - 25, `FINAL SCORE: ${this.finalScore}`, {
        fontSize: "20px",
        fontFamily: "monospace",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // --- ボタン: リトライ ---
    this.createButton(width / 2, height / 2 + 40, "もう一度遊ぶ", 0x0284c7, () => {
      this.cleanupAndStart("GameScene");
    });

    // --- ボタン: タイトルへ ---
    this.createButton(width / 2, height / 2 + 105, "タイトルへ戻る", 0x475569, () => {
      this.cleanupAndStart("TitleScene");
    });
  }

  private cleanupAndStart(targetScene: "GameScene" | "TitleScene") {
    this.scene.stop("ResultScene");
    this.scene.stop("UIScene");
    this.scene.stop("ControllerScene");
    this.scene.stop("GameScene");
    this.scene.start(targetScene);
  }

  private createButton(x: number, y: number, label: string, color: number, onClick: () => void) {
    const btn = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-100, -20, 200, 40, 8);

    const txt = this.add
      .text(0, 0, label, {
        fontSize: "15px",
        fontFamily: "sans-serif",
        color: "#ffffff",
      })
      .setOrigin(0.5);

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
