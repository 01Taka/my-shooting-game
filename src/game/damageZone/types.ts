import type { DamageZone } from "./DamageZone";
import type { DamageZoneShape } from "./shapes/DamageZoneShape";

/** ダメージゾーンを発動した陣営 */
export type Faction = "player" | "enemy" | "neutral";

/** ターゲット対象の判定フィルター（指定陣営、またはカスタム関数） */
export type TargetFilter =
  "player" | "enemy" | "all" | ((target: unknown, zone: DamageZone) => boolean);

/** ダメージゾーンがヒットした際に付与する効果ペイロード */
export interface HitEffectPayload {
  /** 基本HPダメージ量 */
  damage: number;
  /** スロウ付与量（アイスメーター蓄積） */
  slowAmount?: number;
  /** スタン時間（ms） */
  stunDurationMs?: number;
  /** ノックバック距離または力 */
  knockback?: number;
  /** ヒット時の独自追加コールバック */
  onHit?: (target: unknown, zone: DamageZone) => void;
}

/** 形状（当たり判定）の計算時に渡される共通コンテキスト */
export interface ShapeContext {
  /** ゾーンの中心X座標 */
  x: number;
  /** ゾーンの中心Y座標 */
  y: number;
  /** ゾーンの向き（ラジアン） */
  angleRad: number;
  /** ゾーンの基準スケール/サイズ/半径（px） */
  size: number;
  /** 発生してからの経過時間（ms） */
  elapsedMs: number;
}

/** 座標・向きの追従ソース（オブジェクトまたは関数） */
export type AttachSource =
  | { x: number; y: number; rotation?: number; angle?: number }
  | (() => { x: number; y: number; angleRad?: number; size?: number });

/** ダメージゾーン生成時の設定オプション */
export interface DamageZoneConfig {
  /** 当たり判定形状 */
  shape: DamageZoneShape;
  /** 発動陣営（player / enemy / neutral） */
  faction: Faction;
  /** ヒット対象フィルター（省略時は敵対陣営を自動対象とする） */
  targetFilter?: TargetFilter;
  /** 初期X座標 */
  x?: number;
  /** 初期Y座標 */
  y?: number;
  /** 初期向き（ラジアン） */
  angleRad?: number;
  /** 基準サイズ/半径（px） */
  size?: number;

  /** ダメージ間隔（ms）。0または負数の場合は1回のみ判定 */
  damageIntervalMs?: number;
  /** 同一対象に対する最大ヒット数（-1で無制限、1で単発ヒット） */
  maxHitsPerTarget?: number;
  /** 同時にヒットできる最大対象数（-1で無制限） */
  maxConcurrentTargets?: number;
  /** ゾーンの持続時間（ms）。-1で無制限 */
  durationMs?: number;

  /** ヒット時の効果ペイロード */
  effect: HitEffectPayload;

  /** 毎フレーム座標・向きを同期する追従ソース（突進敵など） */
  attachTo?: AttachSource;
  /** 追従時のオフセット（前方への距離など） */
  attachOffsetDistance?: number;

  /** このゾーン個別のデバッグ描画フラグ */
  debug?: boolean;
}
