import type { CharacterDirection, DirectionalMode } from "../../utils/directionalSprite";
import type { DamageZoneManager } from "../damageZone/DamageZoneManager";
import type { TrapManager } from "../trap/TrapManager";
import type { Enemy } from "./Enemy";
import type { EnemyBase } from "./EnemyBase";
import type { ResistanceConfig } from "./resistance";

/** 敵共通の基本定数・ステータス設定プロファイル型 */
export interface EnemyProfile {
  /** 最大HP（初期HP） */
  maxHp: number;
  /** 行動阻害耐性設定（スタン・スロウ） */
  resistances: ResistanceConfig;
  /** スプライト向きモード (デフォルト: "horizontal2") */
  directionalMode?: DirectionalMode;
  /** 初期向き (デフォルト: "right") */
  initialDirection?: CharacterDirection;
  /** 基本テクスチャキー（任意） */
  defaultTexture?: string;
  /** 撃破スコア（任意） */
  score?: number;
}

/** 弾マネージャーのコンテキスト用インターフェース */
export interface BulletManagerContext {
  shoot?: (x: number, y: number, angle: number) => void;
  fire?: (x: number, y: number, angle: number) => void;
  [key: string]: unknown;
}

/** 敵AIおよびアクションの実行コンテキスト */
export interface GameContext {
  player: { x: number; y: number };
  bulletManager?: {
    shoot?: (
      x: number,
      y: number,
      angle: number,
      speed?: number,
      damage?: number,
      owner?: unknown,
      scale?: number,
    ) => void;
    fire?: (x: number, y: number, angle: number) => void;
  };
  damageZoneManager?: DamageZoneManager;
  trapManager?: TrapManager;
  scene?: Phaser.Scene;
  /** 生存中の全敵オブジェクトを取得するコールバック（射線遮蔽判定等で使用） */
  getEnemies?: () => Phaser.GameObjects.GameObject[];
  [key: string]: unknown;
}

/** アクションの実行結果（"done" で完了・次状態へ遷移、void/undefined で継続） */
export type ActionResult = "done" | void;

/** 型消去済みのバインドアクションインターフェース */
export interface BoundAction {
  init(enemy: EnemyBase, context: GameContext): unknown;
  update(enemy: EnemyBase, context: GameContext, data: unknown, delta: number): ActionResult;
  onReset?(enemy: EnemyBase, data: unknown): void;
}

/** 抽選候補。weight は相対比率で、省略時は 1 */
export interface WeightedNext<K extends string> {
  state: K;
  weight?: number;
}

/** コンテキストや敵自身を参照して次の遷移先または候補を返すコールバック */
export type NextCallback<K extends string> = (context: GameContext, enemy: Enemy<K>) => NextSpec<K>;

/** 遷移先の指定。単一の状態名 or 重み付き候補の配列 or コールバック関数 */
export type NextSpec<K extends string> = K | readonly WeightedNext<K>[] | NextCallback<K>;

/** 単一状態のエントリ */
export interface StateEntry<K extends string> {
  /** 状態の中身（状態データを持たないためインスタンス間で共有可能） */
  run: BoundAction;
  /** run が "done" を返したときの遷移先（確率分岐も可能） */
  onDone: NextSpec<K>;
}

/** 敵ごとのステートマシンテーブル定義 */
export type StateTable<K extends string> = Record<K, StateEntry<K>>;

/** 常時監視ウォッチャー（条件合致時に遷移先ステートを返す） */
export type Watcher<K extends string> = (enemy: Enemy<K>, context: GameContext) => K | void;
