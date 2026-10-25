import Phaser from "phaser";

import { useGameSettings } from "../stores/useGameSettings";
import { type InputMode, useInputMode } from "../stores/useInputMode";
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
  label?: Phaser.GameObjects.Text;
  knob: Phaser.GameObjects.Container;
  knobGraphics: Phaser.GameObjects.Graphics;
  aimIndicator?: Phaser.GameObjects.Graphics;
  pointerId: number | null;
  baseX: number; // 現在のスティック中心X
  baseY: number; // 現在のスティック中心Y
  originX: number; // デフォルトの初期配置X
  originY: number; // デフォルトの初期配置Y
  maxRadius: number;
  deadZone: number;
  baseRadius: number;
  knobRadius: number;
  baseColor: number;
  borderColor: number;
  knobColor: number;
  labelText: string;
  isAimStick: boolean;
  state: StickState;
}

export class ControllerScene extends Phaser.Scene {
  protected moveStick!: StickVisuals;
  protected shootStick!: StickVisuals;
  protected inputMode: InputMode = "mobile";
  protected unsubscribeSettings?: () => void;
  protected unsubscribeInputMode?: () => void;

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

    // 入力モード（PC vs スマホ）の初期化と購読
    this.inputMode = useInputMode.getState().mode;
    this.unsubscribeInputMode = useInputMode.subscribe((state) => {
      this.handleInputModeChange(state.mode);
    });

    // 設定（スティック固定/追従、カーソル追従）の購読
    this.unsubscribeSettings = useGameSettings.subscribe(() => {
      this.resetAllSticks();
      this.applyModeVisuals();
    });

    // 複数指のマルチタッチに対応
    this.input.addPointer(3);

