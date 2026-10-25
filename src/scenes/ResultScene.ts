import confetti from "canvas-confetti";
import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import {
  BUTTON_NORMAL_SCALE,
  CONFETTI_ORIGIN_Y,
  CONFETTI_PARTICLE_COUNT,
  CONFETTI_SPREAD,
  RESULT_BACKDROP_ALPHA,
  RESULT_BACKDROP_COLOR,
  RESULT_BUTTON_HEIGHT,
  RESULT_BUTTON_HOVER_SCALE,
  RESULT_BUTTON_PRESSED_SCALE,
  RESULT_BUTTON_RADIUS,
  RESULT_BUTTON_WIDTH,
  RESULT_REPLAY_BUTTON_COLOR,
  RESULT_REPLAY_BUTTON_Y_OFFSET,
  RESULT_SCORE_Y_OFFSET,
  RESULT_TITLE_BUTTON_COLOR,
  RESULT_TITLE_BUTTON_Y_OFFSET,
  RESULT_TITLE_Y_OFFSET,
} from "../constants";
import { addCrispText } from "../utils/text";

export class ResultScene extends Phaser.Scene {
  protected resultType: "gameover" | "clear" = "gameover";
  protected finalScore = 0;

  constructor() {
    super("ResultScene");
  }

  // ==========================================
  // ゲーム特有のリザルト設定 (1600x900スケール)
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
        color: RESULT_REPLAY_BUTTON_COLOR,
        yOffset: RESULT_REPLAY_BUTTON_Y_OFFSET,
        onClick: () => this.cleanupAndStart("GameScene"),
      },
      {
        label: "タイトルへ戻る",
        color: RESULT_TITLE_BUTTON_COLOR,
        yOffset: RESULT_TITLE_BUTTON_Y_OFFSET,
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
    backdrop.fillStyle(RESULT_BACKDROP_COLOR, RESULT_BACKDROP_ALPHA);
    backdrop.fillRect(0, 0, width, height);

    // クリア時の紙吹雪演出
    if (config.triggerConfetti) {
      try {
        confetti({
          particleCount: CONFETTI_PARTICLE_COUNT,
          spread: CONFETTI_SPREAD,
          origin: { y: CONFETTI_ORIGIN_Y },
        });
      } catch {
        // 例外を安全に無視
      }
    }

    // メインメッセージ
    addCrispText(this, width / 2, height / 2 - RESULT_TITLE_Y_OFFSET, config.titleText, {
      fontSize: "72px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: config.titleColor,
    }).setOrigin(0.5);

    // スコア表示
    addCrispText(this, width / 2, height / 2 - RESULT_SCORE_Y_OFFSET, config.scoreText, {
      fontSize: "40px",
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
    const btnWidth = RESULT_BUTTON_WIDTH;
    const btnHeight = RESULT_BUTTON_HEIGHT;

    const btn = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, RESULT_BUTTON_RADIUS);

    const txt = addCrispText(this, 0, 0, label, {
      fontSize: "30px",
      color: "#ffffff",
    }).setOrigin(0.5);

    btn.add([bg, txt]);
    btn.setSize(btnWidth, btnHeight);
    btn.setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setScale(RESULT_BUTTON_HOVER_SCALE));
    btn.on("pointerout", () => btn.setScale(BUTTON_NORMAL_SCALE));
    btn.on("pointerdown", () => btn.setScale(RESULT_BUTTON_PRESSED_SCALE));
    btn.on("pointerup", () => {
      btn.setScale(BUTTON_NORMAL_SCALE);
      AudioManager.getInstance().playSE("click");
      onClick();
    });

    return btn;
  }
}
