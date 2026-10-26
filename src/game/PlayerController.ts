import Phaser from "phaser";

import type { ControllerInputPayload } from "../scenes/ControllerScene";
import { getControlMode } from "../stores/useInputMode";
import {
  applyDirectionalTexture,
  type CharacterDirection,
  type DirectionalMode,
} from "../utils/directionalSprite";
import type { PlayerConfig } from "./types";

export interface PlayerInputState {
  isMoving: boolean;
  isAiming: boolean;
  aimAngle: number;
}

/**
 * プレイヤー入力および機体アクションコントローラー
 * 索敵モード（ロックオンスティック倒し中）の判定、機体移動、自機の向き制御、射撃トリガーを担当
 */
export class PlayerController {
  protected config: PlayerConfig;
  protected cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  protected wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  protected shiftKey?: Phaser.Input.Keyboard.Key;

  protected virtualInput: ControllerInputPayload = {
    move: { x: 0, y: 0, active: false, angle: 0, force: 0 },
    lockOn: { x: 0, y: 0, active: false, angle: 0, force: 0 },
    attack: false,
  };

  protected currentBank = 0; // 左右バンク（ロール）補間値 (-1.0 ~ 1.0)
  protected currentDirection?: CharacterDirection = "right";
  protected lastFacingAngle = 0; // 初期向き（右向き: 0°）

  constructor(config: PlayerConfig) {
    this.config = config;
  }

