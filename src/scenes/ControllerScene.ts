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
  lockOn: StickState;
  attack: boolean; // 画面右下の攻撃パッドをタップまたは長押し中
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
  hasExceededDeadZone: boolean;
  state: StickState;
}

export class ControllerScene extends Phaser.Scene {
  protected moveStick!: StickVisuals;
  protected lockOnStick!: StickVisuals;
  protected attackPointerIds = new Set<number>();
  protected inputMode: InputMode = "mobile";
  protected unsubscribeSettings?: () => void;
  protected unsubscribeInputMode?: () => void;

  // 画面右下の1/4円攻撃パッド
  protected attackPadContainer!: Phaser.GameObjects.Container;
  protected attackPadBg!: Phaser.GameObjects.Graphics;
  protected attackPadLabel!: Phaser.GameObjects.Text;
  protected readonly attackPadRadius = 240; // 画面右下の角を中心とする攻撃扇形の半径
  protected stickTouchStartTime = 0;

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
      lockOn: {
        xOffset: 460, // 攻撃パッドの外側の快適な初期配置
        yOffset: 260,
        baseRadius: 90,
        knobRadius: 42,
        deadZone: 14,
        maxRadius: 80,
        baseColor: 0x0f172a,
        borderColor: 0xf43f5e,
        knobColor: 0xe11d48,
        label: "LOCK-ON",
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

    // --- 画面右下: 1/4円の攻撃パッド ---
    this.createAttackPad(width, height);

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

    // --- 右側: ロックオンバーチャルスティック ---
    this.lockOnStick = this.createVirtualStick({
      originX: width - config.lockOn.xOffset,
      originY: height - config.lockOn.yOffset,
      baseRadius: config.lockOn.baseRadius,
      knobRadius: config.lockOn.knobRadius,
      maxRadius: config.lockOn.maxRadius,
      deadZone: config.lockOn.deadZone,
      baseColor: config.lockOn.baseColor,
      borderColor: config.lockOn.borderColor,
      knobColor: config.lockOn.knobColor,
      label: config.lockOn.label,
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
   * 画面右下の1/4円攻撃パッドの生成
   */
  protected createAttackPad(width: number, height: number) {
    this.attackPadContainer = this.add.container(0, 0);
    this.attackPadContainer.setDepth(40);

    this.attackPadBg = this.add.graphics();
    this.attackPadContainer.add(this.attackPadBg);

    // 「FIRE」ラベルテキスト
    this.attackPadLabel = addCrispText(this, width - 90, height - 90, "FIRE", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.attackPadContainer.add(this.attackPadLabel);

    this.drawAttackPadGraphics(false);
  }

  /**
   * 攻撃パッドの扇形グラフィック描画
   */
  protected drawAttackPadGraphics(isPressed: boolean) {
    const { width, height } = this.scale;
    this.attackPadBg.clear();

    const fillAlpha = isPressed ? 0.6 : 0.35;
    const strokeAlpha = isPressed ? 0.95 : 0.7;

    this.attackPadBg.fillStyle(0xf43f5e, fillAlpha);
    this.attackPadBg.lineStyle(4, 0xf43f5e, strokeAlpha);

    // 右下の角 (width, height) を中心とする 1/4 円（Math.PI 〜 1.5 * Math.PI）
    this.attackPadBg.beginPath();
    this.attackPadBg.moveTo(width, height);
    this.attackPadBg.arc(width, height, this.attackPadRadius, Math.PI, Math.PI * 1.5);
    this.attackPadBg.closePath();
    this.attackPadBg.fillPath();
    this.attackPadBg.strokePath();

    // 内側の装飾アークライン
    this.attackPadBg.lineStyle(2, 0xffffff, isPressed ? 0.8 : 0.4);
    this.attackPadBg.beginPath();
    this.attackPadBg.arc(width, height, this.attackPadRadius * 0.55, Math.PI, Math.PI * 1.5);
    this.attackPadBg.strokePath();
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
    container.setDepth(100);

    // 1. スティック土台背景
    const baseBg = this.add.graphics();
    container.add(baseBg);

    // 2. ラベルテキスト
    const labelText = addCrispText(this, 0, baseRadius + 14, label, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#94a3b8",
      fontStyle: "bold",
    }).setOrigin(0.5);
    container.add(labelText);

    // 3. 照準方向インジケーター（矢印）
    let aimIndicator: Phaser.GameObjects.Graphics | undefined;
    if (isAimStick) {
      aimIndicator = this.add.graphics();
      aimIndicator.setVisible(false);
      container.add(aimIndicator);
    }

    // 4. スティックノブ
    const knob = this.add.container(0, 0);
    const knobGraphics = this.add.graphics();
    knob.add(knobGraphics);
    container.add(knob);

    return {
      container,
      baseBg,
      label: labelText,
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
      hasExceededDeadZone: false,
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
    const isDynamic = useGameSettings.getState().joystickType === "dynamic";

    if (this.inputMode === "pc") {
      const isCursorFollow = useGameSettings.getState().followCursor;

      this.moveStick.container.setVisible(false);
      this.attackPadContainer.setVisible(false);

      if (isCursorFollow) {
        this.lockOnStick.container.setVisible(false);
      } else {
        this.lockOnStick.container.setVisible(true);
        this.lockOnStick.baseX = this.lockOnStick.originX;
        this.lockOnStick.baseY = this.lockOnStick.originY;
        this.lockOnStick.container.setPosition(this.lockOnStick.originX, this.lockOnStick.originY);
        this.lockOnStick.container.setAlpha(0.6);

        if (this.lockOnStick.label) {
          this.lockOnStick.label.setVisible(false);
        }

        this.lockOnStick.baseBg.clear();
        this.lockOnStick.baseBg.fillStyle(0x0f172a, 0.2);
        this.lockOnStick.baseBg.fillCircle(0, 0, this.lockOnStick.baseRadius);
        this.lockOnStick.baseBg.lineStyle(2, 0xffffff, 0.35);
        this.lockOnStick.baseBg.strokeCircle(0, 0, this.lockOnStick.baseRadius);

        this.lockOnStick.knobGraphics.clear();
        this.lockOnStick.knobGraphics.fillStyle(0xf43f5e, 0.4);
        this.lockOnStick.knobGraphics.fillCircle(0, 0, 26);
        this.lockOnStick.knobGraphics.lineStyle(2, 0xffffff, 0.6);
        this.lockOnStick.knobGraphics.strokeCircle(0, 0, 26);
        this.lockOnStick.knobGraphics.fillStyle(0xffffff, 0.85);
        this.lockOnStick.knobGraphics.fillCircle(0, 0, 5);
      }
    } else {
      // --- スマホモード ---
      // 1. 右下攻撃パッドを表示
      this.attackPadContainer.setVisible(true);
      this.drawAttackPadGraphics(this.attackPointerIds.size > 0);

      // 2. 移動スティックを表示
      this.moveStick.container.setVisible(true);
      this.moveStick.container.setAlpha(0.6);
      this.drawFullStickGraphics(this.moveStick);

      // 3. ロックオンスティックの表示（Dynamic時は非操作時は非表示にして視界を遮らない）
      this.lockOnStick.container.setVisible(true);
      if (isDynamic) {
        this.lockOnStick.container.setAlpha(0);
      } else {
        this.lockOnStick.baseX = this.lockOnStick.originX;
        this.lockOnStick.baseY = this.lockOnStick.originY;
        this.lockOnStick.container.setPosition(this.lockOnStick.originX, this.lockOnStick.originY);
        this.lockOnStick.container.setAlpha(0.6);
      }
      this.drawFullStickGraphics(this.lockOnStick);
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

    if (pointerType === "touch") {
      useInputMode.getState().setMode("mobile");
    } else if (pointerType === "mouse") {
      useInputMode.getState().setMode("pc");
    }

    if (this.inputMode === "pc") {
      const isCursorFollow = useGameSettings.getState().followCursor;
      if (!isCursorFollow && this.lockOnStick.pointerId === null) {
        this.activateStick(this.lockOnStick, pointer);
      }
    } else {
      // スマホモード:
      // - 画面左半分: 移動スティック
      // - 画面右半分:
      //   - 右下1/4円の内側: 攻撃パッド（タップ/長押し連射）
      //   - 右下1/4円の外側: ダイナミック・ロックオンスティック
      const { width, height } = this.scale;
      if (pointer.x < width / 2 && this.moveStick.pointerId === null) {
        this.activateStick(this.moveStick, pointer);
      } else if (pointer.x >= width / 2) {
        const distFromCorner = Math.hypot(width - pointer.x, height - pointer.y);

        if (distFromCorner <= this.attackPadRadius) {
          // 1/4円の内側: 攻撃発動
          this.attackPointerIds.add(pointer.id);
          this.drawAttackPadGraphics(true);
          this.notifyGameScene();
        } else if (this.lockOnStick.pointerId === null) {
          // 1/4円の外側: ロックオンスティック操作
          this.activateStick(this.lockOnStick, pointer);
        }
      }
    }
  }

  /**
   * ポインターをスティックに割り当てて開始
   */
  protected activateStick(stick: StickVisuals, pointer: Phaser.Input.Pointer) {
    stick.pointerId = pointer.id;
    stick.hasExceededDeadZone = false;
    this.stickTouchStartTime = this.time.now;

    const isDynamic = useGameSettings.getState().joystickType === "dynamic";

    if (isDynamic) {
      this.tweens.killTweensOf(stick.container);
      stick.baseX = pointer.x;
      stick.baseY = pointer.y;
      stick.container.setPosition(pointer.x, pointer.y);
    } else {
      stick.baseX = stick.originX;
      stick.baseY = stick.originY;
      stick.container.setPosition(stick.originX, stick.originY);
    }

    stick.container.setAlpha(1.0);
    this.updateStickPosition(stick, pointer.x, pointer.y);
    this.notifyGameScene();
  }

  protected handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (pointer.id === this.moveStick.pointerId) {
      this.updateStickPosition(this.moveStick, pointer.x, pointer.y);
      this.notifyGameScene();
    } else if (pointer.id === this.lockOnStick.pointerId) {
      this.updateStickPosition(this.lockOnStick, pointer.x, pointer.y);
      this.notifyGameScene();
    }
  }

  protected handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id === this.moveStick.pointerId) {
      this.releaseStick(this.moveStick);
      this.notifyGameScene();
    } else if (pointer.id === this.lockOnStick.pointerId) {
      this.releaseStick(this.lockOnStick);
      this.notifyGameScene();
    } else if (this.attackPointerIds.has(pointer.id)) {
      this.attackPointerIds.delete(pointer.id);
      this.drawAttackPadGraphics(this.attackPointerIds.size > 0);
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

    // Dynamic 追従移動（指が最大半径を超えた場合）
    if (isDynamic && distance > stick.maxRadius) {
      const excess = distance - stick.maxRadius;
      stick.baseX += Math.cos(angle) * excess;
      stick.baseY += Math.sin(angle) * excess;
      stick.container.setPosition(stick.baseX, stick.baseY);

      dx = pointerX - stick.baseX;
      dy = pointerY - stick.baseY;
      distance = Math.hypot(dx, dy);
      angle = Math.atan2(dy, dx);
    }

    const clampedDist = Math.min(distance, stick.maxRadius);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    stick.knob.setPosition(knobX, knobY);

    if (distance > stick.deadZone) {
      stick.hasExceededDeadZone = true;
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
    // 【仕様1】ロックオンスティックをタップして離した場合（デッドゾーン未満かつ短時間）
    const isLockOnTap =
      stick === this.lockOnStick &&
      !stick.hasExceededDeadZone &&
      this.time.now - this.stickTouchStartTime < 350;

    if (isLockOnTap) {
      const gameScene = this.scene.get("GameScene");
      if (gameScene) {
        gameScene.events.emit("controller-lockon-tap");
      }
    }

    stick.pointerId = null;
    stick.state.x = 0;
    stick.state.y = 0;
    stick.state.active = false;
    stick.state.force = 0;
    stick.hasExceededDeadZone = false;

    if (stick.aimIndicator) {
      stick.aimIndicator.setVisible(false);
    }

    this.tweens.killTweensOf(stick.knob);
    this.tweens.add({
      targets: stick.knob,
      x: 0,
      y: 0,
      duration: 100,
      ease: Phaser.Math.Easing.Sine.Out,
    });

    const isDynamic = useGameSettings.getState().joystickType === "dynamic";
    if (isDynamic) {
      this.tweens.killTweensOf(stick.container);
      this.tweens.add({
        targets: stick.container,
        alpha: 0,
        duration: 200,
        ease: Phaser.Math.Easing.Sine.Out,
      });
    } else {
      stick.container.setAlpha(0.6);
    }
  }

  /**
   * 全スティックのリセット
   */
  protected resetAllSticks() {
    if (this.moveStick) this.releaseStick(this.moveStick);
    if (this.lockOnStick) this.releaseStick(this.lockOnStick);
    this.attackPointerIds.clear();
    this.drawAttackPadGraphics(false);
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
      lockOn: { ...this.lockOnStick.state },
      attack: this.attackPointerIds.size > 0,
    };

    gameScene.events.emit("controller-input", payload);
  }
}
