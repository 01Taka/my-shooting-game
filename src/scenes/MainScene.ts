import Phaser from "phaser";

import { EventBus } from "../EventBus";

export class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  /**
   * 画像や音声などのアセットを事前に読み込む場所
   */
  preload() {
    // 例: this.load.image('logo', '/vite.svg');
  }

  /**
   * ゲーム開始時に1度だけ呼ばれ、画面にオブジェクトを配置する場所
   */
  create() {
    const { width, height } = this.scale;

    // 画面中央に案内テキストを表示
    const text = this.add
      .text(width / 2, height / 2, "クリックしてスタート！", {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // クリック（タップ）時のイベント例
    this.input.on("pointerdown", () => {
      text.setText("ゲーム実行中！");
      EventBus.emit("game-started");
    });

    // シーンの準備完了を通知
    EventBus.emit("current-scene-ready", this);
  }

  /**
   * 毎フレーム（1秒間に約60回）実行される更新処理
   */
  update(_time: number, _delta: number) {
    // ここに毎フレームの移動や当たり判定などを記述
  }
}
