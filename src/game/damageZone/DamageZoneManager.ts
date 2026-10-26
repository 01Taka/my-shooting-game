import type Phaser from "phaser";

import { EnemyBase } from "../ai";
import { DamageZone } from "./DamageZone";
import type { DamageZoneConfig } from "./types";

export interface TargetContext {
  player?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    damage?: (amount: number) => void;
  };
  enemies?: Array<{
    x: number;
    y: number;
    active: boolean;
    width?: number;
    height?: number;
  }>;
  onDamagePlayer?: (amount: number, zone: DamageZone) => void;
  onDamageEnemy?: (
    enemy: unknown,
    amount: number,
    cc?: { stunDurationMs?: number; slowAmount?: number },
    zone?: DamageZone,
  ) => void;
}

/**
 * ダメージゾーン管理マネージャー (DamageZoneManager)
 * 画面内に存在するすべてのダメージゾーンの生成、更新、当たり判定、効果適用、デバッグ描画を統括する
 */
export class DamageZoneManager {
  private zones: DamageZone[] = [];
  private scene?: Phaser.Scene;
  private debugGraphics?: Phaser.GameObjects.Graphics;
  public debugMode = false;

  constructor(scene?: Phaser.Scene, debugMode = false) {
    this.scene = scene;
    this.debugMode = debugMode;
  }

  public init(scene: Phaser.Scene): void {
    this.scene = scene;
    if (this.debugMode) {
      this.ensureDebugGraphics();
    }
  }

  /**
   * 新しいダメージゾーンを生成して登録する
   */
  public createZone(config: DamageZoneConfig): DamageZone {
    const zone = new DamageZone(config);
    this.zones.push(zone);
    return zone;
  }

  /**
   * デバッグ表示モードの切り替え
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    if (!enabled && this.debugGraphics) {
      this.debugGraphics.clear();
    }
  }

  /**
   * 毎フレームの更新・当たり判定解決・デバッグ描画
   */
  public update(delta: number, context: TargetContext, currentTime = performance.now()): void {
    if (this.zones.length === 0) return;

    // 1. 各ゾーンの更新と生存チェック
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i];
      if (!zone.update(delta)) {
        this.zones.splice(i, 1);
        continue;
      }

      // 2. ターゲットとの当たり判定チェック
      this.processHitsForZone(zone, context, currentTime);
    }

    // 3. デバッグ描画
    this.renderDebug();
  }

  /**
   * 指定ゾーンとターゲット群のヒット判定と効果適用
   */
  private processHitsForZone(zone: DamageZone, context: TargetContext, currentTime: number): void {
    let currentHitsCount = 0;

    // A. プレイヤーに対する判定
    if (context.player && this.isTargetApplicable(zone, "player", context.player)) {
      const p = context.player;
      if (zone.intersects(p) && zone.canHit(p, currentTime)) {
        zone.recordHit(p, currentTime);
        currentHitsCount++;

        // ダメージ適用
        if (context.onDamagePlayer) {
          context.onDamagePlayer(zone.effect.damage, zone);
        } else if (typeof p.damage === "function") {
          p.damage(zone.effect.damage);
        }

        // ヒット時コールバック
        zone.effect.onHit?.(p, zone);

        // 同時ヒット上限チェック
        if (zone.maxConcurrentTargets >= 0 && currentHitsCount >= zone.maxConcurrentTargets) {
          return;
        }
      }
    }

    // B. 敵リストに対する判定
    if (context.enemies && context.enemies.length > 0) {
      for (const enemy of context.enemies) {
        if (!enemy.active) continue;
        if (!this.isTargetApplicable(zone, "enemy", enemy)) continue;

        if (zone.intersects(enemy) && zone.canHit(enemy, currentTime)) {
          zone.recordHit(enemy, currentTime);
          currentHitsCount++;

          // 敵へのダメージ＆CC適用
          if (context.onDamageEnemy) {
            context.onDamageEnemy(
              enemy,
              zone.effect.damage,
              {
                slowAmount: zone.effect.slowAmount,
                stunDurationMs: zone.effect.stunDurationMs,
              },
              zone,
            );
          } else if (enemy instanceof EnemyBase) {
            if (zone.effect.slowAmount) enemy.applySlow(zone.effect.slowAmount);
            if (zone.effect.stunDurationMs) enemy.applyStun(zone.effect.stunDurationMs);
          }

          zone.effect.onHit?.(enemy, zone);

          // 同時ヒット上限チェック
          if (zone.maxConcurrentTargets >= 0 && currentHitsCount >= zone.maxConcurrentTargets) {
            return;
          }
        }
      }
    }
  }

  /** 対象がゾーンのフィルターに合致するか判定 */
  private isTargetApplicable(
    zone: DamageZone,
    targetType: "player" | "enemy",
    target: unknown,
  ): boolean {
    if (typeof zone.targetFilter === "function") {
      return zone.targetFilter(target, zone);
    }
    if (zone.targetFilter === "all") return true;
    return zone.targetFilter === targetType;
  }

  /** デバッグ描画の更新 */
  private renderDebug(): void {
    const hasDebugZone = this.zones.some((z) => z.debug);
    if (!this.debugMode && !hasDebugZone) {
      if (this.debugGraphics) this.debugGraphics.clear();
      return;
    }

    this.ensureDebugGraphics();
    if (!this.debugGraphics) return;

    this.debugGraphics.clear();
    for (const zone of this.zones) {
      if (this.debugMode || zone.debug) {
        zone.renderDebug(this.debugGraphics);
      }
    }
  }

  private ensureDebugGraphics(): void {
    if (!this.debugGraphics && this.scene) {
      this.debugGraphics = this.scene.add.graphics();
      this.debugGraphics.setDepth(999); // 最前面に描画
    }
  }

  public getZones(): readonly DamageZone[] {
    return this.zones;
  }

  public clear(): void {
    for (const zone of this.zones) {
      zone.destroy();
    }
    this.zones = [];
    if (this.debugGraphics) {
      this.debugGraphics.clear();
    }
  }

  public destroy(): void {
    this.clear();
    if (this.debugGraphics && this.debugGraphics.active) {
      this.debugGraphics.destroy();
    }
  }
}
