import Phaser from "phaser";

import { addCrispText } from "../utils/text";

export interface StickState {
  x: number; // -1.0 〜 1.0 (左〜右)
  y: number; // -1.0 〜 1.0 (上〜下)
  active: boolean; // デッドゾーンを超えて操作中か
  angle: number; // 倒されている角度（ラジアン: -PI 〜 PI）
  force: number; // 倒しの強さ（0.0 〜 1.0）
}

export interface ControllerInputPayload {
  move: StickState;
  shoot: StickState;
}

interface StickVisuals {
  container: Phaser.GameObjects.Container;
  baseBg: Phaser.GameObjects.Graphics;
  knob: Phaser.GameObjects.Container;
  aimIndicator?: Phaser.GameObjects.Graphics;
  pointerId: number | null;
  baseX: number;
  baseY: number;
  maxRadius: number;
  deadZone: number;
  state: StickState;
}

export class ControllerScene extends Phaser.Scene {
  protected moveStick!: StickVisuals;
  protected shootStick!: StickVisuals;

  constructor() {
    super("ControllerScene");
  }

  // ==========================================
  // バーチャルスティック設定 (1600x900スケール)
  // ==========================================

  protected getStickConfig() {
    return {
      move: {
        xOffset: 200,
        yOffset: 200,
        baseRadius: 90,
        knobRadius: 42,
        deadZone: 12,
        maxRadius: 80,
        baseColor: 0x0f172a,
        borderColor: 0x38bdf8,
        knobColor: 0x0284c7,
        label: "MOVE",
      },
      shoot: {
        xOffset: 200,
        yOffset: 200,
        baseRadius: 90,
        knobRadius: 42,
        deadZone: 14,
        maxRadius: 80,
        baseColor: 0x0f172a,
        borderColor: 0xf43f5e,
        knobColor: 0xe11d48,
        label: "FIRE",
      },
    };
  }

  // ==========================================
  // コントローラー生成・イベント処理
  // ==========================================

  create() {
    const { width, height } = this.scale;
    const config = this.getStickConfig();

    // 複数指のマルチタッチに対応
    this.input.addPointer(3);

    // --- 左側: 移動バーチャルスティック ---
    this.moveStick = this.createVirtualStick({
      baseX: config.move.xOffset,
      baseY: height - config.move.yOffset,
      baseRadius: config.move.baseRadius,
      knobRadius: config.move.knobRadius,
      maxRadius: config.move.maxRadius,
      deadZone: config.move.deadZone,
      baseColor: config.move.baseColor,
      borderColor: config.move.borderColor,
      knobColor: config.move.knobColor,
      label: config.move.label,
      isAimStick: false,
    });

    // --- 右側: 攻撃バーチャルスティック ---
    this.shootStick = this.createVirtualStick({
      baseX: width - config.shoot.xOffset,
      baseY: height - config.shoot.yOffset,
      baseRadius: config.shoot.baseRadius,
      knobRadius: config.shoot.knobRadius,
      maxRadius: config.shoot.maxRadius,
      deadZone: config.shoot.deadZone,
      baseColor: config.shoot.baseColor,
      borderColor: config.shoot.borderColor,
      knobColor: config.shoot.knobColor,
      label: config.shoot.label,
      isAimStick: true,
    });

    // 入力イベント（ポインターの割り当てと追従）
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerup", this.handlePointerUp, this);
    this.input.on("pointerupoutside", this.handlePointerUp, this);

    // ポーズや非表示時のリセット
    this.events.on("pause", this.resetAllSticks, this);
    this.events.on("shutdown", this.cleanup, this);
  }

  /**
   * バーチャルスティック表示オブジェクトの生成
   */
  protected createVirtualStick(options: {
    baseX: number;
    baseY: number;
    baseRadius: number;
    knobRadius: number;
    maxRadius: number;
    deadZone: number;
    baseColor: number;
    borderColor: number;
    knobColor: number;
    label: string;
    isAimStick: boolean;
  }): StickVisuals {
    const {
      baseX,
      baseY,
      baseRadius,
      knobRadius,
      maxRadius,
      deadZone,
      baseColor,
      borderColor,
      knobColor,
      label,
      isAimStick,
    } = options;

    const container = this.add.container(baseX, baseY);

    // ベース外枠 & ガイド
    const baseBg = this.add.graphics();
    // 半透明背景
    baseBg.fillStyle(baseColor, 0.45);
    baseBg.fillCircle(0, 0, baseRadius);
    // 外枠リング
    baseBg.lineStyle(4, borderColor, 0.7);
    baseBg.strokeCircle(0, 0, baseRadius);
    // 内側ガイドリング
    baseBg.lineStyle(2, borderColor, 0.3);
    baseBg.strokeCircle(0, 0, baseRadius * 0.5);
    // 十字ガイドライン
    baseBg.lineStyle(1.5, borderColor, 0.25);
    baseBg.lineBetween(-baseRadius * 0.75, 0, baseRadius * 0.75, 0);
    baseBg.lineBetween(0, -baseRadius * 0.75, 0, baseRadius * 0.75);

    // スティック中央テキストラベル
    const stickLabel = addCrispText(this, 0, 0, label, {
      fontSize: "20px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#94a3b8",
    }).setOrigin(0.5);

    container.add([baseBg, stickLabel]);

    // 攻撃スティック用のエイム方向インジケーター（矢印）
    let aimIndicator: Phaser.GameObjects.Graphics | undefined;
    if (isAimStick) {
      aimIndicator = this.add.graphics();
      aimIndicator.setVisible(false);
      container.add(aimIndicator);
    }

    // ノブ（スティック頭）
    const knob = this.add.container(0, 0);
    const knobGraphics = this.add.graphics();
    // ノブ本体
    knobGraphics.fillStyle(knobColor, 0.85);
    knobGraphics.fillCircle(0, 0, knobRadius);
    // ノブ外枠
    knobGraphics.lineStyle(3.5, 0xffffff, 0.9);
    knobGraphics.strokeCircle(0, 0, knobRadius);
    // ノブ中心のアクセントドット
    knobGraphics.fillStyle(0xffffff, 0.8);
    knobGraphics.fillCircle(0, 0, 7);

    knob.add(knobGraphics);
    container.add(knob);

    return {
      container,
      baseBg,
      knob,
      aimIndicator,
      pointerId: null,
      baseX,
      baseY,
      maxRadius,
      deadZone,
      state: {
        x: 0,
        y: 0,
        active: false,
        angle: 0,
        force: 0,
      },
    };
  }