    // --- 左側: 移動バーチャルスティック ---
    this.moveStick = this.createVirtualStick({
      originX: config.move.xOffset,
      originY: height - config.move.yOffset,
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
      originX: width - config.shoot.xOffset,
      originY: height - config.shoot.yOffset,
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

    // モードに応じた初期ビジュアルを適用
    this.applyModeVisuals();

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
    originX: number;
    originY: number;
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
      originX,
      originY,
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

    const container = this.add.container(originX, originY);
    const baseBg = this.add.graphics();
    container.add(baseBg);

    // スティック中央テキストラベル
    const stickLabel = addCrispText(this, 0, 0, label, {
      fontSize: "20px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#94a3b8",
    }).setOrigin(0.5);
    container.add(stickLabel);

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
    knob.add(knobGraphics);
    container.add(knob);

    return {
      container,
      baseBg,
      label: stickLabel,
      knob,
      knobGraphics,
      aimIndicator,
      pointerId: null,
      baseX: originX,
      baseY: originY,
      originX,
      originY,
      maxRadius,
      deadZone,
      baseRadius,
      knobRadius,
      baseColor,
      borderColor,
      knobColor,
      labelText: label,
      isAimStick,
      state: {
        x: 0,
        y: 0,
        active: false,
        angle: 0,
        force: 0,
      },
    };
  }

  /**
   * PCモード / スマホモードに応じたビジュアル描画の切り替え
   */
  protected applyModeVisuals() {
    if (this.inputMode === "pc") {
      const isCursorFollow = useGameSettings.getState().followCursor;

      // 1. 移動スティックは非表示
      this.moveStick.container.setVisible(false);

      if (isCursorFollow) {
        // カーソル追従有効時: スティック操作は無効のため攻撃スティックも非表示
        this.shootStick.container.setVisible(false);
      } else {
        // 2. カーソル追従無効時: 中央ドットと外の円だけのシンプルなUI + 高透明度
        this.shootStick.container.setVisible(true);
        this.shootStick.container.setAlpha(0);

        if (this.shootStick.label) {
          this.shootStick.label.setVisible(false);
        }

        // 外枠のシンプルな円のみ
        this.shootStick.baseBg.clear();
        this.shootStick.baseBg.fillStyle(0x0f172a, 0.2);
        this.shootStick.baseBg.fillCircle(0, 0, this.shootStick.baseRadius);
        this.shootStick.baseBg.lineStyle(2, 0xffffff, 0.35);
        this.shootStick.baseBg.strokeCircle(0, 0, this.shootStick.baseRadius);

        // 中央ドット＋シンプルな外周円のノブ
        this.shootStick.knobGraphics.clear();
        this.shootStick.knobGraphics.fillStyle(0xf43f5e, 0.4);
        this.shootStick.knobGraphics.fillCircle(0, 0, 26);
        this.shootStick.knobGraphics.lineStyle(2, 0xffffff, 0.6);
        this.shootStick.knobGraphics.strokeCircle(0, 0, 26);
        this.shootStick.knobGraphics.fillStyle(0xffffff, 0.85);
        this.shootStick.knobGraphics.fillCircle(0, 0, 5);
      }
    } else {
      // --- スマホモード ---
      // 1. 移動スティックを表示・描画
      this.moveStick.container.setVisible(true);
      this.moveStick.container.setAlpha(0.6);
      this.drawFullStickGraphics(this.moveStick);

      // 2. 攻撃スティックを標準モバイルUIで描画
      this.shootStick.container.setVisible(true);
      this.shootStick.container.setAlpha(0.6);
      this.drawFullStickGraphics(this.shootStick);
    }
  }

  /**
   * モバイル向けのリッチなスティック描画（装飾線・ラベル等）
   */
  protected drawFullStickGraphics(stick: StickVisuals) {
    if (stick.label) {
      stick.label.setVisible(true);
    }

    stick.baseBg.clear();
    stick.baseBg.fillStyle(stick.baseColor, 0.45);
    stick.baseBg.fillCircle(0, 0, stick.baseRadius);
    stick.baseBg.lineStyle(4, stick.borderColor, 0.7);
    stick.baseBg.strokeCircle(0, 0, stick.baseRadius);
    stick.baseBg.lineStyle(2, stick.borderColor, 0.3);
    stick.baseBg.strokeCircle(0, 0, stick.baseRadius * 0.5);
    stick.baseBg.lineStyle(1.5, stick.borderColor, 0.25);
    stick.baseBg.lineBetween(-stick.baseRadius * 0.75, 0, stick.baseRadius * 0.75, 0);
    stick.baseBg.lineBetween(0, -stick.baseRadius * 0.75, 0, stick.baseRadius * 0.75);

    stick.knobGraphics.clear();
    stick.knobGraphics.fillStyle(stick.knobColor, 0.85);
    stick.knobGraphics.fillCircle(0, 0, stick.knobRadius);
    stick.knobGraphics.lineStyle(3.5, 0xffffff, 0.9);
    stick.knobGraphics.strokeCircle(0, 0, stick.knobRadius);
    stick.knobGraphics.fillStyle(0xffffff, 0.8);
    stick.knobGraphics.fillCircle(0, 0, 7);
  }

  /**
   * 入力モード（PC vs スマホ）が変化した際のハンドラ
   */
  protected handleInputModeChange(newMode: InputMode) {
    if (this.inputMode === newMode) return;
    this.inputMode = newMode;
    this.resetAllSticks();
    this.applyModeVisuals();
  }

  // ==========================================
  // タッチ/ポインターイベント処理
  // ==========================================

  protected handlePointerDown(pointer: Phaser.Input.Pointer) {
    const nativeEvent = pointer.event as PointerEvent | undefined;
    const pointerType = nativeEvent?.pointerType;

    // ネイティブPointerEventの種別により即座にモードを更新
    if (pointerType === "touch") {
      useInputMode.getState().setMode("mobile");
    } else if (pointerType === "mouse") {
      useInputMode.getState().setMode("pc");
    }

    if (this.inputMode === "pc") {
      const isCursorFollow = useGameSettings.getState().followCursor;
      // PCモードかつカーソル追従有効時はGameSceneが直接マウスクリックを処理するためスティックは無視
      if (!isCursorFollow && this.shootStick.pointerId === null) {
        this.activateStick(this.shootStick, pointer);
      }
    } else {
      // スマホモード: 画面左半分で移動、画面右半分で攻撃
      const { width } = this.scale;
      if (pointer.x < width / 2 && this.moveStick.pointerId === null) {
        this.activateStick(this.moveStick, pointer);
      } else if (pointer.x >= width / 2 && this.shootStick.pointerId === null) {
        this.activateStick(this.shootStick, pointer);
      }
    }
  }

  /**
   * ポインターをスティックに割り当てて開始
   */
  protected activateStick(stick: StickVisuals, pointer: Phaser.Input.Pointer) {
    stick.pointerId = pointer.id;

    const isDynamic = useGameSettings.getState().joystickType === "dynamic";

    // PCモード時、またはスマホでDynamicモードの場合はクリック位置を中心とする
    if (this.inputMode === "pc" || isDynamic) {
      this.tweens.killTweensOf(stick.container);
      stick.baseX = pointer.x;
      stick.baseY = pointer.y;
      stick.container.setPosition(pointer.x, pointer.y);
    }

    // PCモードでは高透明度（0.38）、スマホではしっかり表示（1.0）
    stick.container.setAlpha(this.inputMode === "pc" ? 0.38 : 1.0);
    this.updateStickPosition(stick, pointer.x, pointer.y);
    this.notifyGameScene();
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
    let dx = pointerX - stick.baseX;
    let dy = pointerY - stick.baseY;
    let distance = Math.hypot(dx, dy);
    let angle = Math.atan2(dy, dx);

    const isDynamic = useGameSettings.getState().joystickType === "dynamic";

    // PCモード時、またはスマホでDynamicモードの場合、
    // 指/マウスが最大半径を超えて移動した分だけベース中心 (baseX, baseY) を追従移動
    if ((this.inputMode === "pc" || isDynamic) && distance > stick.maxRadius) {
      const excess = distance - stick.maxRadius;
      stick.baseX += Math.cos(angle) * excess;
      stick.baseY += Math.sin(angle) * excess;
      stick.container.setPosition(stick.baseX, stick.baseY);

      // 追従後の距離と変位を再計算
      dx = pointerX - stick.baseX;
      dy = pointerY - stick.baseY;
      distance = Math.hypot(dx, dy);
      angle = Math.atan2(dy, dx);
    }

    // ノブの位置を最大半径内にクランプ
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

      // 照準インジケーター（矢印）の更新（スマホモード時のみ表示）
      if (stick.aimIndicator && this.inputMode === "mobile") {
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

    if (this.inputMode === "pc") {
      // PCモード: 操作終了時は速やかにフェードアウト（視界を確保）
      this.tweens.killTweensOf(stick.container);
      this.tweens.add({
        targets: stick.container,
        alpha: 0,
        duration: 150,
        ease: Phaser.Math.Easing.Sine.Out,
      });
    } else {
      // スマホモード: Dynamic時は初期定位置へ滑らかに戻す
      const isDynamic = useGameSettings.getState().joystickType === "dynamic";
      if (isDynamic) {
        this.tweens.killTweensOf(stick.container);
        this.tweens.add({
          targets: stick.container,
          x: stick.originX,
          y: stick.originY,
          alpha: 0.6,
          duration: 200,
          ease: Phaser.Math.Easing.Sine.Out,
          onComplete: () => {
            stick.baseX = stick.originX;
            stick.baseY = stick.originY;
          },
        });
      } else {
        stick.container.setAlpha(0.6);
      }
    }
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
    if (this.unsubscribeSettings) {
      this.unsubscribeSettings();
      this.unsubscribeSettings = undefined;
    }
    if (this.unsubscribeInputMode) {
      this.unsubscribeInputMode();
      this.unsubscribeInputMode = undefined;
    }
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
