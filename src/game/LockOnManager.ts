import Phaser from "phaser";

import {
  LOCKON_BRACKET_LENGTH,
  LOCKON_DEPTH,
  LOCKON_FLICK_THRESHOLD_MS,
  LOCKON_GUIDE_ALPHA,
  LOCKON_GUIDE_LINE_WIDTH,
  LOCKON_HISTORY_CUTOFF_MS,
  LOCKON_INNER_LINE_WIDTH,
  LOCKON_INNER_OFFSET,
  LOCKON_INNER_RADIUS,
  LOCKON_LINE_WIDTH,
  LOCKON_OUT_OF_SCREEN_BREAK_DISTANCE,
  LOCKON_PRIMARY_ALPHA,
  LOCKON_PRIMARY_COLOR,
  LOCKON_RETICLE_SIZE,
  LOCKON_ROTATION_SPEED,
  LOCKON_SECONDARY_ALPHA,
  LOCKON_SECONDARY_COLOR,
  LOCKON_STABLE_SAMPLE_OFFSET_MS,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
  SHADOW_SCALE_Y,
} from "../constants";
import type { LockOnConfig } from "./types";

interface TargetHistoryEntry {
  target: Phaser.Physics.Arcade.Image;
  time: number;
}

/**
 * 60°扇形スマートロックオン ＆ 撃破チェーン管理マネージャー
 * スティック方向の最寄り敵の吸着、ターゲット枠描画、撃破時の周囲連鎖を担当
 */
export class LockOnManager {
  protected config: LockOnConfig;
  protected lockedTarget: Phaser.Physics.Arcade.Image | null = null;
  protected reticleGraphics!: Phaser.GameObjects.Graphics;
  protected animAngle = 0;
  protected targetHistory: TargetHistoryEntry[] = [];
  protected sessionTargets: Phaser.Physics.Arcade.Image[] = [];
  protected isAimingSession = false;

  constructor(config: LockOnConfig) {
    this.config = config;
  }

  /**
   * レティクル描画オブジェクト等の初期化
   */
  init(scene: Phaser.Scene): void {
    // 敵の上に重なるよう高い深度でグラフィックを生成
    this.reticleGraphics = scene.add.graphics();
    this.reticleGraphics.setDepth(LOCKON_DEPTH);
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
  ): Phaser.Physics.Arcade.Image | null {
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
      if (this.isAimingSession) {
        if (!this.sessionTargets.includes(nearestEnemy)) {
          this.sessionTargets.push(nearestEnemy);
        }
      }
      return nearestEnemy;
    }

