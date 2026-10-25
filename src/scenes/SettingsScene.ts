import Phaser from "phaser";

export class SettingsScene extends Phaser.Scene {
  private bgmVolume = 80;
  private seVolume = 80;
  private bgmText!: Phaser.GameObjects.Text;
  private seText!: Phaser.GameObjects.Text;

  constructor() {
    super("SettingsScene");
  }

  create() {
    const { width, height } = this.scale;

    // 半透明の背景（背面クリックをブロック）
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x020617, 0.7);
    backdrop.fillRect(0, 0, width, height);
    backdrop.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    // モーダル枠
    const modalBg = this.add.graphics();
    const modalW = 340;
    const modalH = 260;
    modalBg.fillStyle(0x1e293b, 1);
    modalBg.fillRoundedRect(width / 2 - modalW / 2, height / 2 - modalH / 2, modalW, modalH, 12);
    modalBg.lineStyle(2, 0x475569, 1);
    modalBg.strokeRoundedRect(width / 2 - modalW / 2, height / 2 - modalH / 2, modalW, modalH, 12);

    // タイトル
    this.add
      .text(width / 2, height / 2 - 95, "SETTINGS", {
        fontSize: "22px",
        fontFamily: "monospace",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // --- BGM 音量調整 ---
    this.add.text(width / 2 - 130, height / 2 - 45, "BGM 音量", {
      fontSize: "14px",
      fontFamily: "sans-serif",
      color: "#cbd5e1",
    });

    this.bgmText = this.add
      .text(width / 2 + 30, height / 2 - 45, `${this.bgmVolume}%`, {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#38bdf8",
      })
      .setOrigin(0.5, 0);

    this.createVolumeButton(width / 2 - 20, height / 2 - 45, "-", () => {
      this.bgmVolume = Math.max(0, this.bgmVolume - 10);
      this.bgmText.setText(`${this.bgmVolume}%`);
    });

    this.createVolumeButton(width / 2 + 80, height / 2 - 45, "+", () => {
      this.bgmVolume = Math.min(100, this.bgmVolume + 10);
      this.bgmText.setText(`${this.bgmVolume}%`);
    });

    // --- SE 音量調整 ---
    this.add.text(width / 2 - 130, height / 2 + 10, "SE 音量", {
      fontSize: "14px",
      fontFamily: "sans-serif",
      color: "#cbd5e1",
    });

    this.seText = this.add
      .text(width / 2 + 30, height / 2 + 10, `${this.seVolume}%`, {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#38bdf8",
      })
      .setOrigin(0.5, 0);

    this.createVolumeButton(width / 2 - 20, height / 2 + 10, "-", () => {
      this.seVolume = Math.max(0, this.seVolume - 10);
      this.seText.setText(`${this.seVolume}%`);
    });

    this.createVolumeButton(width / 2 + 80, height / 2 + 10, "+", () => {
      this.seVolume = Math.min(100, this.seVolume + 10);
      this.seText.setText(`${this.seVolume}%`);
    });

    // --- 閉じるボタン ---
    const closeBtn = this.add.container(width / 2, height / 2 + 85);
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0x0284c7, 1);
    closeBg.fillRoundedRect(-60, -18, 120, 36, 6);

    const closeLabel = this.add
      .text(0, 0, "閉じる", {
        fontSize: "14px",
        fontFamily: "sans-serif",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    closeBtn.add([closeBg, closeLabel]);
    closeBtn.setSize(120, 36);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => {
      this.scene.stop("SettingsScene");
    });
  }

  private createVolumeButton(x: number, y: number, label: string, onClick: () => void) {
    const btn = this.add
      .text(x, y, label, {
        fontSize: "16px",
        fontFamily: "monospace",
        backgroundColor: "#334155",
        padding: { x: 10, y: 3 },
        color: "#ffffff",
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerdown", onClick);
    return btn;
  }
}
