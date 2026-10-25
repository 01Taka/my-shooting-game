import Phaser from "phaser";

import type { ControllerInputPayload } from "../scenes/ControllerScene";
import { useGameSettings } from "../stores/useGameSettings";
import { useInputMode } from "../stores/useInputMode";
import type { PlayerConfig } from "./types";

export interface PlayerInputState {
  isMoving: boolean;
  isAiming: boolean;
  aimAngle: number;
}

/**
 * プレイヤー入力および機体アクションコントローラー
 * 索敵モード（スティック倒し中）の判定、機体移動、自機の向き制御を担当
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

  protected virtualInput: ControllerInputPayload = {
    move: { x: 0, y: 0, active: false, angle: 0, force: 0 },
    shoot: { x: 0, y: 0, active: false, angle: 0, force: 0 },
  };

  protected spaceKeyJustDown = false;
  protected mouseJustDown = false;

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
    }
  }

  /**
   * バーチャルスティックからの入力を更新
   */
  setVirtualInput(input: ControllerInputPayload): void {
    this.virtualInput = input;
  }

  /**
   * 毎フレームの移動入力受付、移動速度更新、機体向き更新
   */
  update(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Image,
    lockedTarget: Phaser.Physics.Arcade.Image | null,
    onTapShoot: (shootAngle: number) => void,
  ): PlayerInputState {
    let vx = 0;
    let vy = 0;

    // --- 1. 移動入力の計算 ---
    if (this.virtualInput.move.active) {
      vx = this.virtualInput.move.x * this.config.speed;
      vy = this.virtualInput.move.y * this.config.speed;
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

    const isPcMode = useInputMode.getState().mode === "pc";
    const isPcCursorFollow = isPcMode && useGameSettings.getState().followCursor;

    // --- 2. 索敵モード（スティック倒し中）の判定 ---
    // force >= 0.4 でデッドライン超え（索敵中）。この間は射撃しない。
    const isStickAiming = this.virtualInput.shoot.active && this.virtualInput.shoot.force >= 0.4;
    let isAiming = isStickAiming;
    let aimAngle = this.virtualInput.shoot.angle;

    if (isPcCursorFollow) {
      const pointer = scene.input.activePointer;
      if (pointer && (pointer.worldX !== 0 || pointer.worldY !== 0)) {
        aimAngle = Math.atan2(pointer.worldY - player.y, pointer.worldX - player.x);
        isAiming = Boolean(pointer.isDown || pointer.rightButtonDown());
      }
    }

    // --- 3. 自機の向き（ローテーション）制御 ---
    if (lockedTarget && lockedTarget.active) {
      // ロックオン対象が存在すれば、常にその敵の方を向く
      const angleToTarget = Phaser.Math.Angle.Between(
        player.x,
        player.y,
        lockedTarget.x,
        lockedTarget.y,
      );
      player.setRotation(angleToTarget + Math.PI / 2);
    } else if (isAiming) {
      // 索敵中はエイム方向を向く
      player.setRotation(aimAngle + Math.PI / 2);
    } else if (this.virtualInput.move.active) {
      player.setRotation(this.virtualInput.move.angle + Math.PI / 2);
    } else if (vx !== 0 || vy !== 0) {
      const moveAngle = Math.atan2(vy, vx);
      player.setRotation(moveAngle + Math.PI / 2);
    }

    // --- 4. PCモードでの単発タップ射撃判定（スペースキーJustDown または 左クリックJustDown） ---
    if (isPcMode) {
      const isSpaceJustDown = Phaser.Input.Keyboard.JustDown(this.cursors.space);
      const pointer = scene.input.activePointer;
      const isPointerJustDown = pointer.primaryDown && !this.mouseJustDown;
      this.mouseJustDown = pointer.primaryDown;

      if (isSpaceJustDown || isPointerJustDown) {
        const shootAngle =
          lockedTarget && lockedTarget.active
            ? Phaser.Math.Angle.Between(player.x, player.y, lockedTarget.x, lockedTarget.y)
            : player.rotation - Math.PI / 2;
        onTapShoot(shootAngle);
      }
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
   * リソース解放
   */
  destroy(): void {
    // 特になし
  }
}
