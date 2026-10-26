import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { DEPTH_EFFECTS, DEPTH_OBJECT, PLAYER_TEXTURE_SIZE } from "../constants";
import type { PlayerController } from "./PlayerController";
import type { PlayerStatusHUD } from "./PlayerStatusHUD";
import type { BlinkConfig } from "./types";

/**
 * ブリンク（短距離テレポート）管理マネージャー
 * メーター管理（時間経過自動回復、消費判定）、移動方向へのテレポート座標計算、
 * 演出（アフターイメージ・ワープ軌跡・ショックウェーブ）、効果音再生を担当
 */
export class BlinkManager {
  protected scene!: Phaser.Scene;
  protected config: BlinkConfig;
  protected meter: number;
  protected lastBlinkTime = 0;

  constructor(config: BlinkConfig) {
    this.config = config;
    this.meter = config.maxMeter;
  }

  /**
   * シーンの参照初期化
   */
  init(scene: Phaser.Scene): void {
    this.scene = scene;
    this.meter = this.config.maxMeter;
    this.lastBlinkTime = 0;
  }

  /**
   * 現在のブリンクメーター値を取得（0.0 〜 maxMeter）
   */
  getMeter(): number {
    return this.meter;
  }

  /**
   * 現在のブリンクメーター比率（0.0 〜 1.0）を取得
   */
  getRatio(): number {
    return this.meter / this.config.maxMeter;
  }

  /**
   * ブリンク発動可能かどうか（メーター1/2以上）
   */
  isReady(): boolean {
    return this.meter >= this.config.cost;
  }

  /**
   * ブリンクを実行可能かどうかの総合判定（メーター・クールダウン・自機移動状態）
   */
  canBlink(player: Phaser.Physics.Arcade.Image, playerController: PlayerController): boolean {
    if (!player.active) return false;

    const now = this.scene.time.now;
    if (now - this.lastBlinkTime < this.config.cooldownMs) {
      return false;
    }

    if (!this.isReady()) {
      return false;
    }

    const moveVec = playerController.getMovementVector(player);
    return moveVec.isMoving;
  }

  /**
   * 時間経過によるブリンクメーターの自動回復およびHUD・イベント同期
   */
  update(delta: number, playerStatusHUD?: PlayerStatusHUD): void {
    if (this.meter < this.config.maxMeter) {
      const prevReady = this.isReady();
      this.meter = Math.min(
        this.config.maxMeter,
        this.meter + (delta / 1000) * this.config.recoveryPerSecond,
      );

      playerStatusHUD?.setBlink(this.meter, this.config.maxMeter, 2);

      const nowReady = this.isReady();
      if (prevReady !== nowReady) {
        this.scene.events.emit("blink-state-updated", nowReady);
      }
    }
  }

  /**
   * 移動方向へ短距離テレポートを実行
   */
  execute(
    player: Phaser.Physics.Arcade.Image,
    playerController: PlayerController,
    worldSize: number,
    playerStatusHUD?: PlayerStatusHUD,
  ): boolean {
    if (!this.canBlink(player, playerController)) {
      return false;
    }

    const moveVec = playerController.getMovementVector(player);
    const now = this.scene.time.now;

    this.lastBlinkTime = now;
    this.meter = Math.max(0, this.meter - this.config.cost);
    playerStatusHUD?.setBlink(this.meter, this.config.maxMeter, 2);
    this.scene.events.emit("blink-state-updated", this.isReady());

    const startX = player.x;
    const startY = player.y;

    const padding = PLAYER_TEXTURE_SIZE / 2;
    const targetX = Phaser.Math.Clamp(
      startX + moveVec.x * this.config.distance,
      padding,
      worldSize - padding,
    );
    const targetY = Phaser.Math.Clamp(
      startY + moveVec.y * this.config.distance,
      padding,
      worldSize - padding,
    );

    player.setPosition(targetX, targetY);

    this.playEffects(startX, startY, targetX, targetY, player.rotation);
    AudioManager.getInstance().playSE("blink");

    return true;
  }

  /**
   * テレポート演出エフェクト（残像・ワープ光線・到達衝撃波）
   */
  protected playEffects(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    playerRotation: number,
  ): void {
    // 1. 出発地点の残像（アフターイメージ）
    const ghost = this.scene.add.image(startX, startY, "player");
    ghost.setDepth(DEPTH_OBJECT);
    ghost.setRotation(playerRotation);
    ghost.setTint(0xd946ef);
    ghost.setAlpha(0.7);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 250,
      ease: Phaser.Math.Easing.Sine.Out,
      onComplete: () => ghost.destroy(),
    });

    // 2. テレポート軌跡（高速ワープライン）
    const warpLine = this.scene.add.graphics();
    warpLine.setDepth(DEPTH_EFFECTS);
    warpLine.lineStyle(4, 0xf43f5e, 0.85);
    warpLine.lineBetween(startX, startY, targetX, targetY);
    warpLine.lineStyle(2, 0xffffff, 0.95);
    warpLine.lineBetween(startX, startY, targetX, targetY);
    this.scene.tweens.add({
      targets: warpLine,
      alpha: 0,
      duration: 180,
      ease: Phaser.Math.Easing.Sine.Out,
      onComplete: () => warpLine.destroy(),
    });

    // 3. 到達地点のショックウェーブリング
    const ring = this.scene.add.graphics();
    ring.setDepth(DEPTH_EFFECTS);
    ring.lineStyle(3, 0xd946ef, 0.9);
    ring.strokeCircle(targetX, targetY, 20);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 2.2,
      scaleY: 2.2,
      duration: 220,
      ease: Phaser.Math.Easing.Cubic.Out,
      onComplete: () => ring.destroy(),
    });
  }

  destroy(): void {
    // 特になし
  }
}
