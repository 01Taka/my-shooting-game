import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
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
  // 共通HUD・ポーズ制御 (1600x900スケール)
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
    addCrispText(this, 30, 26, hudConfig.hpLabel, {
      fontSize: "24px",
      fontFamily: "monospace",
      color: "#94a3b8",
    });

    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x334155, 0.8);
    hpBg.fillRoundedRect(80, 26, 240, 28, 6);

    this.hpBarFill = this.add.graphics();
    this.hpText = addCrispText(this, 335, 26, `${this.hp}/${this.maxHp}`, {
      fontSize: "20px",
      fontFamily: "monospace",
      color: "#e2e8f0",
    });
    this.updateHpBar(this.hp);

    // --- スコア表示（中央上） ---
    this.scoreText = addCrispText(this, width / 2, 40, `${hudConfig.scorePrefix}00000`, {
      fontSize: "32px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#f8fafc",
    }).setOrigin(0.5);

    // --- ポーズボタン（右上） ---
    const pauseBtn = addCrispText(this, width - 30, 40, hudConfig.pauseButtonText, {
      fontSize: "22px",
      backgroundColor: "#1e293b",
      padding: { x: 18, y: 10 },
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
    this.hpBarFill.fillRoundedRect(80, 26, 240 * ratio, 28, 6);
    this.hpText.setText(`${Math.max(0, currentHp)}/${this.maxHp}`);
  }

  protected togglePause() {
    AudioManager.getInstance().playSE("click");
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

    // ダイアログ枠 (540x460)
    const modalBg = this.add.graphics();
    modalBg.fillStyle(0x1e293b, 1);
    modalBg.fillRoundedRect(width / 2 - 270, height / 2 - 230, 540, 460, 20);
    modalBg.lineStyle(3, 0x475569, 1);
    modalBg.strokeRoundedRect(width / 2 - 270, height / 2 - 230, 540, 460, 20);

    const menuConfig = this.getPauseMenuConfig();

    const title = addCrispText(this, width / 2, height / 2 - 150, menuConfig.title, {
      fontSize: "44px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);

    this.pauseMenuContainer.add([backdrop, modalBg, title]);

    // 設定されたメニューボタンを順次配置
    menuConfig.items.forEach((item, index) => {
      const yPos = height / 2 - 40 + index * 95;
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
    bg.fillRoundedRect(-180, -32, 360, 64, 12);

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "26px",
      color: "#ffffff",
    }).setOrigin(0.5);

    btn.add([bg, label]);
    btn.setSize(360, 64);
    btn.setInteractive({ useHandCursor: true });
    btn.on("pointerdown", () => {
      AudioManager.getInstance().playSE("click");
      callback();
    });

    return btn;
  }
}