  // ==========================================
  // タッチ/ポインターイベント処理
  // ==========================================

  protected handlePointerDown(pointer: Phaser.Input.Pointer) {
    const { width } = this.scale;

    // 画面左半分でタップされた場合 -> 移動スティックに割り当て
    if (pointer.x < width / 2 && this.moveStick.pointerId === null) {
      this.moveStick.pointerId = pointer.id;
      this.updateStickPosition(this.moveStick, pointer.x, pointer.y);
      this.notifyGameScene();
    }
    // 画面右半分でタップされた場合 -> 攻撃スティックに割り当て
    else if (pointer.x >= width / 2 && this.shootStick.pointerId === null) {
      this.shootStick.pointerId = pointer.id;
      this.updateStickPosition(this.shootStick, pointer.x, pointer.y);
      this.notifyGameScene();
    }
  }

  protected handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (pointer.id === this.moveStick.pointerId) {
      this.updateStickPosition(this.moveStick, pointer.x, pointer.y);
      this.notifyGameScene();
    } else if (pointer.id === this.shootStick.pointerId) {
      this.updateStickPosition(this.shootStick, pointer.x, pointer.y);
      this.notifyGameScene();
    }
  }

  protected handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id === this.moveStick.pointerId) {
      this.releaseStick(this.moveStick);
      this.notifyGameScene();
    } else if (pointer.id === this.shootStick.pointerId) {
      this.releaseStick(this.shootStick);
      this.notifyGameScene();
    }
  }

  /**
   * スティックノブの位置と入力ベクトルの更新
   */
  protected updateStickPosition(stick: StickVisuals, pointerX: number, pointerY: number) {
    const dx = pointerX - stick.baseX;
    const dy = pointerY - stick.baseY;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    // 最大半径でクランプ
    const clampedDist = Math.min(distance, stick.maxRadius);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    stick.knob.setPosition(knobX, knobY);

    if (distance > stick.deadZone) {
      const force = Math.min(distance / stick.maxRadius, 1.0);
      stick.state.x = Math.cos(angle) * force;
      stick.state.y = Math.sin(angle) * force;
      stick.state.active = true;
      stick.state.angle = angle;
      stick.state.force = force;

      // 照準インジケーター（矢印）の更新
      if (stick.aimIndicator) {
        stick.aimIndicator.clear();
        stick.aimIndicator.setVisible(true);

        const tipX = Math.cos(angle) * (stick.maxRadius + 22);
        const tipY = Math.sin(angle) * (stick.maxRadius + 22);
        const leftX = Math.cos(angle + 0.35) * (stick.maxRadius + 6);
        const leftY = Math.sin(angle + 0.35) * (stick.maxRadius + 6);
        const rightX = Math.cos(angle - 0.35) * (stick.maxRadius + 6);
        const rightY = Math.sin(angle - 0.35) * (stick.maxRadius + 6);

        stick.aimIndicator.fillStyle(0xf43f5e, 0.9);
        stick.aimIndicator.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
      }
    } else {
      stick.state.x = 0;
      stick.state.y = 0;
      stick.state.active = false;
      stick.state.force = 0;
      if (stick.aimIndicator) {
        stick.aimIndicator.setVisible(false);
      }
    }
  }

  /**
   * スティック解放時のリセット処理
   */
  protected releaseStick(stick: StickVisuals) {
    stick.pointerId = null;
    stick.state.x = 0;
    stick.state.y = 0;
    stick.state.active = false;
    stick.state.force = 0;

    if (stick.aimIndicator) {
      stick.aimIndicator.setVisible(false);
    }

    // スティックノブを中心へスムーズに戻す
    this.tweens.killTweensOf(stick.knob);
    this.tweens.add({
      targets: stick.knob,
      x: 0,
      y: 0,
      duration: 100,
      ease: Phaser.Math.Easing.Sine.Out,
    });
  }

  /**
   * 全スティックのリセット
   */
  protected resetAllSticks() {
    if (this.moveStick) this.releaseStick(this.moveStick);
    if (this.shootStick) this.releaseStick(this.shootStick);
    this.notifyGameScene();
  }

  protected cleanup() {
    this.resetAllSticks();
    this.input.off("pointerdown", this.handlePointerDown, this);
    this.input.off("pointermove", this.handlePointerMove, this);
    this.input.off("pointerup", this.handlePointerUp, this);
    this.input.off("pointerupoutside", this.handlePointerUp, this);
    this.events.off("pause", this.resetAllSticks, this);
  }

  /**
   * GameSceneへ入力状態を通知
   */
  protected notifyGameScene() {
    const gameScene = this.scene.get("GameScene");
    if (!gameScene) return;

    const payload: ControllerInputPayload = {
      move: { ...this.moveStick.state },
      shoot: { ...this.shootStick.state },
    };

    gameScene.events.emit("controller-input", payload);
  }
}
