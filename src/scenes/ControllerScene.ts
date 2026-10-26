import Phaser from "phaser";

import {
  AIM_ARROW_ANGLE_OFFSET,
  AIM_ARROW_BASE_OFFSET,
  AIM_ARROW_TIP_OFFSET,
  ATTACK_PAD_COLOR,
  ATTACK_PAD_DEPTH,
  ATTACK_PAD_INNER_RING_RATIO,
  ATTACK_PAD_LABEL_OFFSET,
  ATTACK_PAD_RADIUS,
  BLINK_PAD_COLOR,
  BLINK_PAD_DEPTH,
  BLINK_PAD_DISABLED_COLOR,
  BLINK_PAD_INNER_RING_RATIO,
  BLINK_PAD_LABEL_OFFSET,
  BLINK_PAD_RADIUS,
  CONTROLLER_MAX_POINTERS,
  LOCKON_STICK_BASE_COLOR,
  LOCKON_STICK_BASE_RADIUS,
  LOCKON_STICK_BORDER_COLOR,
  LOCKON_STICK_DEAD_ZONE,
  LOCKON_STICK_KNOB_COLOR,
  LOCKON_STICK_KNOB_RADIUS,
  LOCKON_STICK_MAX_RADIUS,
  LOCKON_STICK_X_OFFSET,
  LOCKON_STICK_Y_OFFSET,
  MOVE_STICK_BASE_COLOR,
  MOVE_STICK_BASE_RADIUS,
  MOVE_STICK_BORDER_COLOR,
  MOVE_STICK_DEAD_ZONE,
  MOVE_STICK_KNOB_COLOR,
  MOVE_STICK_KNOB_RADIUS,
  MOVE_STICK_MAX_RADIUS,
  MOVE_STICK_X_OFFSET,
  MOVE_STICK_Y_OFFSET,
  PC_STICK_CENTER_DOT_RADIUS,
  PC_STICK_KNOB_RADIUS,
  STICK_CENTER_DOT_RADIUS,
  STICK_CONTAINER_DEPTH,
  STICK_CONTAINER_FADE_DURATION_MS,
  STICK_KNOB_RESET_DURATION_MS,
  STICK_LABEL_OFFSET_Y,
  STICK_TAP_MAX_DURATION_MS,
  WEAPON_STICK_BASE_COLOR,
  WEAPON_STICK_BASE_RADIUS,
  WEAPON_STICK_BORDER_COLOR,
  WEAPON_STICK_DEAD_ZONE,
  WEAPON_STICK_KNOB_COLOR,
  WEAPON_STICK_KNOB_RADIUS,
  WEAPON_STICK_MAX_RADIUS,
  WEAPON_STICK_SPACING_FROM_FIRE_RADIUS,
  WEAPON_STICK_X_OFFSET,
} from "../constants";
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
  lastAimAngle: number;
  state: StickState;
}

export class ControllerScene extends Phaser.Scene {
  protected moveStick!: StickVisuals;
  protected lockOnStick!: StickVisuals;
  protected weaponStick!: StickVisuals;
  protected attackPointerIds = new Set<number>();
  protected inputMode: InputMode = "mobile";
  protected unsubscribeSettings?: () => void;
  protected unsubscribeInputMode?: () => void;

  // 画面右下の1/4円攻撃パッド
  protected attackPadContainer!: Phaser.GameObjects.Container;
  protected attackPadBg!: Phaser.GameObjects.Graphics;
  protected attackPadLabel!: Phaser.GameObjects.Text;
  protected readonly attackPadRadius = ATTACK_PAD_RADIUS; // 画面右下の角を中心とする攻撃扇形の半径

  // 画面右上の1/4円ブリンクパッド
  protected blinkPadContainer!: Phaser.GameObjects.Container;
  protected blinkPadBg!: Phaser.GameObjects.Graphics;
  protected blinkPadLabel!: Phaser.GameObjects.Text;
  protected readonly blinkPadRadius = BLINK_PAD_RADIUS; // 画面右上の角を中心とするブリンク扇形の半径
  protected blinkPointerIds = new Set<number>();
  protected isBlinkReady = true;

  protected stickTouchStartTime = 0;

  constructor() {
    super("ControllerScene");
  }

  // ==========================================
  // バーチャルスティック設定
  // ==========================================

