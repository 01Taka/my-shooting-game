import Phaser from "phaser";

import { EventBus } from "../EventBus";
import { addCrispText } from "../utils/text";

export class UIScene extends Phaser.Scene {
  protected scoreText!: Phaser.GameObjects.Text;
  protected hpBarFill!: Phaser.GameObjects.Graphics;
  protected hpText!: Phaser.GameObjects.Text;
  protected pauseMenuContainer!: Phaser.GameObjects.Container;
  protected isPaused = false;
  protected hp = 100;
  protected maxHp = 100;

  constructor() {
    super("UIScene");
  }

  // ==========================================
  // ゲーム特有のUI設定・メニュー定義
  // （派生ゲーム作成時はここをオーバーライドまたは編集）
  // ==========================================

  /**
   * HUD表示（HPやスコア等）のラベル設定
   */
  protected getHUDConfig() {
    return {
      hpLabel: "HP",
      scorePrefix: "SCORE: ",
      pauseButtonText: "II ポーズ",
    };
  }

  /**
   * ポーズメニューのタイトルおよび項目一覧の定義
   */
  protected getPauseMenuConfig() {
    return {
      title: "PAUSE",
      items: [
        {
          label: "ゲーム再開",
          color: 0x0284c7,
          onClick: () => this.resumeGame(),
        },
        {
          label: "設定",
          color: 0x475569,
          onClick: () => EventBus.emit("open-settings"),
        },
        {
          label: "タイトルへ",
          color: 0xd97706,
          onClick: () => {
            this.scene.stop("UIScene");
            this.scene.stop("ControllerScene");
            this.scene.stop("GameScene");
            this.scene.start("TitleScene");
          },
        },
      ],
    };
  }

  // ==========================================
  // 共通HUD・ポーズ制御
  // ==========================================

  init(data: { hp?: number; maxHp?: number; score?: number }) {
    this.hp = data.hp ?? 100;
    this.maxHp = data.maxHp ?? 100;
    this.isPaused = false;
  }

  create() {
    const { width, height } = this.scale;
    const hudConfig = this.getHUDConfig();

    // --- HPバー表示（左上） ---
    addCrispText(this, 20, 16, hudConfig.hpLabel, {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#94a3b8",
    });

    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x334155, 0.8);
    hpBg.fillRoundedRect(50, 16, 120, 16, 4);

    this.hpBarFill = this.add.graphics();
    this.hpText = addCrispText(this, 178, 16, `${this.hp}/${this.maxHp}`, {
      fontSize: "12px",
      fontFamily: "monospace",
      color: "#e2e8f0",
    });
    this.updateHpBar(this.hp);

    // --- スコア表示（中央上） ---
    this.scoreText = addCrispText(this, width / 2, 24, `${hudConfig.scorePrefix}00000`, {
      fontSize: "18px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#f8fafc",
    }).setOrigin(0.5);

    // --- ポーズボタン（右上） ---
    const pauseBtn = addCrispText(this, width - 20, 24, hudConfig.pauseButtonText, {
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
      this.scoreText.setText(`${hudConfig.scorePrefix}${String(newScore).padStart(5, "0")}`);
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

  protected updateHpBar(currentHp: number) {
    this.hp = currentHp;
    this.hpBarFill.clear();

    const ratio = Math.max(0, currentHp / this.maxHp);
    const color = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xfacc15 : 0xef4444;

    this.hpBarFill.fillStyle(color, 1);
    this.hpBarFill.fillRoundedRect(50, 16, 120 * ratio, 16, 4);
    this.hpText.setText(`${Math.max(0, currentHp)}/${this.maxHp}`);
  }

  protected togglePause() {
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

  protected resumeGame() {
    this.isPaused = false;
    this.pauseMenuContainer.setVisible(false);
    this.scene.resume("GameScene");
    if (this.scene.isPaused("ControllerScene")) {
      this.scene.resume("ControllerScene");
    }
  }

  protected createPauseMenu(width: number, height: number) {
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

    const menuConfig = this.getPauseMenuConfig();

    const title = addCrispText(this, width / 2, height / 2 - 80, menuConfig.title, {
      fontSize: "24px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);

    this.pauseMenuContainer.add([backdrop, modalBg, title]);

    // 設定されたメニューボタンを順次配置
    menuConfig.items.forEach((item, index) => {
      const yPos = height / 2 - 25 + index * 55;
      const btn = this.createMenuButton(width / 2, yPos, item.label, item.color, item.onClick);
      this.pauseMenuContainer.add(btn);
    });
  }

  protected createMenuButton(
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

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "15px",
      fontFamily: "sans-serif",
      color: "#ffffff",
    }).setOrigin(0.5);

    btn.add([bg, label]);
    btn.setSize(200, 36);
    btn.setInteractive({ useHandCursor: true });
    btn.on("pointerdown", callback);

    return btn;
  }
}
