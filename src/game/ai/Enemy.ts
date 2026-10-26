import Phaser from "phaser";

import { EnemyBase } from "./EnemyBase";
import type { ResistanceConfig } from "./resistance";
import type { GameContext, NextSpec, StateTable, Watcher, WeightedNext } from "./types";

/** NextSpec から次の状態を1つ決める。単一の状態名なら抽選せずそのまま返す */
export function pickNext<K extends string>(spec: NextSpec<K>): K {
  if (typeof spec === "string") return spec;

  let total = 0;
  for (const c of spec) total += weightOf(c);
  if (total <= 0) {
    throw new Error("onDone の候補が空、または重みの合計が 0 です");
  }

  // Phaserの乱数ジェネレーター（未初期化時は Math.random でフォールバック）
  const randFrac = Phaser.Math.RND ? Phaser.Math.RND.frac() : Math.random();
  let r = randFrac * total; // 0 <= r < total
  for (const c of spec) {
    r -= weightOf(c);
    if (r < 0) return c.state;
  }
  return spec[spec.length - 1].state; // 浮動小数点誤差のフォールバック
}

function weightOf<K extends string>(c: WeightedNext<K>): number {
  const w = c.weight ?? 1;
  return w > 0 ? w : 0; // 負数・NaN は 0
}

/**
 * 敵ステートマシンクラス (Enemy<K>)
 * サブルーチン型マイクロステートマシンにより、状態遷移とアクション実行を制御する
 */
export class Enemy<K extends string> extends EnemyBase {
  public currentState: K;
  private stateData: unknown = null;
  private started = false;
  private pendingState?: K;
  private table: StateTable<K>;
  private watcher?: Watcher<K>;
  private stunStateKey?: K;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    initialState: K,
    table: StateTable<K>,
    watcher?: Watcher<K>,
    resistances?: ResistanceConfig,
    stunStateKey?: K, // スタン状態に対応するキー（例: "STUN"）
    texture: string = "enemy",
  ) {
    super(scene, x, y, texture, resistances);
    this.currentState = initialState;
    this.table = table;
    this.watcher = watcher;
    this.stunStateKey = stunStateKey;
    // 初期状態の init は context が揃う最初の updateEnemy まで遅延
  }

  /** 外部イベントから状態を強制する。次のフレームで反映される */
  public requestState(next: K): void {
    this.pendingState = next;
  }

  /** EnemyBase.applyStun でスタンが成立したときに呼ばれるフック */
  protected onStunTriggered(): void {
    if (this.stunStateKey !== undefined) {
      this.requestState(this.stunStateKey);
    }
  }

  private transitionTo(next: K, context: GameContext): void {
    // 前の状態のクリーンアップ（正常完了でも強制遷移でも必ず呼ばれる）
    this.table[this.currentState]?.run.onReset?.(this, this.stateData);

    // 新状態への切り替え＆専用データの生成（進入処理もここで走る）
    this.currentState = next;
    this.stateData = this.table[next].run.init(this, context);
  }

  public updateEnemy(context: GameContext, delta: number): void {
    // 0. 基盤の更新（スロウ/アイスメーター・クールダウン・アニメ速度）
    const scaledDelta = this.tickBase(delta);

    // 凍結中はアクションもWatcherも止める。stateData は保持されるので、解除後に続きから再開する
    if (this.timeScale <= 0) {
      this.applyVelocity();
      return;
    }

    // 初回のみ初期状態へ進入
    if (!this.started) {
      this.started = true;
      this.stateData = this.table[this.currentState].run.init(this, context);
    }

    // 1. 割り込み（外部要求 → Watcher の順）
    // スタン中の再スタン（時間上書き）も成立させるため、pendingState は同一状態への再遷移も許可
    if (this.pendingState !== undefined) {
      const target = this.pendingState;
      this.pendingState = undefined;
      this.transitionTo(target, context);
    } else {
      const watched = this.watcher?.(this, context);
      if (watched && watched !== this.currentState) {
        this.transitionTo(watched, context);
      }
    }

    // 2. 現在のアクションを実行（遷移したフレームも遅れずに実行される）
    const entry = this.table[this.currentState];
    if (entry.run.update(this, context, this.stateData, scaledDelta) === "done") {
      // 正常完了：onDone が配列なら、ここで比率に応じて遷移先を抽選する
      this.transitionTo(pickNext(entry.onDone), context);
    }

    // 3. 基準速度 × timeScale を反映
    this.applyVelocity();
  }
}
