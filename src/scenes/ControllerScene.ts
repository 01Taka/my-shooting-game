import Phaser from "phaser";

import { addCrispText } from "../utils/text";

export class ControllerScene extends Phaser.Scene {
  protected inputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
  };

  constructor() {
    super("ControllerScene");
  }

  // ==========================================
  // ゲーム特有のバーチャルコントローラー設定
  // （派生ゲーム作成時はここをオーバーライドまたは編集）
  // ==========================================

  /**
   * バーチャルボタンの表示設定（ラベル、配置、キー等）
   */
  protected getControllerConfig() {
    return {
      dpad: {
        centerXOffset: 100,
        centerYOffset: 100,
        btnSize: 42,
        buttons: [
          { key: "left" as const, label: "◀", offsetX: -50, offsetY: 0 },
          { key: "right" as const, label: "▶", offsetX: 50, offsetY: 0 },
          { key: "up" as const, label: "▲", offsetX: 0, offsetY: -50 },
          { key: "down" as const, label: "▼", offsetX: 0, offsetY: 50 },
        ],
      },
      actionButton: {
        xOffset: 90,
        yOffset: 90,
        radius: 40,
        label: "SHOT",
        color: 0xef4444,
        activeColor: 0xdc2626,
      },
    };
  }

  // ==========================================
  // コントローラー生成・イベント処理
  // ==========================================

  create() {
    const { width, height } = this.scale;
    const config = this.getControllerConfig();

    // マルチタッチ対応を有効化
    this.input.addPointer(2);

    // --- 左側: バーチャル十字キー（D-Pad） ---
    const dpadCenterX = config.dpad.centerXOffset;
    const dpadCenterY = height - config.dpad.centerYOffset;
    const btnSize = config.dpad.btnSize;

    for (const btn of config.dpad.buttons) {
      this.createDpadButton(
        dpadCenterX + btn.offsetX,
        dpadCenterY + btn.offsetY,
        btn.label,
        btnSize,
        btn.key,
      );
    }

    // --- 右側: アクションボタン ---
    const shotConfig = config.actionButton;
    const shotX = width - shotConfig.xOffset;
    const shotY = height - shotConfig.yOffset;
    const shotRadius = shotConfig.radius;

    const shotBtn = this.add.container(shotX, shotY);
    const shotBg = this.add.graphics();
    shotBg.fillStyle(shotConfig.color, 0.7);
    shotBg.fillCircle(0, 0, shotRadius);
    shotBg.lineStyle(3, 0xffffff, 0.8);
    shotBg.strokeCircle(0, 0, shotRadius);

    const shotLabel = addCrispText(this, 0, 0, shotConfig.label, {
      fontSize: "14px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);

    shotBtn.add([shotBg, shotLabel]);
    shotBtn.setSize(shotRadius * 2, shotRadius * 2);
    shotBtn.setInteractive(new Phaser.Geom.Circle(0, 0, shotRadius), Phaser.Geom.Circle.Contains);

    shotBtn.on("pointerdown", () => {
      this.inputState.shoot = true;
      shotBg.clear();
      shotBg.fillStyle(shotConfig.activeColor, 0.9);
      shotBg.fillCircle(0, 0, shotRadius);
      this.notifyGameScene();
    });

    const releaseShot = () => {
      this.inputState.shoot = false;
      shotBg.clear();
      shotBg.fillStyle(shotConfig.color, 0.7);
      shotBg.fillCircle(0, 0, shotRadius);
      shotBg.lineStyle(3, 0xffffff, 0.8);
      shotBg.strokeCircle(0, 0, shotRadius);
      this.notifyGameScene();
    };

    shotBtn.on("pointerup", releaseShot);
    shotBtn.on("pointerout", releaseShot);
  }

  protected createDpadButton(
    x: number,
    y: number,
    label: string,
    size: number,
    key: "left" | "right" | "up" | "down",
  ) {
    const btn = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x334155, 0.65);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, 8);
    bg.lineStyle(2, 0x64748b, 0.8);
    bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 8);

    const txt = addCrispText(this, 0, 0, label, {
      fontSize: "16px",
      color: "#ffffff",
    }).setOrigin(0.5);

    btn.add([bg, txt]);
    btn.setSize(size, size);
    btn.setInteractive();

    btn.on("pointerdown", () => {
      this.inputState[key] = true;
      bg.clear();
      bg.fillStyle(0x0284c7, 0.85);
      bg.fillRoundedRect(-size / 2, -size / 2, size, size, 8);
      this.notifyGameScene();
    });

    const release = () => {
      this.inputState[key] = false;
      bg.clear();
      bg.fillStyle(0x334155, 0.65);
      bg.fillRoundedRect(-size / 2, -size / 2, size, size, 8);
      bg.lineStyle(2, 0x64748b, 0.8);
      bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 8);
      this.notifyGameScene();
    };

    btn.on("pointerup", release);
    btn.on("pointerout", release);
  }

  protected notifyGameScene() {
    const gameScene = this.scene.get("GameScene");
    if (gameScene) {
      gameScene.events.emit("controller-input", { ...this.inputState });
    }
  }
}
