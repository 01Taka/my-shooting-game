import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import {
  HUD_HP_BAR_BG_ALPHA,
  HUD_HP_BAR_BG_COLOR,
  HUD_HP_BAR_HEIGHT,
  HUD_HP_BAR_RADIUS,
  HUD_HP_BAR_WIDTH,
  HUD_HP_BAR_X,
  HUD_HP_BAR_Y,
  HUD_HP_COLOR_HIGH,
  HUD_HP_COLOR_LOW,
  HUD_HP_COLOR_MID,
  HUD_HP_LABEL_X,
  HUD_HP_LABEL_Y,
  HUD_HP_RATIO_HIGH,
  HUD_HP_RATIO_MID,
  HUD_HP_TEXT_X,
  HUD_HP_TEXT_Y,
  HUD_PAUSE_BUTTON_MARGIN_RIGHT,
  HUD_PAUSE_BUTTON_PADDING_X,
  HUD_PAUSE_BUTTON_PADDING_Y,
  HUD_PAUSE_BUTTON_Y,
  HUD_SCORE_DIGITS,
  HUD_SCORE_Y,
  PAUSE_MENU_BACKDROP_ALPHA,
  PAUSE_MENU_BACKDROP_COLOR,
  PAUSE_MENU_BUTTON_HEIGHT,
  PAUSE_MENU_BUTTON_RADIUS,
  PAUSE_MENU_BUTTON_SPACING_Y,
  PAUSE_MENU_BUTTON_START_Y_OFFSET,
  PAUSE_MENU_BUTTON_WIDTH,
  PAUSE_MENU_MODAL_BG_COLOR,
  PAUSE_MENU_MODAL_BORDER_COLOR,
  PAUSE_MENU_MODAL_BORDER_WIDTH,
  PAUSE_MENU_MODAL_HEIGHT,
  PAUSE_MENU_MODAL_RADIUS,
  PAUSE_MENU_MODAL_WIDTH,
  PAUSE_MENU_RESUME_COLOR,
  PAUSE_MENU_SETTINGS_COLOR,
  PAUSE_MENU_TITLE_COLOR,
  PAUSE_MENU_TITLE_Y_OFFSET,
  PLAYER_INITIAL_HP,
} from "../constants";
import { EventBus } from "../EventBus";
import { addCrispText } from "../utils/text";