  /**
   * 入力キーの初期化
   */
  init(scene: Phaser.Scene): void {
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasdKeys = scene.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
      }) as {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
      };
      this.shiftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    }
  }

  /**
   * バーチャルスティックからの入力を更新
   */
  setVirtualInput(input: ControllerInputPayload): void {
    this.virtualInput = input;
  }

  /**
   * 毎フレームの移動入力受付、移動速度更新、機体向き更新、射撃トリガー、ブリンクトリガー
   */
  update(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Image,
    lockedTarget: Phaser.Physics.Arcade.Image | null,
    onShoot: (shootAngle: number) => void,
    onBlink?: () => void,
  ): PlayerInputState {
    let vx = 0;
    let vy = 0;

    // --- 1. 移動入力の計算 ---
    if (this.virtualInput.move.active) {
      // スティックの傾きの深さに依存せず、常に最高速（config.speed）で移動する
      const moveLen = Math.hypot(this.virtualInput.move.x, this.virtualInput.move.y);
      if (moveLen > 0) {
        vx = (this.virtualInput.move.x / moveLen) * this.config.speed;
        vy = (this.virtualInput.move.y / moveLen) * this.config.speed;
      }
    } else {
      const isLeft = Boolean(
        (this.cursors && this.cursors.left.isDown) || (this.wasdKeys && this.wasdKeys.A.isDown),
      );
      const isRight = Boolean(
        (this.cursors && this.cursors.right.isDown) || (this.wasdKeys && this.wasdKeys.D.isDown),
      );
      const isUp = Boolean(
        (this.cursors && this.cursors.up.isDown) || (this.wasdKeys && this.wasdKeys.W.isDown),
      );
      const isDown = Boolean(
        (this.cursors && this.cursors.down.isDown) || (this.wasdKeys && this.wasdKeys.S.isDown),
      );

      if (isLeft) vx -= this.config.speed;
      if (isRight) vx += this.config.speed;
      if (isUp) vy -= this.config.speed;
      if (isDown) vy += this.config.speed;

      if (vx !== 0 && vy !== 0) {
        vx *= Math.SQRT1_2;
        vy *= Math.SQRT1_2;
      }
    }

    player.setVelocity(vx, vy);

    const controlMode = getControlMode();
    const isKeyboardMouse = controlMode === "keyboardMouse";

    // --- 2. 照準角度・索敵モードの判定 ---
    let isAiming = false;
    let aimAngle = 0;

    if (isKeyboardMouse) {
      // キーボード&マウスモードでは、ロックオン機能は無効、常にカーソルの方向を向く
      const pointer = scene.input.activePointer;
      if (pointer && (pointer.worldX !== 0 || pointer.worldY !== 0)) {
        aimAngle = Math.atan2(pointer.worldY - player.y, pointer.worldX - player.x);
      }
    } else {
      // スマホモードまたはPCスマホモード：スティック入力を索敵に使用
      isAiming = this.virtualInput.lockOn.active;
      aimAngle = this.virtualInput.lockOn.angle;
    }

    // --- 3. 2次元スプライト方式（斜め4方向または左右2方向）テクスチャ切り替え ＆ 微小バンク ---
    let facingAngle = this.lastFacingAngle;

    if (isKeyboardMouse) {
      facingAngle = aimAngle;
    } else {
      if (isAiming) {
        facingAngle = aimAngle;
      } else if (lockedTarget && lockedTarget.active) {
        facingAngle = Phaser.Math.Angle.Between(player.x, player.y, lockedTarget.x, lockedTarget.y);
      } else if (this.virtualInput.move.active) {
        facingAngle = this.virtualInput.move.angle;
      } else if (vx !== 0 || vy !== 0) {
        facingAngle = Math.atan2(vy, vx);
      }
    }
    this.lastFacingAngle = facingAngle;

    const mode: DirectionalMode = this.config.directionalMode ?? "horizontal2";
    this.currentDirection = applyDirectionalTexture(
      player,
      "player",
      mode,
      facingAngle,
      this.currentDirection,
    );

    // 360度回転は行わず、水平移動時の微小ティルト（約3度）のみ付与
    const targetBank = Phaser.Math.Clamp(vx / this.config.speed, -1, 1);
    this.currentBank = Phaser.Math.Linear(this.currentBank, targetBank, 0.15);
    const subtleTilt = this.currentBank * 0.05;
    player.setRotation(subtleTilt);
    player.setScale(1.0, 1.0);

    // --- 4. 攻撃判定（タップまたは長押し連射） ---
    if (isKeyboardMouse) {
      // キーボード&マウスモード：左クリック（またはスペースキー）で発射
      const isShooting = Boolean(
        scene.input.activePointer.isDown || (this.cursors && this.cursors.space.isDown),
      );
      if (isShooting) {
        // 常にカーソル方向へ発射
        onShoot(aimAngle);
      }
    } else {
      // スマホモードまたはPCスマホモード：右側攻撃パッドの押下でのみ発射
      if (this.virtualInput.attack) {
        const shootAngle =
          lockedTarget && lockedTarget.active
            ? Phaser.Math.Angle.Between(player.x, player.y, lockedTarget.x, lockedTarget.y)
            : player.rotation - Math.PI / 2;
        onShoot(shootAngle);
      }
    }

    // --- 5. ブリンク判定 ---
    // キーボード&マウスモードのみShiftブリンクが有効。PCスマホモードでは無効化
    if (isKeyboardMouse && this.shiftKey && Phaser.Input.Keyboard.JustDown(this.shiftKey)) {
      onBlink?.();
    }

    const isMoving =
      Boolean(player.body && (player.body.velocity.x !== 0 || player.body.velocity.y !== 0)) ||
      this.virtualInput.move.active;

    return {
      isMoving,
      isAiming,
      aimAngle,
    };
  }

  /**
   * 現在の移動方向ベクトル（正規化済み）と移動中フラグを取得
   */
  getMovementVector(player: Phaser.Physics.Arcade.Image): {
    x: number;
    y: number;
    isMoving: boolean;
    angle: number;
  } {
    let vx = 0;
    let vy = 0;

    if (this.virtualInput.move.active) {
      vx = this.virtualInput.move.x;
      vy = this.virtualInput.move.y;
    } else {
      const isLeft = Boolean(
        (this.cursors && this.cursors.left.isDown) || (this.wasdKeys && this.wasdKeys.A.isDown),
      );
      const isRight = Boolean(
        (this.cursors && this.cursors.right.isDown) || (this.wasdKeys && this.wasdKeys.D.isDown),
      );
      const isUp = Boolean(
        (this.cursors && this.cursors.up.isDown) || (this.wasdKeys && this.wasdKeys.W.isDown),
      );
      const isDown = Boolean(
        (this.cursors && this.cursors.down.isDown) || (this.wasdKeys && this.wasdKeys.S.isDown),
      );

      if (isLeft) vx -= 1;
      if (isRight) vx += 1;
      if (isUp) vy -= 1;
      if (isDown) vy += 1;
    }

    if (vx === 0 && vy === 0 && player.body) {
      vx = player.body.velocity.x;
      vy = player.body.velocity.y;
    }

    const length = Math.hypot(vx, vy);
    const isMoving = length > 0.01;
    const angle = isMoving ? Math.atan2(vy, vx) : 0;
    const normX = isMoving ? vx / length : 0;
    const normY = isMoving ? vy / length : 0;

    return {
      x: normX,
      y: normY,
      isMoving,
      angle,
    };
  }

  /**
   * 現在プレイヤーが向いている方向角（ラジアン）を取得
   */
  getFacingAngle(): number {
    return this.lastFacingAngle;
  }

  /**
   * リソース解放
   */
  destroy(): void {
    // 特になし
  }
}
