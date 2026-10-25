import type Phaser from "phaser";

import { smoothDamp } from "../utils/math";
import type { CameraConfig } from "./types";

/**
 * 視線先行（Look-ahead）追従カメラマネージャー
 * 自機の移動への遅延ゼロ追従と、視線方向へのSmoothDamp（臨界減衰スプリング）加速度的オフセットを管理する
 */
export class CameraManager {
  protected config: CameraConfig;
  protected camera!: Phaser.Cameras.Scene2D.Camera;
  protected cameraTarget!: Phaser.GameObjects.Zone;

  protected currentLookOffsetX = 0;
  protected currentLookOffsetY = 0;
  protected currentLookVelocityX = 0;
  protected currentLookVelocityY = 0;

  constructor(config: CameraConfig) {
    this.config = config;
  }

  /**
   * カメラおよび注視ターゲットの初期化
   */
  init(scene: Phaser.Scene, worldSize: number, startX: number, startY: number): void {
    this.camera = scene.cameras.main;

    // ワールド境界の設定
    this.camera.setBounds(0, 0, worldSize, worldSize);

    // カメラが追従する見えない注視点ターゲット
    this.cameraTarget = scene.add.zone(startX, startY, 1, 1);

    // 自機位置への追従は遅延ゼロ（lerp = 1）で開始
    this.camera.startFollow(this.cameraTarget, false, 1, 1);
  }

  /**
   * 毎フレームの視線先行（Look-ahead）オフセット計算
   * - スティック操作中: ロック中の敵に関係なくスティック方向へオフセット
   * - 指離し時 ＆ ロックオン中: ロック対象の方向へオフセット
   * - ロックオンされていない時: 移動中であってもオフセットなし（自機中央固定）
   */
  update(
    player: Phaser.Physics.Arcade.Image,
    _isMoving: boolean,
    isAiming: boolean,
    delta: number,
    lockedTarget: Phaser.Physics.Arcade.Image | null = null,
    aimAngle?: number,
  ): void {
    let targetOffsetX: number;
    let targetOffsetY: number;

    if (isAiming) {
      // 1. スティック操作中: ロック中の敵に関係なく、スティックの倒した方向へオフセット
      const angle = typeof aimAngle === "number" ? aimAngle : player.rotation - Math.PI / 2;
      targetOffsetX = Math.cos(angle) * this.config.lookAheadDistanceX;
      targetOffsetY = Math.sin(angle) * this.config.lookAheadDistanceY;
    } else if (lockedTarget && lockedTarget.active) {
      // 2. スティック非操作時 ＆ ロックオン中の敵がいる場合: 対象の方向へ先行吸着
      const angleToTarget = Math.atan2(lockedTarget.y - player.y, lockedTarget.x - player.x);
      targetOffsetX = Math.cos(angleToTarget) * this.config.lookAheadDistanceX;
      targetOffsetY = Math.sin(angleToTarget) * this.config.lookAheadDistanceY;
    } else {
      // 3. ロックオンされている敵がいなければ、移動中であってもオフセットなし（自機中央固定）
      targetOffsetX = 0;
      targetOffsetY = 0;
    }

    const dt = delta / 1000;
    if (dt <= 0) return;

    // SmoothDamp (臨界減衰スプリング) による非線形加速度補間
    const dampX = smoothDamp(
      this.currentLookOffsetX,
      targetOffsetX,
      this.currentLookVelocityX,
      this.config.lookAheadSmoothTime,
      this.config.maxLookSpeedX,
      dt,
    );
    this.currentLookOffsetX = dampX.value;
    this.currentLookVelocityX = dampX.velocity;

    const dampY = smoothDamp(
      this.currentLookOffsetY,
      targetOffsetY,
      this.currentLookVelocityY,
      this.config.lookAheadSmoothTime,
      this.config.maxLookSpeedY,
      dt,
    );
    this.currentLookOffsetY = dampY.value;
    this.currentLookVelocityY = dampY.velocity;

    // カメラ注視点は「自機の現在位置 ＋ SmoothDamp補間された視線オフセット」へ即時配置
    this.cameraTarget.x = player.x + this.currentLookOffsetX;
    this.cameraTarget.y = player.y + this.currentLookOffsetY;
  }

  /**
   * 被弾時などの画面シェイク演出
   */
  shake(duration = 150, intensity = 0.01): void {
    this.camera.shake(duration, intensity);
  }

  /**
   * リソース解放
   */
  destroy(): void {
    if (this.cameraTarget) {
      this.cameraTarget.destroy();
    }
  }
}
