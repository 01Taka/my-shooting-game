import Phaser from "phaser";

export class ControllerScene extends Phaser.Scene {
  private inputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
  };

  constructor() {
    super("ControllerScene");
  }

  create() {
    const { width, height } = this.scale;

    // マルチタッチ対応を有効化
    this.input.addPointer(2);

    // --- 左側: バーチャル十字キー（D-Pad） ---
    const dpadCenterX = 100;
    const dpadCenterY = height - 100;
    const btnSize = 42;

    this.createDpadButton(dpadCenterX - 50, dpadCenterY, "◀", btnSize, "left");
    this.createDpadButton(dpadCenterX + 50, dpadCenterY, "▶", btnSize, "right");
    this.createDpadButton(dpadCenterX, dpadCenterY - 50, "▲", btnSize, "up");
    this.createDpadButton(dpadCenterX, dpadCenterY + 50, "▼", btnSize, "down");

    // --- 右側: ショットボタン ---
    const shotX = width - 90;
    const shotY = height - 90;
    const shotRadius = 40;

    const shotBtn = this.add.container(shotX, shotY);
    const shotBg = this.add.graphics();
    shotBg.fillStyle(0xef4444, 0.7);
    shotBg.fillCircle(0, 0, shotRadius);
    shotBg.lineStyle(3, 0xffffff, 0.8);
    shotBg.strokeCircle(0, 0, shotRadius);

    const shotLabel = this.add
      .text(0, 0, "SHOT", {
        fontSize: "14px",
        fontFamily: "monospace",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    shotBtn.add([shotBg, shotLabel]);
    shotBtn.setSize(shotRadius * 2, shotRadius * 2);
    shotBtn.setInteractive(new Phaser.Geom.Circle(0, 0, shotRadius), Phaser.Geom.Circle.Contains);

    shotBtn.on("pointerdown", () => {
      this.inputState.shoot = true;
      shotBg.clear();
      shotBg.fillStyle(0xdc2626, 0.9);
      shotBg.fillCircle(0, 0, shotRadius);
      this.notifyGameScene();
    });

    const releaseShot = () => {
      this.inputState.shoot = false;
      shotBg.clear();
      shotBg.fillStyle(0xef4444, 0.7);
      shotBg.fillCircle(0, 0, shotRadius);
      shotBg.lineStyle(3, 0xffffff, 0.8);
      shotBg.strokeCircle(0, 0, shotRadius);
      this.notifyGameScene();
    };

    shotBtn.on("pointerup", releaseShot);
    shotBtn.on("pointerout", releaseShot);
  }

  private createDpadButton(
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

    const txt = this.add
      .text(0, 0, label, {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

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

  private notifyGameScene() {
    const gameScene = this.scene.get("GameScene");
    if (gameScene) {
      gameScene.events.emit("controller-input", { ...this.inputState });
    }
  }
}