    return null;
  }

  /**
   * 360度全方位の画面内最寄り敵を即座にオートロックオン（スティックタップ時用）
   */
  lockNearestEnemy(
    player: Phaser.Physics.Arcade.Image,
    enemies: Phaser.Physics.Arcade.Group,
    scene: Phaser.Scene,
  ): Phaser.Physics.Arcade.Image | null {
    const enemyList = enemies.getChildren() as Phaser.Physics.Arcade.Image[];
    const camera = scene.cameras.main;

    let nearestEnemy: Phaser.Physics.Arcade.Image | null = null;
    let minDistance = Infinity;

    for (const enemy of enemyList) {
      if (!enemy.active) continue;

      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      if (dist > this.config.maxDistance) continue;

      // 画面内判定
      if (!camera.worldView.contains(enemy.x, enemy.y)) continue;

      if (dist < minDistance) {
        minDistance = dist;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      this.lockedTarget = nearestEnemy;
    }
    return nearestEnemy;
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
   * 新しいエイム操作の開始時にセッションと履歴を初期化
   */
  startAimSession(): void {
    this.isAimingSession = true;
    this.targetHistory = [];
    this.sessionTargets = [];
  }

  /**
   * 指離し（Release）時の手ブレ補正（タイムバッファ方式）
   * - 160ms未満のフリック操作: エイム操作中に一番最初にロックオンした敵を採用（未捕捉ならフリック角度で即時探索）
   * - 160ms以上のドラッグ操作: 指が離れる直前（約70ms前）に安定して狙っていたターゲットを採用
   */
  confirmReleaseTarget(
    releaseTime: number,
    touchDuration?: number,
    releaseAngle?: number,
    player?: Phaser.Physics.Arcade.Image,
    enemies?: Phaser.Physics.Arcade.Group,
    scene?: Phaser.Scene,
  ): void {
    this.isAimingSession = false;

    // 【フリック対応】操作時間がしきい値未満の場合
    if (typeof touchDuration === "number" && touchDuration < LOCKON_FLICK_THRESHOLD_MS) {
      // 1. フレーム更新落ち等でセッション内にまだ新ターゲットが捕捉されていない場合、フリック時の角度で即時探索
      if (
        this.sessionTargets.length === 0 &&
        typeof releaseAngle === "number" &&
        player &&
        enemies &&
        scene
      ) {
        this.searchAndLock(player, enemies, releaseAngle, scene);
      }

      // 2. セッション中に一番最初にロックオンしたアクティブな敵を採用
      for (const target of this.sessionTargets) {
        if (target.active) {
          this.lockedTarget = target;
          this.targetHistory = [];
          this.sessionTargets = [];
          return;
        }
      }

      this.targetHistory = [];
      this.sessionTargets = [];
      return;
    }

    // 【通常ドラッグ】指が浮き上がる安定時点のターゲットを探す
    if (this.targetHistory.length > 0) {
      const stableTime = releaseTime - LOCKON_STABLE_SAMPLE_OFFSET_MS;
      let bestEntry: TargetHistoryEntry | null = null;
      let minDiff = Infinity;

      for (const entry of this.targetHistory) {
        if (entry.target.active) {
          const diff = Math.abs(entry.time - stableTime);
          if (diff < minDiff) {
            minDiff = diff;
            bestEntry = entry;
          }
        }
      }

      if (bestEntry && bestEntry.target.active) {
        this.lockedTarget = bestEntry.target;
      }
    }

    this.targetHistory = [];
    this.sessionTargets = [];
  }

  /**
   * 毎フレームのターゲット履歴記録（エイムセッション中のみ過去一定期間分を保持）
   */
  recordTargetHistory(time: number): void {
    if (!this.isAimingSession) {
      return;
    }

    if (this.lockedTarget && this.lockedTarget.active) {
      this.targetHistory.push({
        target: this.lockedTarget,
        time,
      });

      const cutoff = time - LOCKON_HISTORY_CUTOFF_MS;
      while (this.targetHistory.length > 0 && this.targetHistory[0].time < cutoff) {
        this.targetHistory.shift();
      }
    } else {
      this.targetHistory = [];
    }
  }

  /**
   * 毎フレームのロックオン維持チェック ＆ レティクルアニメーション描画
   */
  update(
    player: Phaser.Physics.Arcade.Image,
    delta: number,
    scene: Phaser.Scene,
    time?: number,
  ): void {
    if (typeof time === "number") {
      this.recordTargetHistory(time);
    }

    this.reticleGraphics.clear();

    const target = this.getLockedTarget();
    if (!target) return;

    // ロック解除判定（プレイヤーから離れすぎた場合）
    const distToPlayer = Phaser.Math.Distance.Between(player.x, player.y, target.x, target.y);
    const camera = scene.cameras.main;
    const isOutScreen = !camera.worldView.contains(target.x, target.y);

    if (
      distToPlayer > this.config.breakDistance ||
      (isOutScreen && distToPlayer > LOCKON_OUT_OF_SCREEN_BREAK_DISTANCE)
    ) {
      this.lockedTarget = null;
      return;
    }

    // レティクルの回転アニメーション
    this.animAngle += (delta / 1000) * LOCKON_ROTATION_SPEED;

    // --- 疑似2.5次元 地面設置型ターゲットレティクル描画 ---
    // 敵本体の中心ではなく、敵の足元（地面の接地位置）を基準に描画
    const gx = target.x + SHADOW_OFFSET_X;
    const gy = target.y + SHADOW_OFFSET_Y;
    const rx = LOCKON_RETICLE_SIZE;
    const ry = rx * SHADOW_SCALE_Y; // 斜め見下ろし（2.5D）の扁平楕円

    // 1. 地面のロックオン楕円リング（外周パルス枠）
    this.reticleGraphics.lineStyle(LOCKON_LINE_WIDTH, LOCKON_PRIMARY_COLOR, LOCKON_PRIMARY_ALPHA);
    this.reticleGraphics.strokeEllipse(gx, gy, rx * 2, ry * 2);

    // 2. 地面リング上の回転ブラケット（4つのサイバーコーナーマーク）
    const bracketLen = LOCKON_BRACKET_LENGTH;
    for (let i = 0; i < 4; i++) {
      const angle = this.animAngle + (i * Math.PI) / 2;
      const cornerX = gx + Math.cos(angle) * (rx + 4);
      const cornerY = gy + Math.sin(angle) * (ry + 3);
      // 楕円接線方向と法線方向のL字グラウンドマーカー
      const tangentX = -Math.sin(angle) * (bracketLen * 0.7);
      const tangentY = Math.cos(angle) * (bracketLen * 0.7 * SHADOW_SCALE_Y);
      this.reticleGraphics.strokeLineShape(
        new Phaser.Geom.Line(cornerX, cornerY, cornerX + tangentX, cornerY + tangentY),
      );
    }

    // 3. 地面の内側回転インジケーター（同心楕円 ＋ 4方向の目盛り）
    this.reticleGraphics.lineStyle(
      LOCKON_INNER_LINE_WIDTH,
      LOCKON_SECONDARY_COLOR,
      LOCKON_SECONDARY_ALPHA,
    );
    const innerRx = LOCKON_INNER_RADIUS;
    const innerRy = innerRx * SHADOW_SCALE_Y;
    this.reticleGraphics.strokeEllipse(gx, gy, innerRx * 2, innerRy * 2);

    for (let i = 0; i < 4; i++) {
      const a = -this.animAngle + (i * Math.PI) / 2;
      const x1 = gx + Math.cos(a) * (LOCKON_INNER_OFFSET * 0.8);
      const y1 = gy + Math.sin(a) * (LOCKON_INNER_OFFSET * 0.8 * SHADOW_SCALE_Y);
      const x2 = gx + Math.cos(a) * innerRx;
      const y2 = gy + Math.sin(a) * innerRy;
      this.reticleGraphics.strokeLineShape(new Phaser.Geom.Line(x1, y1, x2, y2));
    }

    // 4. 地面マーカーから敵本体（空中）への垂直ホログラムビーム（2.5Dの高低差を強調）
    this.reticleGraphics.lineStyle(1.5, LOCKON_PRIMARY_COLOR, 0.4);
    this.reticleGraphics.strokeLineShape(new Phaser.Geom.Line(gx, gy, target.x, target.y));

    // 5. プレイヤーから敵へのガイドレーザーライン（足元の接地点と本体の両方へ接続）
    this.reticleGraphics.lineStyle(
      LOCKON_GUIDE_LINE_WIDTH,
      LOCKON_PRIMARY_COLOR,
      LOCKON_GUIDE_ALPHA,
    );
    this.reticleGraphics.strokeLineShape(
      new Phaser.Geom.Line(player.x, player.y, target.x, target.y),
    );
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
