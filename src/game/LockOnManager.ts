import Phaser from "phaser";

import type { LockOnConfig } from "./types";

/**
 * 60°扇形スマートロックオン ＆ 撃破チェーン管理マネージャー
 * スティック方向の最寄り敵の吸着、ターゲット枠描画、撃破時の周囲連鎖を担当
 */
export class LockOnManager {
  protected config: LockOnConfig;
  protected lockedTarget: Phaser.Physics.Arcade.Image | null = null;
  protected reticleGraphics!: Phaser.GameObjects.Graphics;
  protected animAngle = 0;

  constructor(config: LockOnConfig) {
    this.config = config;
  }

  /**
   * レティクル描画オブジェクト等の初期化
   */
  init(scene: Phaser.Scene): void {
    // 敵の上に重なるよう高い深度(depth: 50)でグラフィックを生成
    this.reticleGraphics = scene.add.graphics();
    this.reticleGraphics.setDepth(50);
  }

  /**
   * 現在ロックオン中の敵を取得
   */
  getLockedTarget(): Phaser.Physics.Arcade.Image | null {
    if (this.lockedTarget && this.lockedTarget.active) {
      return this.lockedTarget;
    }
    this.lockedTarget = null;
    return null;
  }

  /**
   * 60°扇形索敵モードによるターゲット選定
   * スティックの向いている角度を中心に、画面内かつ距離内の最も近い敵をロックオン
   */
  searchAndLock(
    player: Phaser.Physics.Arcade.Image,
    enemies: Phaser.Physics.Arcade.Group,
    aimAngle: number,
    scene: Phaser.Scene,
  ): void {
    const enemyList = enemies.getChildren() as Phaser.Physics.Arcade.Image[];
    const halfSectorRad = Phaser.Math.DegToRad(this.config.sectorAngleDeg / 2);
    const camera = scene.cameras.main;

    let nearestEnemy: Phaser.Physics.Arcade.Image | null = null;
    let minDistance = Infinity;

    for (const enemy of enemyList) {
      if (!enemy.active) continue;

      // 1. プレイヤーからの距離チェック
      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      if (dist > this.config.maxDistance) continue;

      // 2. 画面内判定（カメラのワールド表示領域内か、またはわずかなマージン内）
      const inView = camera.worldView.contains(enemy.x, enemy.y);
      if (!inView) continue;

      // 3. 扇形角度チェック
      const angleToEnemy = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
      const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToEnemy - aimAngle));
      if (angleDiff <= halfSectorRad) {
        if (dist < minDistance) {
          minDistance = dist;
          nearestEnemy = enemy;
        }
      }
    }

    if (nearestEnemy) {
      this.lockedTarget = nearestEnemy;
    }
  }

  /**
   * 敵撃破時の周囲チェーンロックオン
   * 倒した敵の位置から周囲半径（chainRadius）以内の最近敵へターゲットを即座に連鎖
   */
  onTargetKilled(
    deadX: number,
    deadY: number,
    enemies: Phaser.Physics.Arcade.Group,
    scene: Phaser.Scene,
  ): Phaser.Physics.Arcade.Image | null {
    const enemyList = enemies.getChildren() as Phaser.Physics.Arcade.Image[];
    const camera = scene.cameras.main;

    let nextEnemy: Phaser.Physics.Arcade.Image | null = null;
    let minDistance = Infinity;

    for (const enemy of enemyList) {
      if (!enemy.active) continue;

      const dist = Phaser.Math.Distance.Between(deadX, deadY, enemy.x, enemy.y);
      if (dist <= this.config.chainRadius && dist > 1) {
        // 画面内判定
        if (camera.worldView.contains(enemy.x, enemy.y)) {
          if (dist < minDistance) {
            minDistance = dist;
            nextEnemy = enemy;
          }
        }
      }
    }

    this.lockedTarget = nextEnemy;
    return nextEnemy;
  }

  /**
   * 毎フレームのロックオン維持チェック ＆ レティクルアニメーション描画
   */
  update(player: Phaser.Physics.Arcade.Image, delta: number, scene: Phaser.Scene): void {
    this.reticleGraphics.clear();

    const target = this.getLockedTarget();
    if (!target) return;

    // ロック解除判定（プレイヤーから離れすぎた場合）
    const distToPlayer = Phaser.Math.Distance.Between(player.x, player.y, target.x, target.y);
    const camera = scene.cameras.main;
    const isOutScreen = !camera.worldView.contains(target.x, target.y);

    if (distToPlayer > this.config.breakDistance || (isOutScreen && distToPlayer > 1000)) {
      this.lockedTarget = null;
      return;
    }

    // レティクルの回転アニメーション
    this.animAngle += (delta / 1000) * 2.5;

    // --- ターゲットレティクル描画 ---
    const tx = target.x;
    const ty = target.y;
    const size = 32;

    // 1. 赤〜オレンジのサイバー系照準枠
    this.reticleGraphics.lineStyle(2.5, 0xf43f5e, 0.9);

    // 四隅のコーナーブラケット [ ]
    const bracketLen = 10;
    // 左上
    this.reticleGraphics.strokeLineShape(
      new Phaser.Geom.Line(tx - size, ty - size + bracketLen, tx - size, ty - size),
    );
    this.reticleGraphics.strokeLineShape(
      new Phaser.Geom.Line(tx - size, ty - size, tx - size + bracketLen, ty - size),
    );
    // 右上
    this.reticleGraphics.strokeLineShape(
      new Phaser.Geom.Line(tx + size, ty - size + bracketLen, tx + size, ty - size),
    );
    this.reticleGraphics.strokeLineShape(
      new Phaser.Geom.Line(tx + size, ty - size, tx + size - bracketLen, ty - size),
    );
    // 左下
    this.reticleGraphics.strokeLineShape(
      new Phaser.Geom.Line(tx - size, ty + size - bracketLen, tx - size, ty + size),
    );
    this.reticleGraphics.strokeLineShape(
      new Phaser.Geom.Line(tx - size, ty + size, tx - size + bracketLen, ty + size),
    );
    // 右下
    this.reticleGraphics.strokeLineShape(
      new Phaser.Geom.Line(tx + size, ty + size - bracketLen, tx + size, ty + size),
    );
    this.reticleGraphics.strokeLineShape(
      new Phaser.Geom.Line(tx + size, ty + size, tx + size - bracketLen, ty + size),
    );

    // 2. 中央の回転ドット/十字インジケーター
    this.reticleGraphics.lineStyle(1.5, 0xfb7185, 0.6);
    const innerRadius = 14;
    for (let i = 0; i < 4; i++) {
      const a = this.animAngle + (i * Math.PI) / 2;
      const x1 = tx + Math.cos(a) * 6;
      const y1 = ty + Math.sin(a) * 6;
      const x2 = tx + Math.cos(a) * innerRadius;
      const y2 = ty + Math.sin(a) * innerRadius;
      this.reticleGraphics.strokeLineShape(new Phaser.Geom.Line(x1, y1, x2, y2));
    }

    // 3. プレイヤーからターゲットへのガイドレーザー点線（薄いライン）
    this.reticleGraphics.lineStyle(1, 0xf43f5e, 0.25);
    this.reticleGraphics.strokeLineShape(new Phaser.Geom.Line(player.x, player.y, tx, ty));
  }

  /**
   * 手動でのロック解除
   */
  clearLock(): void {
    this.lockedTarget = null;
    this.reticleGraphics?.clear();
  }

  /**
   * リソース解放
   */
  destroy(): void {
    this.clearLock();
    this.reticleGraphics?.destroy();
  }
}
