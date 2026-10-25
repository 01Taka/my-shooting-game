import Phaser from "phaser";

import { EventBus } from "../EventBus";

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private pauseMenuContainer!: Phaser.GameObjects.Container;
  private isPaused = false;
  private hp = 100;
  private maxHp = 100;

  constructor() {
    super("UIScene");
  }

  init(data: { hp?: number; maxHp?: number; score?: number }) {
    this.hp = data.hp ?? 100;
    this.maxHp = data.maxHp ?? 100;
    this.isPaused = false;
  }

  create() {
    const { width, height } = this.scale;

    // --- HPバー表示（左上） ---
    this.add.text(20, 16, "HP", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#94a3b8",
    });

    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x334155, 0.8);
    hpBg.fillRoundedRect(50, 16, 120, 16, 4);

    this.hpBarFill = this.add.graphics();
    this.hpText = this.add.text(178, 16, `${this.hp}/${this.maxHp}`, {
      fontSize: "12px",
      fontFamily: "monospace",
      color: "#e2e8f0",
    });
    this.updateHpBar(this.hp);

    // --- スコア表示（中央上） ---
    this.scoreText = this.add
      .text(width / 2, 24, "SCORE: 00000", {
        fontSize: "18px",
        fontFamily: "monospace",
        fontStyle: "bold",
        color: "#f8fafc",
      })
      .setOrigin(0.5);

    // --- ポーズボタン（右上） ---
    const pauseBtn = this.add
      .text(width - 20, 24, "II ポーズ", {
        fontSize: "14px",
        fontFamily: "sans-serif",
        backgroundColor: "#1e293b",
        padding: { x: 10, y: 6 },
        color: "#ffffff",
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    pauseBtn.on("pointerdown", () => this.togglePause());

    // --- ポーズメニュー（初期非表示） ---
    this.createPauseMenu(width, height);

    // イベント購読
    const onScoreUpdate = (newScore: number) => {
      this.scoreText.setText(`SCORE: ${String(newScore).padStart(5, "0")}`);
    };

    const onHpUpdate = (newHp: number) => {
      this.updateHpBar(newHp);
    };

    EventBus.on("score-updated", onScoreUpdate);
    EventBus.on("hp-updated", onHpUpdate);

    this.events.on("shutdown", () => {
      EventBus.off("score-updated", onScoreUpdate);
      EventBus.off("hp-updated", onHpUpdate);
    });
  }

  private updateHpBar(currentHp: number) {
    this.hp = currentHp;
    this.hpBarFill.clear();

    const ratio = Math.max(0, currentHp / this.maxHp);
    const color = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xfacc15 : 0xef4444;

    this.hpBarFill.fillStyle(color, 1);
    this.hpBarFill.fillRoundedRect(50, 16, 120 * ratio, 16, 4);
    this.hpText.setText(`${Math.max(0, currentHp)}/${this.maxHp}`);
  }

  private togglePause() {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.scene.pause("GameScene");
      if (this.scene.isActive("ControllerScene")) {
        this.scene.pause("ControllerScene");
      }
      this.pauseMenuContainer.setVisible(true);
    } else {
      this.resumeGame();
    }
  }

  private resumeGame() {
    this.isPaused = false;
    this.pauseMenuContainer.setVisible(false);
    this.scene.resume("GameScene");
    if (this.scene.isPaused("ControllerScene")) {
      this.scene.resume("ControllerScene");
    }
  }

  private createPauseMenu(width: number, height: number) {
    this.pauseMenuContainer = this.add.container(0, 0);
    this.pauseMenuContainer.setVisible(false);

    // 半透明背景
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x020617, 0.75);
    backdrop.fillRect(0, 0, width, height);
    backdrop.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    // ダイアログ枠
    const modalBg = this.add.graphics();
    modalBg.fillStyle(0x1e293b, 1);
    modalBg.fillRoundedRect(width / 2 - 140, height / 2 - 120, 280, 240, 12);
    modalBg.lineStyle(2, 0x475569, 1);
    modalBg.strokeRoundedRect(width / 2 - 140, height / 2 - 120, 280, 240, 12);

    const title = this.add
      .text(width / 2, height / 2 - 80, "PAUSE", {
        fontSize: "24px",
        fontFamily: "monospace",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // ボタン1: ゲーム再開
    const resumeBtn = this.createMenuButton(
      width / 2,
      height / 2 - 25,
      "ゲーム再開",
      0x0284c7,
      () => this.resumeGame(),
    );

    // ボタン2: 設定
    const settingsBtn = this.createMenuButton(width / 2, height / 2 + 30, "設定", 0x475569, () => {
      this.scene.launch("SettingsScene", { from: "UIScene" });
    });

    // ボタン3: タイトルへ
    const titleBtn = this.createMenuButton(
      width / 2,
      height / 2 + 85,
      "タイトルへ",
      0xd97706,
      () => {
        this.scene.stop("UIScene");
        this.scene.stop("ControllerScene");
        this.scene.stop("GameScene");
        this.scene.start("TitleScene");
      },
    );

    this.pauseMenuContainer.add([backdrop, modalBg, title, resumeBtn, settingsBtn, titleBtn]);
  }

  private createMenuButton(
    x: number,
    y: number,
    text: string,
    color: number,
    callback: () => void,
  ) {
    const btn = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-100, -18, 200, 36, 6);

    const label = this.add
      .text(0, 0, text, {
        fontSize: "15px",
        fontFamily: "sans-serif",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    btn.add([bg, label]);
    btn.setSize(200, 36);
    btn.setInteractive({ useHandCursor: true });
    btn.on("pointerdown", callback);

    return btn;
  }
}
