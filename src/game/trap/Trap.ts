import type Phaser from "phaser";

import { DEPTH_TRAP } from "../../constants/game";
import type { DamageZone } from "../damageZone/DamageZone";
import type { DamageZoneManager } from "../damageZone/DamageZoneManager";
import { CircleShape } from "../damageZone/shapes/CircleShape";
import type { DamageZoneShape } from "../damageZone/shapes/DamageZoneShape";
import type {
  Faction,
  HitEffectPayload,
  ShapeContext,
  TargetContext,
  TargetFilter,
} from "../damageZone/types";
import type { TrapAnimConfig, TrapConfig, TrapState, TrapType } from "./types";

/**
 * 設置型トラップ実体クラス (Trap)
 * 独立したタイムスケール、地面レイヤー描画、ARMING/ACTIVE/TRIGGERED/EXPLODING状態機械、DamageZone連携を制御する
 */
export class Trap {
  public x: number;
  public y: number;
  public size: number;
  public readonly type: TrapType;
  public readonly faction: Faction;
  public readonly targetFilter: TargetFilter;

  public state: TrapState = "ARMING";
  public isActive = true;
  public stateTimerMs = 0;
  public totalElapsedMs = 0;

  public readonly armingDurationMs: number;
  public readonly durationMs: number;
  public readonly triggerDelayMs: number;
  public readonly explosionDurationMs: number;

  public readonly hazardShape: DamageZoneShape;
  public readonly hazardEffect: HitEffectPayload;
  public readonly damageIntervalMs: number;

  public readonly triggerShape: DamageZoneShape;
  public readonly explosionShape: DamageZoneShape;
  public readonly explosionEffect: HitEffectPayload;

  public readonly anims?: TrapAnimConfig;
  public sprite?: Phaser.GameObjects.Image;

  private activeDamageZone?: DamageZone;
  private damageZoneManager: DamageZoneManager;
  private currentTextureKey: string;

  constructor(scene: Phaser.Scene, damageZoneManager: DamageZoneManager, config: TrapConfig) {
    this.x = config.x;
    this.y = config.y;
    this.size = config.size;
    this.type = config.type;
    this.faction = config.faction;
    this.targetFilter = config.targetFilter ?? this.getDefaultFilter(config.faction);
    this.damageZoneManager = damageZoneManager;

    this.armingDurationMs = Math.max(0, config.armingDurationMs ?? 0);
    this.durationMs = config.durationMs ?? 5000;
    this.triggerDelayMs = Math.max(0, config.triggerDelayMs ?? 200);
    this.explosionDurationMs = Math.max(0, config.explosionDurationMs ?? 300);

    // 形状とエフェクトの解決
    this.hazardShape = config.hazardShape ?? new CircleShape();
    this.hazardEffect = config.hazardEffect ?? { damage: 5 };
    this.damageIntervalMs = config.damageIntervalMs ?? 500;

    this.triggerShape = config.triggerShape ?? new CircleShape();
    this.explosionShape = config.explosionShape ?? new CircleShape();
    this.explosionEffect = config.explosionEffect ?? { damage: 30 };

    this.anims = config.anims;
    this.currentTextureKey = config.initialTexture;

    // 地面レイヤー（DEPTH_TRAP）にスプライト生成
    if (scene.add?.image) {
      this.sprite = scene.add.image(this.x, this.y, config.initialTexture);
      this.sprite.setDepth(DEPTH_TRAP);
    }

    // 準備時間の有無に応じて初期状態へ進入
    if (this.armingDurationMs > 0) {
      this.state = "ARMING";
      this.applyCurrentAnim(this.anims?.arming, 0, this.armingDurationMs);
    } else {
      this.activate();
    }
  }

  /**
   * 稼働状態（ACTIVE）への遷移
   */
  public activate(): void {
    this.state = "ACTIVE";
    this.stateTimerMs = 0;
    this.applyCurrentAnim(
      this.anims?.active,
      0,
      this.durationMs >= 0 ? this.durationMs : undefined,
    );

    // 継続エリア型（Hazard）の場合、常駐DamageZoneを生成
    if (this.type === "hazard") {
      const remainingDuration =
        this.durationMs >= 0 ? Math.max(0, this.durationMs - this.totalElapsedMs) : -1;

      this.activeDamageZone = this.damageZoneManager.createZone({
        shape: this.hazardShape,
        faction: this.faction,
        targetFilter: this.targetFilter,
        x: this.x,
        y: this.y,
        size: this.size,
        durationMs: remainingDuration,
        damageIntervalMs: this.damageIntervalMs,
        maxHitsPerTarget: -1,
        effect: this.hazardEffect,
      });
    }
  }

  /**
   * 起爆状態（EXPLODING）への遷移
   */
  public explode(): void {
    this.state = "EXPLODING";
    this.stateTimerMs = 0;
    this.applyCurrentAnim(this.anims?.exploding, 0, this.explosionDurationMs);

    // 爆発ダメージ判定ゾーン（単発ヒット判定）の生成
    this.damageZoneManager.createZone({
      shape: this.explosionShape,
      faction: this.faction,
      targetFilter: this.targetFilter,
      x: this.x,
      y: this.y,
      size: this.size * 1.5,
      durationMs: 150,
      damageIntervalMs: 0,
      maxHitsPerTarget: 1,
      effect: this.explosionEffect,
    });
  }