  protected getStickConfig() {
    return {
      move: {
        xOffset: MOVE_STICK_X_OFFSET,
        yOffset: MOVE_STICK_Y_OFFSET,
        baseRadius: MOVE_STICK_BASE_RADIUS,
        knobRadius: MOVE_STICK_KNOB_RADIUS,
        deadZone: MOVE_STICK_DEAD_ZONE,
        maxRadius: MOVE_STICK_MAX_RADIUS,
        baseColor: MOVE_STICK_BASE_COLOR,
        borderColor: MOVE_STICK_BORDER_COLOR,
        knobColor: MOVE_STICK_KNOB_COLOR,
        label: "MOVE",
      },
      lockOn: {
        xOffset: LOCKON_STICK_X_OFFSET,
        yOffset: LOCKON_STICK_Y_OFFSET,
        baseRadius: LOCKON_STICK_BASE_RADIUS,
        knobRadius: LOCKON_STICK_KNOB_RADIUS,
        deadZone: LOCKON_STICK_DEAD_ZONE,
        maxRadius: LOCKON_STICK_MAX_RADIUS,
        baseColor: LOCKON_STICK_BASE_COLOR,
        borderColor: LOCKON_STICK_BORDER_COLOR,
        knobColor: LOCKON_STICK_KNOB_COLOR,
        label: "LOCK-ON",
      },
      weapon: {
        xOffset: WEAPON_STICK_X_OFFSET,
        yOffset: ATTACK_PAD_RADIUS + WEAPON_STICK_SPACING_FROM_FIRE_RADIUS,
        baseRadius: WEAPON_STICK_BASE_RADIUS,
        knobRadius: WEAPON_STICK_KNOB_RADIUS,
        deadZone: WEAPON_STICK_DEAD_ZONE,
        maxRadius: WEAPON_STICK_MAX_RADIUS,
        baseColor: WEAPON_STICK_BASE_COLOR,
        borderColor: WEAPON_STICK_BORDER_COLOR,
        knobColor: WEAPON_STICK_KNOB_COLOR,
        label: "WEAPON",
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
    this.input.addPointer(CONTROLLER_MAX_POINTERS);

    // --- 画面右下: 1/4円の攻撃パッド ---
    this.createAttackPad(width, height);

    // --- 画面右上: 1/4円のブリンクパッド ---
    this.createBlinkPad(width, height);

    // GameScene からのブリンク可能状態通知を受信
    const gameScene = this.scene.get("GameScene");
    if (gameScene) {
      gameScene.events.on("blink-state-updated", this.handleBlinkStateUpdate, this);
    }

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

    // --- 右側上部: 武器選択バーチャルスティック (Fire半径 + 定数スペースの高さに固定配置) ---
    this.weaponStick = this.createVirtualStick({
      originX: width - config.weapon.xOffset,
      originY: height - config.weapon.yOffset,
      baseRadius: config.weapon.baseRadius,
      knobRadius: config.weapon.knobRadius,
      maxRadius: config.weapon.maxRadius,
      deadZone: config.weapon.deadZone,
      baseColor: config.weapon.baseColor,
      borderColor: config.weapon.borderColor,
      knobColor: config.weapon.knobColor,
      label: config.weapon.label,
      isAimStick: false,
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
    this.attackPadContainer.setDepth(ATTACK_PAD_DEPTH);

    this.attackPadBg = this.add.graphics();
    this.attackPadContainer.add(this.attackPadBg);

    // 「FIRE」ラベルテキスト
    this.attackPadLabel = addCrispText(
      this,
      width - ATTACK_PAD_LABEL_OFFSET,
      height - ATTACK_PAD_LABEL_OFFSET,
      "FIRE",
      {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      },
    ).setOrigin(0.5);
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

    this.attackPadBg.fillStyle(ATTACK_PAD_COLOR, fillAlpha);
    this.attackPadBg.lineStyle(4, ATTACK_PAD_COLOR, strokeAlpha);

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
    this.attackPadBg.arc(
      width,
      height,
      this.attackPadRadius * ATTACK_PAD_INNER_RING_RATIO,
      Math.PI,
      Math.PI * 1.5,
    );
    this.attackPadBg.strokePath();
  }

  /**
   * 画面右上の1/4円ブリンクパッドの生成
   */
  protected createBlinkPad(width: number, _height: number) {
    this.blinkPadContainer = this.add.container(0, 0);
    this.blinkPadContainer.setDepth(BLINK_PAD_DEPTH);

    this.blinkPadBg = this.add.graphics();
    this.blinkPadContainer.add(this.blinkPadBg);

    // 「BLINK」ラベルテキスト
    this.blinkPadLabel = addCrispText(
      this,
      width - BLINK_PAD_LABEL_OFFSET,
      BLINK_PAD_LABEL_OFFSET,
      "BLINK",
      {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      },
    ).setOrigin(0.5);
    this.blinkPadContainer.add(this.blinkPadLabel);

    this.drawBlinkPadGraphics(false);
  }

  /**
   * ブリンクパッドの扇形グラフィック描画
   */
  protected drawBlinkPadGraphics(isPressed: boolean) {
    const { width } = this.scale;
    this.blinkPadBg.clear();

    const canBlink = this.isBlinkReady;
    const baseColor = canBlink ? BLINK_PAD_COLOR : BLINK_PAD_DISABLED_COLOR;
    const fillAlpha = isPressed ? 0.65 : canBlink ? 0.35 : 0.15;
    const strokeAlpha = isPressed ? 0.95 : canBlink ? 0.75 : 0.3;

    this.blinkPadBg.fillStyle(baseColor, fillAlpha);
    this.blinkPadBg.lineStyle(4, baseColor, strokeAlpha);

    // 右上の角 (width, 0) を中心とする 1/4 円（Math.PI * 0.5 〜 Math.PI）
    this.blinkPadBg.beginPath();
    this.blinkPadBg.moveTo(width, 0);
    this.blinkPadBg.arc(width, 0, this.blinkPadRadius, Math.PI * 0.5, Math.PI);
    this.blinkPadBg.closePath();
    this.blinkPadBg.fillPath();
    this.blinkPadBg.strokePath();

    // 内側の装飾アークライン
    this.blinkPadBg.lineStyle(2, 0xffffff, isPressed ? 0.8 : canBlink ? 0.45 : 0.18);
    this.blinkPadBg.beginPath();
    this.blinkPadBg.arc(
      width,
      0,
      this.blinkPadRadius * BLINK_PAD_INNER_RING_RATIO,
      Math.PI * 0.5,
      Math.PI,
    );
    this.blinkPadBg.strokePath();

    if (this.blinkPadLabel) {
      this.blinkPadLabel.setColor(canBlink ? "#ffffff" : "#94a3b8");
      this.blinkPadLabel.setAlpha(canBlink ? 1.0 : 0.5);
    }
  }

  /**
   * ブリンク可能状態（メーター1/2以上）の変化を受け取ってビジュアルを更新
   */
  protected handleBlinkStateUpdate(ready: boolean) {
    if (this.isBlinkReady !== ready) {
      this.isBlinkReady = ready;
      this.drawBlinkPadGraphics(this.blinkPointerIds.size > 0);
    }
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
    container.setDepth(STICK_CONTAINER_DEPTH);

    // 1. スティック土台背景
    const baseBg = this.add.graphics();
    container.add(baseBg);

    // 2. ラベルテキスト
    const labelText = addCrispText(this, 0, baseRadius + STICK_LABEL_OFFSET_Y, label, {
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
      lastAimAngle: 0,
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
      this.attackPadContainer.setVisible(true);
      this.attackPadContainer.setAlpha(0.65);
      this.blinkPadContainer.setVisible(true);
      this.blinkPadContainer.setAlpha(0.65);
      this.drawAttackPadGraphics(this.attackPointerIds.size > 0);
      this.drawBlinkPadGraphics(this.blinkPointerIds.size > 0);

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
        this.lockOnStick.knobGraphics.fillCircle(0, 0, PC_STICK_KNOB_RADIUS);
        this.lockOnStick.knobGraphics.lineStyle(2, 0xffffff, 0.6);
        this.lockOnStick.knobGraphics.strokeCircle(0, 0, PC_STICK_KNOB_RADIUS);
        this.lockOnStick.knobGraphics.fillStyle(0xffffff, 0.85);
        this.lockOnStick.knobGraphics.fillCircle(0, 0, PC_STICK_CENTER_DOT_RADIUS);
      }
    } else {
      // --- スマホモード ---
      // 1. 右下攻撃パッドを表示
      this.attackPadContainer.setVisible(true);
      this.attackPadContainer.setAlpha(1.0);
      this.drawAttackPadGraphics(this.attackPointerIds.size > 0);

      // 2. 右上ブリンクパッドを表示
      this.blinkPadContainer.setVisible(true);
      this.blinkPadContainer.setAlpha(1.0);
      this.drawBlinkPadGraphics(this.blinkPointerIds.size > 0);

      // 3. 移動スティックを表示
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

    // 武器選択スティックの表示（常に定数位置に表示）
    this.weaponStick.container.setVisible(true);
    this.weaponStick.baseX = this.weaponStick.originX;
    this.weaponStick.baseY = this.weaponStick.originY;
    this.weaponStick.container.setPosition(this.weaponStick.originX, this.weaponStick.originY);
    this.weaponStick.container.setAlpha(0.7);
    this.drawFullStickGraphics(this.weaponStick);
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
    stick.knobGraphics.fillCircle(0, 0, STICK_CENTER_DOT_RADIUS);
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

    const { width, height } = this.scale;
    const distFromTopRight = Math.hypot(width - pointer.x, pointer.y);
    const distFromBottomRight = Math.hypot(width - pointer.x, height - pointer.y);

    // 画面右上の1/4円: ブリンク発動（PC / スマホ共通でクリック/タップ可能）
    if (distFromTopRight <= this.blinkPadRadius) {
      this.blinkPointerIds.add(pointer.id);
      this.drawBlinkPadGraphics(true);
      this.triggerBlink();
      return;
    }

    // --- 武器選択スティックのタップ判定 ---
    const distToWeaponStick = Math.hypot(
      pointer.x - this.weaponStick.originX,
      pointer.y - this.weaponStick.originY,
    );
    if (
      distToWeaponStick <= this.weaponStick.baseRadius * 1.5 &&
      this.weaponStick.pointerId === null
    ) {
      this.activateWeaponStick(pointer);
      return;
    }

    if (this.inputMode === "pc") {
      if (distFromBottomRight <= this.attackPadRadius) {
        this.attackPointerIds.add(pointer.id);
        this.drawAttackPadGraphics(true);
        this.notifyGameScene();
        return;
      }

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
      if (pointer.x < width / 2 && this.moveStick.pointerId === null) {
        this.activateStick(this.moveStick, pointer);
      } else if (pointer.x >= width / 2) {
        if (distFromBottomRight <= this.attackPadRadius) {
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

    if (stick === this.lockOnStick) {
      const gameScene = this.scene.get("GameScene");
      gameScene?.events.emit("controller-lockon-start");
    }

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
    if (pointer.id === this.weaponStick.pointerId) {
      this.updateWeaponStickPosition(pointer.x, pointer.y);
    } else if (pointer.id === this.moveStick.pointerId) {
      this.updateStickPosition(this.moveStick, pointer.x, pointer.y);
      this.notifyGameScene();
    } else if (pointer.id === this.lockOnStick.pointerId) {
      this.updateStickPosition(this.lockOnStick, pointer.x, pointer.y);
      this.notifyGameScene();
    }
  }

  protected handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id === this.weaponStick.pointerId) {
      this.releaseWeaponStick();
    } else if (pointer.id === this.moveStick.pointerId) {
      this.releaseStick(this.moveStick);
      this.notifyGameScene();
    } else if (pointer.id === this.lockOnStick.pointerId) {
      this.releaseStick(this.lockOnStick);
      this.notifyGameScene();
    } else if (this.attackPointerIds.has(pointer.id)) {
      this.attackPointerIds.delete(pointer.id);
      this.drawAttackPadGraphics(this.attackPointerIds.size > 0);
      this.notifyGameScene();
    } else if (this.blinkPointerIds.has(pointer.id)) {
      this.blinkPointerIds.delete(pointer.id);
      this.drawBlinkPadGraphics(this.blinkPointerIds.size > 0);
    }
  }

  /**
   * ブリンク発動イベントをGameSceneへ通知
   */
  protected triggerBlink() {
    const gameScene = this.scene.get("GameScene");
    gameScene?.events.emit("controller-blink");
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
      stick.lastAimAngle = angle;
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

        const tipX = Math.cos(angle) * (stick.maxRadius + AIM_ARROW_TIP_OFFSET);
        const tipY = Math.sin(angle) * (stick.maxRadius + AIM_ARROW_TIP_OFFSET);
        const leftX =
          Math.cos(angle + AIM_ARROW_ANGLE_OFFSET) * (stick.maxRadius + AIM_ARROW_BASE_OFFSET);
        const leftY =
          Math.sin(angle + AIM_ARROW_ANGLE_OFFSET) * (stick.maxRadius + AIM_ARROW_BASE_OFFSET);
        const rightX =
          Math.cos(angle - AIM_ARROW_ANGLE_OFFSET) * (stick.maxRadius + AIM_ARROW_BASE_OFFSET);
        const rightY =
          Math.sin(angle - AIM_ARROW_ANGLE_OFFSET) * (stick.maxRadius + AIM_ARROW_BASE_OFFSET);

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
    if (stick === this.lockOnStick) {
      const touchDuration = this.time.now - this.stickTouchStartTime;
      const isLockOnTap = !stick.hasExceededDeadZone && touchDuration < STICK_TAP_MAX_DURATION_MS;

      const gameScene = this.scene.get("GameScene");
      if (gameScene) {
        if (isLockOnTap) {
          gameScene.events.emit("controller-lockon-tap");
        } else {
          // 倒して離した場合: 指離し時の手ブレ巻き戻し補正（タイムバッファ）を発火（フリック時間・エイム角度も送信）
          gameScene.events.emit(
            "controller-lockon-release",
            this.time.now,
            touchDuration,
            stick.lastAimAngle,
          );
        }
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
      duration: STICK_KNOB_RESET_DURATION_MS,
      ease: Phaser.Math.Easing.Sine.Out,
    });

    const isDynamic = useGameSettings.getState().joystickType === "dynamic";
    if (isDynamic) {
      this.tweens.killTweensOf(stick.container);
      this.tweens.add({
        targets: stick.container,
        alpha: 0,
        duration: STICK_CONTAINER_FADE_DURATION_MS,
        ease: Phaser.Math.Easing.Sine.Out,
      });
    } else {
      stick.container.setAlpha(0.6);
    }
  }

  /**
   * 武器選択スティックのタッチ開始
   */
  protected activateWeaponStick(pointer: Phaser.Input.Pointer) {
    this.weaponStick.pointerId = pointer.id;
    this.weaponStick.container.setAlpha(1.0);

    const gameScene = this.scene.get("GameScene");
    gameScene?.events.emit("weapon-stick-start");

    this.updateWeaponStickPosition(pointer.x, pointer.y);
  }

  /**
   * 武器選択スティックの位置・傾き更新
   */
  protected updateWeaponStickPosition(pointerX: number, pointerY: number) {
    const dx = pointerX - this.weaponStick.baseX;
    const dy = pointerY - this.weaponStick.baseY;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(distance, this.weaponStick.maxRadius);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    this.weaponStick.knob.setPosition(knobX, knobY);

    const isDeadZone = distance <= this.weaponStick.deadZone;
    const force = isDeadZone ? 0 : Math.min(distance / this.weaponStick.maxRadius, 1.0);

    const gameScene = this.scene.get("GameScene");
    gameScene?.events.emit("weapon-stick-move", { angle, force, isDeadZone });
  }

  /**
   * 武器選択スティックの指離し（武器選択確定またはキャンセル）
   */
  protected releaseWeaponStick() {
    this.weaponStick.pointerId = null;
    this.weaponStick.container.setAlpha(0.7);

    this.tweens.killTweensOf(this.weaponStick.knob);
    this.tweens.add({
      targets: this.weaponStick.knob,
      x: 0,
      y: 0,
      duration: STICK_KNOB_RESET_DURATION_MS,
      ease: Phaser.Math.Easing.Sine.Out,
    });

    const gameScene = this.scene.get("GameScene");
    gameScene?.events.emit("weapon-stick-release");
  }

  /**
   * 全スティックのリセット
   */
  protected resetAllSticks() {
    if (this.weaponStick && this.weaponStick.pointerId !== null) {
      this.releaseWeaponStick();
    }
    if (this.moveStick) this.releaseStick(this.moveStick);
    if (this.lockOnStick) this.releaseStick(this.lockOnStick);
    this.attackPointerIds.clear();
    this.drawAttackPadGraphics(false);
    this.blinkPointerIds.clear();
    this.drawBlinkPadGraphics(false);
    this.notifyGameScene();
  }

  protected cleanup() {
    this.resetAllSticks();
    const gameScene = this.scene.get("GameScene");
    if (gameScene) {
      gameScene.events.off("blink-state-updated", this.handleBlinkStateUpdate, this);
    }
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
