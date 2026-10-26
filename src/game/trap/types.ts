import type { ActionAnimResolver } from "../ai/actions/utils/animation";
import type { DamageZoneShape } from "../damageZone/shapes/DamageZoneShape";
import type { Faction, HitEffectPayload, TargetFilter } from "../damageZone/types";

/** トラップの動作タイプ */
export type TrapType = "hazard" | "mine";

/** トラップの内部状態 */
export type TrapState = "ARMING" | "ACTIVE" | "TRIGGERED" | "EXPLODING" | "EXPIRED";

/** 状態ごとのアニメーション解決関数定義 */
export interface TrapAnimConfig {
  /** 設置中・起動準備中 (ARMING) のアニメーション */
  arming?: ActionAnimResolver;
  /** 起動中・稼働中 (ACTIVE) のアニメーション */
  active?: ActionAnimResolver;
  /** 感知後・起爆予兆中 (TRIGGERED) のアニメーション */
  triggered?: ActionAnimResolver;
  /** 爆発中 (EXPLODING) のアニメーション */
  exploding?: ActionAnimResolver;
}

/** トラップ生成時の設定構成 */
export interface TrapConfig {
  /** トラップの種類（hazard: 継続エリア型, mine: 感知起爆型） */
  type: TrapType;
  /** 発動陣営（player / enemy / neutral） */
  faction: Faction;
  /** 対象判定フィルター（省略時は敵対陣営を自動対象とする） */
  targetFilter?: TargetFilter;

  /** 配置X座標 */
  x: number;
  /** 配置Y座標 */
  y: number;
  /** 基準サイズ/半径（px） */
  size: number;

  /** 設置から有効化までの準備時間（ms） */
  armingDurationMs?: number;

  /** トラップ全体の最大持続時間（ms、負数で起爆まで無期限） */
  durationMs?: number;

  /** 初期表示テクスチャキー */
  initialTexture: string;

  /** アニメーション設定 */
  anims?: TrapAnimConfig;

  // --- 継続エリア型 (Hazard) 向け ---
  /** 影響範囲の形状（未指定時は円形 CircleShape(size)） */
  hazardShape?: DamageZoneShape;
  /** ダメージ間隔（ms、0なら単発、>0ならtick） */
  damageIntervalMs?: number;
  /** tickごとのダメージ/効果ペイロード */
  hazardEffect?: HitEffectPayload;

  // --- 感知起爆型 (Mine) 向け ---
  /** 感知範囲の形状（未指定時は円形 CircleShape(size)） */
  triggerShape?: DamageZoneShape;
  /** 感知してから実際に爆発するまでの予兆遅延（ms） */
  triggerDelayMs?: number;
  /** 爆発時のダメージ判定形状（未指定時は円形 CircleShape(size * 1.5)） */
  explosionShape?: DamageZoneShape;
  /** 爆発時の効果ペイロード */
  explosionEffect?: HitEffectPayload;
  /** 爆発演出時間（ms） */
  explosionDurationMs?: number;
}