  /**
   * 毎フレームの更新処理
   * @returns まだ生存しているか (true = 生存, false = 破棄完了)
   */
  public update(delta: number, context: TargetContext): boolean {
    if (!this.isActive) return false;

    this.totalElapsedMs += delta;
    this.stateTimerMs += delta;

    switch (this.state) {
      case "ARMING": {
        this.applyCurrentAnim(this.anims?.arming, this.stateTimerMs, this.armingDurationMs);
        if (this.stateTimerMs >= this.armingDurationMs) {
          this.activate();
        }
        break;
      }

      case "ACTIVE": {
        this.applyCurrentAnim(
          this.anims?.active,
          this.stateTimerMs,
          this.durationMs >= 0 ? this.durationMs : undefined,
        );

        // 全体持続時間満了チェック
        if (this.durationMs >= 0 && this.totalElapsedMs >= this.durationMs) {
          this.destroy();
          return false;
        }

        // 感知地雷型の場合、感知範囲に対象が侵入したかチェック
        if (this.type === "mine") {
          if (this.checkTargetTrigger(context)) {
            this.state = "TRIGGERED";
            this.stateTimerMs = 0;
            this.applyCurrentAnim(this.anims?.triggered, 0, this.triggerDelayMs);
          }
        }
        break;
      }

      case "TRIGGERED": {
        this.applyCurrentAnim(this.anims?.triggered, this.stateTimerMs, this.triggerDelayMs);
        if (this.stateTimerMs >= this.triggerDelayMs) {
          this.explode();
        }
        break;
      }

      case "EXPLODING": {
        this.applyCurrentAnim(this.anims?.exploding, this.stateTimerMs, this.explosionDurationMs);
        if (this.stateTimerMs >= this.explosionDurationMs) {
          this.destroy();
          return false;
        }
        break;
      }

      case "EXPIRED": {
        this.destroy();
        return false;
      }
    }

    return true;
  }

  /**
   * トラップの破棄処理
   */
  public destroy(): void {
    this.isActive = false;
    this.state = "EXPIRED";
    if (this.activeDamageZone && this.activeDamageZone.isActive) {
      this.activeDamageZone.destroy();
      this.activeDamageZone = undefined;
    }
    if (this.sprite && this.sprite.active) {
      this.sprite.destroy();
      this.sprite = undefined;
    }
  }

  /**
   * 感知地雷：対象がトリガー範囲内に侵入したか判定
   */
  private checkTargetTrigger(context: TargetContext): boolean {
    const shapeCtx: ShapeContext = {
      x: this.x,
      y: this.y,
      angleRad: 0,
      size: this.size,
      elapsedMs: this.totalElapsedMs,
    };

    // プレイヤーの感知チェック
    if (context.player && this.isTargetApplicable("player", context.player)) {
      const p = context.player;
      const r = p.width && p.height ? Math.max(p.width, p.height) / 2 : 20;
      if (this.triggerShape.intersectsCircle({ x: p.x, y: p.y }, r, shapeCtx)) {
        return true;
      }
    }

    // 敵リストの感知チェック
    if (context.enemies && context.enemies.length > 0) {
      for (const enemy of context.enemies) {
        if (!enemy.active) continue;
        if (!this.isTargetApplicable("enemy", enemy)) continue;
        const r = enemy.width && enemy.height ? Math.max(enemy.width, enemy.height) / 2 : 20;
        if (this.triggerShape.intersectsCircle({ x: enemy.x, y: enemy.y }, r, shapeCtx)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * アニメーションリゾルバからフレームテクスチャを解決してスプライトに適用
   */
  private applyCurrentAnim(
    resolver: ((ctx: { elapsedMs: number; durationMs?: number }) => string) | undefined,
    elapsedMs: number,
    durationMs?: number,
  ): void {
    if (!resolver || !this.sprite || !this.sprite.active) return;

    const nextKey = resolver({ elapsedMs, durationMs });
    if (nextKey && nextKey !== this.currentTextureKey) {
      if (this.sprite.scene?.textures?.exists(nextKey)) {
        this.sprite.setTexture(nextKey);
        this.currentTextureKey = nextKey;
      }
    }
  }

  /**
   * ターゲットが対象フィルターを満たすか
   */
  private isTargetApplicable(targetType: "player" | "enemy", target: unknown): boolean {
    if (typeof this.targetFilter === "function") {
      return (this.targetFilter as (target: unknown, zone: unknown) => boolean)(
        target,
        this.activeDamageZone ?? this,
      );
    }
    if (this.targetFilter === "all") return true;
    return this.targetFilter === targetType;
  }

  /** デフォルトの敵対フィルター */
  private getDefaultFilter(faction: Faction): TargetFilter {
    if (faction === "enemy") return "player";
    if (faction === "player") return "enemy";
    return "all";
  }
}