export class UIScene extends Phaser.Scene {
  protected scoreText!: Phaser.GameObjects.Text;
  protected hpBarFill!: Phaser.GameObjects.Graphics;
  protected hpText!: Phaser.GameObjects.Text;
  protected pauseMenuContainer!: Phaser.GameObjects.Container;
  protected isPaused = false;
  protected hp = PLAYER_INITIAL_HP;
  protected maxHp = PLAYER_INITIAL_HP;

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
          color: PAUSE_MENU_RESUME_COLOR,
          onClick: () => this.resumeGame(),
        },
        {
          label: "設定",
          color: PAUSE_MENU_SETTINGS_COLOR,
          onClick: () => EventBus.emit("open-settings"),
        },
        {
          label: "タイトルへ",
          color: PAUSE_MENU_TITLE_COLOR,
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
    this.hp = data.hp ?? PLAYER_INITIAL_HP;
    this.maxHp = data.maxHp ?? PLAYER_INITIAL_HP;
    this.isPaused = false;
  }

  create() {
    const { width, height } = this.scale;
    const hudConfig = this.getHUDConfig();

    // --- HPバー表示（左上） ---
    addCrispText(this, HUD_HP_LABEL_X, HUD_HP_LABEL_Y, hudConfig.hpLabel, {
      fontSize: "24px",
      fontFamily: "monospace",
      color: "#94a3b8",
    });

    const hpBg = this.add.graphics();
    hpBg.fillStyle(HUD_HP_BAR_BG_COLOR, HUD_HP_BAR_BG_ALPHA);
    hpBg.fillRoundedRect(
      HUD_HP_BAR_X,
      HUD_HP_BAR_Y,
      HUD_HP_BAR_WIDTH,
      HUD_HP_BAR_HEIGHT,
      HUD_HP_BAR_RADIUS,
    );

    this.hpBarFill = this.add.graphics();
    this.hpText = addCrispText(this, HUD_HP_TEXT_X, HUD_HP_TEXT_Y, `${this.hp}/${this.maxHp}`, {
      fontSize: "20px",
      fontFamily: "monospace",
      color: "#e2e8f0",
    });
    this.updateHpBar(this.hp);

    // --- スコア表示（中央上） ---
    this.scoreText = addCrispText(
      this,
      width / 2,
      HUD_SCORE_Y,
      `${hudConfig.scorePrefix}${"0".repeat(HUD_SCORE_DIGITS)}`,
      {
        fontSize: "32px",
        fontFamily: "monospace",
        fontStyle: "bold",
        color: "#f8fafc",
      },
    ).setOrigin(0.5);

    // --- ポーズボタン（右上） ---
    const pauseBtn = addCrispText(
      this,
      width - HUD_PAUSE_BUTTON_MARGIN_RIGHT,
      HUD_PAUSE_BUTTON_Y,
      hudConfig.pauseButtonText,
      {
        fontSize: "22px",
        backgroundColor: "#1e293b",
        padding: { x: HUD_PAUSE_BUTTON_PADDING_X, y: HUD_PAUSE_BUTTON_PADDING_Y },
        color: "#ffffff",
      },
    )
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    pauseBtn.on("pointerdown", () => this.togglePause());

    // --- ポーズメニュー（初期非表示） ---
    this.createPauseMenu(width, height);

    // イベント購読
    const onScoreUpdate = (newScore: number) => {
      this.scoreText.setText(
        `${hudConfig.scorePrefix}${String(newScore).padStart(HUD_SCORE_DIGITS, "0")}`,
      );
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
    const color =
      ratio > HUD_HP_RATIO_HIGH
        ? HUD_HP_COLOR_HIGH
        : ratio > HUD_HP_RATIO_MID
          ? HUD_HP_COLOR_MID
          : HUD_HP_COLOR_LOW;

    this.hpBarFill.fillStyle(color, 1);
    this.hpBarFill.fillRoundedRect(
      HUD_HP_BAR_X,
      HUD_HP_BAR_Y,
      HUD_HP_BAR_WIDTH * ratio,
      HUD_HP_BAR_HEIGHT,
      HUD_HP_BAR_RADIUS,
    );
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
    backdrop.fillStyle(PAUSE_MENU_BACKDROP_COLOR, PAUSE_MENU_BACKDROP_ALPHA);
    backdrop.fillRect(0, 0, width, height);
    backdrop.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    // ダイアログ枠
    const modalBg = this.add.graphics();
    modalBg.fillStyle(PAUSE_MENU_MODAL_BG_COLOR, 1);
    modalBg.fillRoundedRect(
      width / 2 - PAUSE_MENU_MODAL_WIDTH / 2,
      height / 2 - PAUSE_MENU_MODAL_HEIGHT / 2,
      PAUSE_MENU_MODAL_WIDTH,
      PAUSE_MENU_MODAL_HEIGHT,
      PAUSE_MENU_MODAL_RADIUS,
    );
    modalBg.lineStyle(PAUSE_MENU_MODAL_BORDER_WIDTH, PAUSE_MENU_MODAL_BORDER_COLOR, 1);
    modalBg.strokeRoundedRect(
      width / 2 - PAUSE_MENU_MODAL_WIDTH / 2,
      height / 2 - PAUSE_MENU_MODAL_HEIGHT / 2,
      PAUSE_MENU_MODAL_WIDTH,
      PAUSE_MENU_MODAL_HEIGHT,
      PAUSE_MENU_MODAL_RADIUS,
    );

    const menuConfig = this.getPauseMenuConfig();

    const title = addCrispText(
      this,
      width / 2,
      height / 2 - PAUSE_MENU_TITLE_Y_OFFSET,
      menuConfig.title,
      {
        fontSize: "44px",
        fontFamily: "monospace",
        fontStyle: "bold",
        color: "#ffffff",
      },
    ).setOrigin(0.5);

    this.pauseMenuContainer.add([backdrop, modalBg, title]);

    // 設定されたメニューボタンを順次配置
    menuConfig.items.forEach((item, index) => {
      const yPos =
        height / 2 + PAUSE_MENU_BUTTON_START_Y_OFFSET + index * PAUSE_MENU_BUTTON_SPACING_Y;
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
    bg.fillRoundedRect(
      -PAUSE_MENU_BUTTON_WIDTH / 2,
      -PAUSE_MENU_BUTTON_HEIGHT / 2,
      PAUSE_MENU_BUTTON_WIDTH,
      PAUSE_MENU_BUTTON_HEIGHT,
      PAUSE_MENU_BUTTON_RADIUS,
    );

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "26px",
      color: "#ffffff",
    }).setOrigin(0.5);

    btn.add([bg, label]);
    btn.setSize(PAUSE_MENU_BUTTON_WIDTH, PAUSE_MENU_BUTTON_HEIGHT);
    btn.setInteractive({ useHandCursor: true });
    btn.on("pointerdown", () => {
      AudioManager.getInstance().playSE("click");
      callback();
    });

    return btn;
  }
}
