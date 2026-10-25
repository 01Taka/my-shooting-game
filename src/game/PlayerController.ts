import Phaser from "phaser";

import type { ControllerInputPayload } from "../scenes/ControllerScene";
import { useGameSettings } from "../stores/useGameSettings";
import { useInputMode } from "../stores/useInputMode";
import type { PlayerConfig } from "./types";

export interface PlayerInputState {
  isMoving: boolean;
  isShooting: boolean;
}

/**
 * プレイヤー入力および機体アクションコントローラー
 * キーボード、バーチャルスティック、PCマウス入力を合成し、移動速度・機体向き・射撃トリガーを処理する
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
   * 毎フレームの入力受付、移動速度更新、機体向き更新、射撃判定
   */
  update(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Image,
    time: number,
    onShoot: (angle: number, time: number) => void,
  ): PlayerInputState {
    let vx = 0;
    let vy = 0;

    // --- 1. 移動入力の計算 ---
    if (this.virtualInput.move.active) {
      // 左バーチャルスティックのアナログ入力
      vx = this.virtualInput.move.x * this.config.speed;
      vy = this.virtualInput.move.y * this.config.speed;
    } else {
      // キーボード（カーソルキー & WASD）入力
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

      // 斜め移動時の速度正規化
      if (vx !== 0 && vy !== 0) {
        vx *= Math.SQRT1_2;
        vy *= Math.SQRT1_2;
      }
    }

    player.setVelocity(vx, vy);

    const isPcCursorFollow =
      useInputMode.getState().mode === "pc" && useGameSettings.getState().followCursor;

    // --- 2. 自機の向き（ローテーション）制御 ---
    if (isPcCursorFollow) {
      const pointer = scene.input.activePointer;
      // カメラ追従時は pointer.worldX / worldY でワールド内カーソル位置を取得
      if (pointer && (pointer.worldX !== 0 || pointer.worldY !== 0)) {
        const aimAngle = Math.atan2(pointer.worldY - player.y, pointer.worldX - player.x);
        player.setRotation(aimAngle + Math.PI / 2);
      }
    } else if (this.virtualInput.shoot.active) {
      player.setRotation(this.virtualInput.shoot.angle + Math.PI / 2);
    } else if (this.virtualInput.move.active) {
      player.setRotation(this.virtualInput.move.angle + Math.PI / 2);
    } else if (vx !== 0 || vy !== 0) {
      const moveAngle = Math.atan2(vy, vx);
      player.setRotation(moveAngle + Math.PI / 2);
    }

    // --- 3. 射撃入力の判定 ---
    const isKeyboardShoot = Boolean(this.cursors && this.cursors.space.isDown);
    const isVirtualShoot = this.virtualInput.shoot.active;
    const isMouseShoot = isPcCursorFollow && Boolean(scene.input.activePointer.isDown);
    const isShooting = isVirtualShoot || isKeyboardShoot || isMouseShoot;

    if (isShooting) {
      let shootAngle: number;
      if (isMouseShoot) {
        shootAngle = Math.atan2(
          scene.input.activePointer.worldY - player.y,
          scene.input.activePointer.worldX - player.x,
        );
      } else if (isVirtualShoot) {
        shootAngle = this.virtualInput.shoot.angle;
      } else {
        shootAngle = player.rotation - Math.PI / 2;
      }

      onShoot(shootAngle, time);
    }

    const isMoving =
      (player.body && (player.body.velocity.x !== 0 || player.body.velocity.y !== 0)) ||
      this.virtualInput.move.active;

    return {
      isMoving: Boolean(isMoving),
      isShooting,
    };
  }

  /**
   * リソース解放
   */
  destroy(): void {
    // 特になし
  }
}
