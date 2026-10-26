import type Phaser from "phaser";

import type { DamageZoneShape } from "./shapes/DamageZoneShape";
import type {
  AttachSource,
  DamageZoneConfig,
  Faction,
  HitEffectPayload,
  ShapeContext,
  TargetFilter,
} from "./types";

interface TargetHitRecord {
  count: number;
  nextAllowedTime: number;
}

/**
 * ダメージゾーン実体クラス (DamageZone)
 * 継続時間、ダメージ間隔、ヒット上限、追従バインド、形状判定を制御する
 */
export class DamageZone {
  public x: number;
  public y: number;
  public angleRad: number;
  public size: number;
  public elapsedMs = 0;
  public isActive = true;

  public readonly shape: DamageZoneShape;
  public readonly faction: Faction;
  public readonly targetFilter: TargetFilter;
  public readonly damageIntervalMs: number;
  public readonly maxHitsPerTarget: number;
  public readonly maxConcurrentTargets: number;
  public readonly durationMs: number;
  public readonly effect: HitEffectPayload;
  public readonly debug: boolean;

  private attachTo?: AttachSource;
  private attachOffsetDistance: number;
  private targetRecords = new Map<unknown, TargetHitRecord>();
  private isCurrentlyHitting = false;

  constructor(config: DamageZoneConfig) {
    this.shape = config.shape;
    this.faction = config.faction;
    this.targetFilter = config.targetFilter ?? this.getDefaultFilter(config.faction);
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
    this.angleRad = config.angleRad ?? 0;
    this.size = config.size ?? 50;

    this.damageIntervalMs = config.damageIntervalMs ?? 0;
    this.maxHitsPerTarget = config.maxHitsPerTarget ?? 1;
    this.maxConcurrentTargets = config.maxConcurrentTargets ?? -1;
    this.durationMs = config.durationMs ?? 300;
    this.effect = config.effect;
    this.attachTo = config.attachTo;
    this.attachOffsetDistance = config.attachOffsetDistance ?? 0;
    this.debug = config.debug ?? false;

    // 初期化時にアタッチ元の座標があれば即座に同期
    this.syncAttachment();
  }

  /** 現在の形状コンテキストを取得 */
  public getShapeContext(): ShapeContext {
    return {
      x: this.x,
      y: this.y,
      angleRad: this.angleRad,
      size: this.size,
      elapsedMs: this.elapsedMs,
    };
  }

  /** 座標・向きを直接更新 */
  public updateTransform(x: number, y: number, angleRad?: number, size?: number): void {
    this.x = x;
    this.y = y;
    if (angleRad !== undefined) this.angleRad = angleRad;
    if (size !== undefined) this.size = size;
  }

  /**
   * 毎フレームの更新処理
   * @returns まだ生存しているか (true = 生存, false = 寿命終了)
   */
  public update(delta: number): boolean {
    if (!this.isActive) return false;

    this.elapsedMs += delta;

    // 持続時間判定（-1 以外で超過したら終了）
    if (this.durationMs >= 0 && this.elapsedMs >= this.durationMs) {
      this.destroy();
      return false;
    }

    // 追従ソースとの同期
    this.syncAttachment();
    return true;
  }

  /**
   * 指定ターゲットがこのゾーンにヒット可能か判定
   */
  public canHit(target: unknown, currentTime: number): boolean {
    if (!this.isActive) return false;

    const record = this.targetRecords.get(target);
    if (!record) return true;

    // 同一対象への最大ヒット数チェック
    if (this.maxHitsPerTarget >= 0 && record.count >= this.maxHitsPerTarget) {
      return false;
    }

    // ダメージ間隔（tick）チェック
    if (this.damageIntervalMs > 0 && currentTime < record.nextAllowedTime) {
      return false;
    }

    // 間隔0かつ既にヒット済みなら不可
    if (this.damageIntervalMs <= 0 && record.count > 0) {
      return false;
    }

    return true;
  }

  /**
   * ヒット成功の記録と次回到達時刻の更新
   */
  public recordHit(target: unknown, currentTime: number): void {
    let record = this.targetRecords.get(target);
    if (!record) {
      record = { count: 0, nextAllowedTime: 0 };
      this.targetRecords.set(target, record);
    }
    record.count++;
    record.nextAllowedTime = currentTime + Math.max(0, this.damageIntervalMs);
    this.isCurrentlyHitting = true;
  }

  /**
   * 指定した座標・半径のターゲットと接触しているか形状判定
   */
  public intersects(target: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
  }): boolean {
    const ctx = this.getShapeContext();
    const r =
      target.radius ??
      (target.width && target.height ? Math.max(target.width, target.height) / 2 : 20);

    return this.shape.intersectsCircle({ x: target.x, y: target.y }, r, ctx);
  }

  /** デバッグ描画 */
  public renderDebug(graphics: Phaser.GameObjects.Graphics): void {
    const ctx = this.getShapeContext();
    this.shape.renderDebug(graphics, ctx, this.isCurrentlyHitting);
    // フレームごとにヒットフラグをリセット
    this.isCurrentlyHitting = false;
  }

  /** 破棄処理 */
  public destroy(): void {
    this.isActive = false;
    this.targetRecords.clear();
  }

  /** 追従ソースからの座標・向き同期 */
  private syncAttachment(): void {
    if (!this.attachTo) return;

    let targetX: number;
    let targetY: number;
    let targetAngle = this.angleRad;

    if (typeof this.attachTo === "function") {
      const pos = this.attachTo();
      targetX = pos.x;
      targetY = pos.y;
      if (pos.angleRad !== undefined) targetAngle = pos.angleRad;
      if (pos.size !== undefined) this.size = pos.size;
    } else {
      targetX = this.attachTo.x;
      targetY = this.attachTo.y;
      if (this.attachTo.rotation !== undefined) {
        targetAngle = this.attachTo.rotation;
      } else if (this.attachTo.angle !== undefined) {
        targetAngle = (this.attachTo.angle * Math.PI) / 180;
      }
    }

    // オフセットが設定されている場合は進行方向へずらす
    if (this.attachOffsetDistance !== 0) {
      targetX += Math.cos(targetAngle) * this.attachOffsetDistance;
      targetY += Math.sin(targetAngle) * this.attachOffsetDistance;
    }

    this.x = targetX;
    this.y = targetY;
    this.angleRad = targetAngle;
  }

  /** 陣営に応じたデフォルトの敵対フィルター */
  private getDefaultFilter(faction: Faction): TargetFilter {
    if (faction === "enemy") return "player";
    if (faction === "player") return "enemy";
    return "all";
  }
}
