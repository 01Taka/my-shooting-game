# マイクロステートマシン × アクションサブルーチンによる敵AI設計思想 (`07-state-machine-action-subroutine-enemy-ai.md`)

シューティングゲームにおいて、「接近」「距離維持（カイティング）」「予兆付き連続射撃」「近接急襲」など多様な**雑魚敵AI**を量産・拡張するためのアーキテクチャ設計思想と思考フレームワークの記録です。

> **スコープ**: 本設計は雑魚敵向けです。ボスは共通基盤（`EnemyBase`・`defineAction`）だけを共有し、ボス専用のステートマシンを別に書く方針とします（詳細は第9章）。
>
> **関連ドキュメント**: 行動阻害デバフ（スタン・スロウ／凍結）および耐性・アイスメーターの仕様は **`09-crowd-control-stun-and-slow.md`** に分離しています。本ドキュメントでは、それらを受け入れるステートマシン側の接続点（`timeScale` と動的スタン時間）のみを扱います。

---

## 1. 背景と解決すべき課題

### 敵AIの多様化に伴う3つの設計トラップ

1. **クラス継承の組み合わせ爆発**
   - `ChaserEnemy`, `RangedShooterEnemy`, `HealerEnemy`, `FlyingBurstShooterEnemy`... と愚直にクラスを継承していくと、機能の掛け合わせでクラス数が爆発し、コードが重複して保守不能になる。
2. **移動と攻撃の「緩やかな結合」問題**
   - 移動（Move）と攻撃（Action）を完全に独立した Strategy パターンとして分離すると、「攻撃時に足を止める（硬直）」「予兆チャージ中に足は止めるが向きだけはプレイヤーを追尾する」「3連射して後退する」といった、移動と攻撃が連携する自然な挙動の実装が極めて難しくなる。
3. **ステート爆発（細かすぎる状態定義）**
   - 伝統的なステートマシン（FSM）では、「3連射」を表現するために `SHOOT_1` → `WAIT_1` → `SHOOT_2` → `WAIT_2` → `SHOOT_3` → `RECOVERY` と大量の空虚な状態を定義せざるを得ず、再利用性が著しく低下する。

本設計はトラップ1と3を「1アクション＝1サブルーチン」で解決します。ただし**並列行動（移動しながら射撃など）の合成は対象外**です（第9章）。

---

## 2. アーキテクチャの核：サブルーチン型マイクロステートマシン

**「状態内で実行される一連のシーケンス行動（サブルーチン）を単一のアクション関数にカプセル化し、状態間の遷移はテーブル側で宣言する」** 設計です。

```

【毎フレーム実行 (updateEnemy)】
│
├── 0. 基盤の更新 (tickBase)
│ └─ スロウ/アイスメーター更新→timeScale算出、クールダウン進行、アニメ速度の追従
│ ※ 凍結中 (timeScale = 0) はここで打ち切り。stateData は保持される
│
├── 1. 割り込み判定
│ ├─ 外部要求 (requestState: 被弾スタンなど)
│ └─ Watcher (至近距離接近、HP低下など) ──(緊急時)──> transitionTo(強制遷移)
│
└── 2. 現在のステートのアクション実行 (run.update)
│
├── scaledDelta (経過ミリ秒 × timeScale) を受け取り、data.timer でステップ実行
│
└── 戻り値:
├─ "done" ──> テーブルの onDone が指す状態へ遷移
│ （配列指定なら、比率に応じて抽選して決定）
└─ void / undefined ──> 同一状態を継続

```

### 責務の分離

| 担当                   | 知っていること                         | 知らないこと         |
| :--------------------- | :------------------------------------- | :------------------- |
| **アクション**         | 自分の動作手順、完了したか             | 次にどの状態へ行くか |
| **遷移テーブル**       | 完了後の遷移先・分岐の比率（`onDone`） | 動作の中身           |
| **Watcher / 外部要求** | 割り込み条件                           | アクションの内部状態 |

アクションが遷移先を知らないため、同じアクションを別の敵・別のテーブルで使い回せます。敵の行動グラフ（確率分岐を含む）はテーブルを読むだけで把握できます。

### 敵インスタンスが保持する最小限のコンテキスト

- `currentState: K`: 現在の状態名（例: `"MOVE"`, `"TRIPLE_SHOT"`, `"DASH_CLAW"`）
- `stateData: unknown`: **現在の状態の間だけ保持される揮発性データ**（状態遷移時に破棄・再生成）

複雑なステップタイマーやリセット機構をエンジン側に持たせず、各アクションが `data.timer += delta` で自律的に時間を管理します。

### メモリ面の注意

- 毎フレームの戻り値オブジェクトを作らない（`"done"` 文字列か `void`）ため、フレーム単位の GC 負荷はありません。
- `transitionTo` のたびに `stateData` が1つ生成されます（実害は小さい）。
- 確率分岐の抽選（`pickNext`）は**遷移の瞬間に1回だけ**走り、配列も新規生成しません（テーブルの配列を読むだけ）。
- アクションテーブルは**状態を持たない**（可変データはすべて `stateData` 側）ので、敵の種類ごとに1つ作って**全インスタンスで共有**します。スポーンごとに `defineAction` を呼んでクロージャを作り直してはいけません。

---

## 3. なぜ `nextCallTick`（スキップ間引き）ではなく毎フレーム呼び出し（`delta`渡し）なのか？

「次回の呼び出し時刻を指定してそれまで実行をスキップする」方式ではなく、**「毎フレーム呼び出し ＋ Phaser標準の `delta`（前フレームからの経過ミリ秒）渡し」** を採用しました。

| 比較項目                   | `nextCallTick` によるスキップ方式                      | 毎フレーム呼び出し ＋ `delta` 渡し方式（採用）                |
| :------------------------- | :----------------------------------------------------- | :------------------------------------------------------------ |
| **溜め中の追尾・旋回**     | 待機中は関数が呼ばれず**完全フリーズ（氷漬け）**になる | **待機中もプレイヤー追尾旋回やチャージ演出が可能**            |
| **移動（CHASE等）の記述**  | 毎フレーム動かすために毎回 `0` を返す必要があり不自然  | **物理エンジンの速度・向き更新を自然に記述可能**              |
| **ステップごとの時間計測** | スキップか、累計時間の合算手計算が必要                 | **`data.timer += delta` してステップ移行時に `0` に戻すだけ** |
| **スロウ・凍結**           | 予約時刻の再計算が必要で破綻しやすい                   | **`delta` に `timeScale` を掛けるだけ（第8章）**              |
| **フレームワークの複雑さ** | タイマー予約・スキップ・リセット関数が必要で肥大化     | **エンジン側は `run.update(delta)` を呼ぶだけで極小**         |

---

## 4. アクション実装の3つの規約

スロウ・凍結（`timeScale` による時間伸縮）やアニメ同期を成立させるため、アクションは以下を守ります。

1. **時間はすべて `data.timer += delta` で管理する。** `scene.time.delayedCall` や Tween をアクション内で使わない（`timeScale` が効かなくなる）。
2. **速度は `enemy.moveAt(angle, speed)` / `enemy.stopMoving()` 経由で設定する。** `body.velocity` を直接書かない。基準速度に `timeScale` を掛けて反映するのは基盤側の責務。
3. **クールダウンは `enemy.startCooldown(key, ms)` / `enemy.isReady(key)` を使う。** 実時間ではなく `timeScale` 適用後の時間で進行するため、凍結中は進まない。

また、`initData` は**状態に入る瞬間に1回だけ呼ばれる**ため、プレイヤー位置を見た進行方向の決定や、速度・向きの初期設定といった「進入時の副作用」を書く場所（enter フック）を兼ねます。`onReset` は**状態を抜けるとき常に**（正常完了・強制遷移のどちらでも）呼ばれる後始末フックです。

> 確率による行動の選び分けは、アクション内で乱数を振るのではなく**遷移テーブル側（`onDone` の配列）で宣言**します（第6章 6.2）。アクション内の乱数は「移動方向」「移動時間」のような**動作内容のばらつき**にのみ使い、「次に何をするか」のばらつきはテーブルに寄せることで、行動グラフが読み取れる状態を保ちます。

---

## 5. TypeScriptにおける完全な型安全化（`defineAction` パターン）

複数のアクション（それぞれ異なる内部データ型 `TData` と引数型 `TArgs` を持つ）を1つのテーブルに格納すると、通常は `any` や `unknown` に型が劣化します。
これを解決するため、**「`initData` による型推論 ＋ 型消去（カプセル化）」** を行う `defineAction` ヘルパーを採用しました。

アクションの戻り値は **`"done"`（完了）または `void`（継続）** のみです。遷移先の状態名はアクションに現れないため、アクション側は状態名の型（`K`）に依存せず、`EnemyBase` だけを知っていれば書けます。

```typescript
export type ActionResult = "done" | void;

// 1. 共通の型消去済みインターフェース（Enemyが保持する型）
export interface BoundAction {
  init(enemy: EnemyBase, context: GameContext): unknown;
  update(enemy: EnemyBase, context: GameContext, data: unknown, delta: number): ActionResult;
  onReset?(enemy: EnemyBase, data: unknown): void;
}

// 2. 型安全なアクション定義ヘルパー
export function defineAction<TData, TArgs = void>(def: {
  initData: (
    enemy: EnemyBase,
    context: GameContext,
    args: TArgs, // ★ 設定値の型が自動推論される
  ) => TData; // ★ 戻り値から TData が自動推論される
  update: (
    enemy: EnemyBase,
    context: GameContext,
    data: TData, // ★ initData の戻り値型
    args: TArgs,
    delta: number,
  ) => ActionResult;
  onReset?: (enemy: EnemyBase, data: TData, args: TArgs) => void;
}): (args: TArgs) => BoundAction {
  return (args: TArgs) => ({
    init: (enemy, context) => def.initData(enemy, context, args),
    update: (enemy, context, data, delta) => def.update(enemy, context, data as TData, args, delta),
    onReset: def.onReset ? (enemy, data) => def.onReset!(enemy, data as TData, args) : undefined,
  });
}
```

### このパターンの利点

- **`data` の型が自動推論**: `initData` の戻り値から `TData` が推論され、明示的なジェネリクス指定が不要。
- **`undefined` チェックの根絶**: 初回実行時から `data.timer: number` として非nullで利用可能。進行方向の決定のような「初回だけの処理」も `initData` に書けるため、`initialized` のようなフラグが不要。
- **設定値（`args`）の補完と検証**: テーブル定義時に渡す引数が欠けていると TypeScript コンパイラが即座にエラーを検出。
- **遷移先がアクションから消える**: アクションの再利用性が上がり、遷移の整合性はテーブルの型で検査できる（次章）。

---

## 6. 遷移テーブルと状態キーのリテラル型化

状態キーを `string` にすると、遷移先のタイポが実行時まで検出されません。**敵ごとに状態名のユニオン型 `K` を定義**し、テーブルを `Record<K, ...>` にすることで、状態の抜け・存在しない状態への遷移をコンパイル時に検出します。

### 6.1 基本の型定義

`onDone` は**単一の状態名**、または**重み付き候補の配列**のどちらでも書けます（`NextSpec<K>`）。

```typescript
/** 抽選候補。weight は比率で、省略時は 1 */
export interface WeightedNext<K extends string> {
  state: K;
  weight?: number;
}

/** 遷移先の指定。単一の状態名 or 重み付き候補の配列 */
export type NextSpec<K extends string> = K | readonly WeightedNext<K>[];

export interface StateEntry<K extends string> {
  run: BoundAction; // 状態の中身（状態を持たないので共有可能）
  onDone: NextSpec<K>; // run が "done" を返したときの遷移先（確率分岐も可）
}
export type StateTable<K extends string> = Record<K, StateEntry<K>>;
export type Watcher<K extends string> = (enemy: Enemy<K>, context: GameContext) => K | void;
```

```typescript
type PredatorState = "MOVE" | "TRIPLE_SHOT" | "DASH_CLAW" | "STUN";

const table: StateTable<PredatorState> = {
  MOVE:        { run: ..., onDone: "TRIPLE_SHOT" }, // ← "TRIPLE_SHOTT" と書くとコンパイルエラー
  TRIPLE_SHOT: { run: ..., onDone: [{ state: "MOVE" }, { state: "STUN" }] }, // 配列内のタイポも検出される
  // DASH_CLAW / STUN を書き忘れてもコンパイルエラー
};
```

配列の `state` も `K` で型付けされるため、**確率分岐の中のタイポ・存在しない状態もコンパイル時に検出**されます。

### 6.2 確率分岐（重み付き抽選）

`onDone` に配列を渡すと、**`"done"` を受けて遷移する瞬間に1回だけ**、`weight` の比率で遷移先を抽選します。

```typescript
// 例：完了後、75% で TRIPLE_SHOT、25% で もう一度 MOVE
MOVE: {
  run: roamOrChaseAction({ ... }),
  onDone: [
    { state: "TRIPLE_SHOT", weight: 3 },
    { state: "MOVE" }, // weight 省略 = 1
  ],
},
```

#### 仕様

| 項目             | 仕様                                                                                                                                                                       |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 比率の意味       | **相対的な重み**。合計を1や100にそろえる必要はない（`3 : 1` ＝ 75% : 25%）                                                                                                 |
| `weight` の省略  | `1` として扱う。全候補を省略すれば**一様ランダム**                                                                                                                         |
| `weight: 0`      | 抽選対象外（一時的に分岐を無効化したいときに便利）                                                                                                                         |
| 不正な `weight`  | 負数・`NaN` は `0` 扱い                                                                                                                                                    |
| 全候補が重み0/空 | 抽選不能。開発時は例外を投げて気づけるようにする（下記 `pickNext` 参照）                                                                                                   |
| 単一の状態名     | 抽選せずそのまま返す（従来と完全に同じ動作・追加コストなし）                                                                                                               |
| 自己遷移         | 候補に現在の状態を含めてよい。`transitionTo` が走るので `onReset` → `initData` が再実行され、状態が**最初からやり直される**（`MOVE` なら進行方向・移動時間が再抽選される） |
| 乱数源           | `Phaser.Math.RND`（シード指定可能。リプレイやテストで再現性を確保できる）                                                                                                  |

#### 抽選関数 `pickNext`

```typescript
/** NextSpec から次の状態を1つ決める。単一の状態名なら抽選せずそのまま返す */
export function pickNext<K extends string>(spec: NextSpec<K>): K {
  if (typeof spec === "string") return spec;

  let total = 0;
  for (const c of spec) total += weightOf(c);
  if (total <= 0) {
    throw new Error("onDone の候補が空、または重みの合計が 0 です");
  }

  let r = Phaser.Math.RND.frac() * total; // 0 <= r < total
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
```

#### 設計上の位置づけ

- **抽選はアクションではなくテーブルの責務**: アクションは引き続き「`"done"` を返すだけ」で、遷移先も確率も知りません。同じアクションを「毎回 `MOVE` へ戻す敵」と「たまに別の行動へ分岐する敵」で使い回せます。
- **Watcher・外部要求（`requestState`）の強制遷移は抽選しない**: 割り込みは常に決定的な単一の状態へ遷移します。確率分岐の対象は「アクションの正常完了」のみです。
- **抽選結果は遷移時に確定する**: 状態の途中で確率を振り直したり、`stateData` に抽選結果を持ち越したりはしません。凍結中（`timeScale = 0`）は遷移自体が起きないため、凍結をまたいでも抽選は発生しません。

---

## 7. 具体的な敵AIの構築例：近接急襲＆3連射ハイブリッド敵

### 敵の行動仕様

1. **至近距離（4m以内）**: 常時監視（Watcher）が検知し、即座に**ダッシュ爪攻撃**を繰り出す。終わると**クールダウン（1.5秒）**の間は再発動しない。
2. **通常時（移動フェーズ）**:
   - プレイヤーから一定以上離れていればプレイヤーへ向かって直線移動。
   - 一定距離以内ならランダムな方向へ直線移動。
   - 移動時間は状態進入時に**1〜3秒のランダム**で決定。
3. **移動完了後（攻撃フェーズ）**: **75% の確率**でプレイヤーに向かって**3連攻撃**（最初の1発の前に予兆の間がある）を行い、終わったら再び移動に戻る。**残り25%** は攻撃せずにもう一度移動する（進行方向・移動時間は再抽選）。
4. **被弾スタン時**: スタン耐性に応じた時間だけ行動を中断・硬直し、解除後は `MOVE` から再開する（スタン耐性100の敵はキャンセルされない）。

単位は `PX_PER_METER` を1か所で定義し、距離・速度は m 単位で記述します。

```typescript
export const PX_PER_METER = 50;
export const m = (meters: number) => meters * PX_PER_METER;
```

---

### ステップ1: 基盤クラス（`EnemyBase`）の概要

物理・時間・クールダウン・行動阻害デバフ（スタン・スロウ）といった**状態機械に依存しない機能**を持つ基盤です。雑魚の `Enemy<K>` もボスもこれを継承し、アクションが依存するのもこのクラスだけです。

> ※ `EnemyBase` の具体的な実装コードとデバフ計算式は **`08-crowd-control-stun-and-slow.md`** を参照してください。アクションおよびステートマシン側からは、以下のインターフェースを利用します。

```typescript
// EnemyBase が提供する主要API（抜粋）
export abstract class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  /** 1 = 通常, 0 < timeScale < 1 = スロウ, 0 = 凍結 */
  public timeScale = 1;

  /** 直近の applyStun で確定した実効スタン時間（ms）。stunAction が参照する */
  public pendingStunDurationMs = 0;

  // --- アクション向けAPI ---
  public moveAt(angle: number, speed: number): void;
  public stopMoving(): void;
  public startCooldown(key: string, ms: number): void;
  public isReady(key: string): boolean;

  // --- 外部（被弾処理など）向けデバフ付与API ---
  public applyStun(baseDurationMs: number): void;
  public applySlow(amount: number): void;

  // --- サブクラス（Enemy<K> / Boss）がオーバーライド・呼び出しするフック ---
  protected abstract onStunTriggered(): void;
  protected tickBase(delta: number): number;
  protected applyVelocity(): void;
}
```

---

### ステップ2: アクション関数の定義

#### ① 移動アクション (`roamOrChaseAction`)

状態進入時（`initData`）に移動時間（1〜3秒）と移動方向（プレイヤー追尾 or ランダム）を決定し、直線移動します。

```typescript
interface RoamOrChaseArgs {
  speed: number;
  chaseThresholdDistance: number; // この距離より遠ければ追従、近ければランダム
  minDurationMs: number;
  maxDurationMs: number;
}

export const roamOrChaseAction = defineAction({
  initData: (enemy, context, args: RoamOrChaseArgs) => {
    // 進入時に一度だけ進行方向を決定（直線移動）
    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, context.player.x, context.player.y);
    const angle =
      dist > args.chaseThresholdDistance
        ? Phaser.Math.Angle.Between(enemy.x, enemy.y, context.player.x, context.player.y)
        : Phaser.Math.RND.realInRange(0, Math.PI * 2);

    enemy.moveAt(angle, args.speed);
    enemy.setRotation(angle + Math.PI / 2);

    return {
      timer: 0,
      durationMs: Phaser.Math.Between(args.minDurationMs, args.maxDurationMs),
    };
  },

  update: (_enemy, _context, data, _args, delta) => {
    data.timer += delta;
    if (data.timer >= data.durationMs) return "done"; // 遷移先は知らない
  },

  onReset: (enemy) => {
    enemy.stopMoving(); // 完了・中断どちらでも確実に停止
  },
});
```

#### ② 3連続射撃アクション (`tripleShotAction`)

足を止めてプレイヤーに向き直り、250ms間隔で3連射してから後隙を経て完了します。**最初の1発も `intervalMs` 待ってから撃つ**ため、この待ち時間が予兆になります。

```typescript
interface TripleShotArgs {
  totalShots: number; // 3発
  intervalMs: number; // 250ms（最初の1発前の予兆も兼ねる）
  postDelayMs: number; // 撃ち終わりの硬直 400ms
}

export const tripleShotAction = defineAction({
  initData: (enemy, _context, _args: TripleShotArgs) => {
    enemy.stopMoving();
    return { timer: 0, shotsFired: 0, isRecovering: false };
  },

  update: (enemy, context, data, args, delta) => {
    data.timer += delta;

    // 後隙硬直待ち
    if (data.isRecovering) {
      if (data.timer >= args.postDelayMs) return "done";
      return;
    }

    // 発射準備中：常にプレイヤーの方向をエイム
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, context.player.x, context.player.y);
    enemy.setRotation(angle + Math.PI / 2);

    // 一定間隔ごとに弾を発射
    if (data.timer >= args.intervalMs) {
      context.bulletManager.shoot(enemy.x, enemy.y, angle);
      data.shotsFired++;
      data.timer = 0; // 自前でゼロリセット（次の1発 or 後隙の計測開始）

      if (data.shotsFired >= args.totalShots) {
        data.isRecovering = true;
      }
    }
  },
});
```

#### ③ ダッシュ爪攻撃アクション (`dashClawAttackAction`)

急接近して爪攻撃を行い、後隙を経て完了します。**抜けるときにクールダウンを開始する**ことで、Watcher による連続発動（爪ハメ）を防ぎます。

```typescript
interface DashClawArgs {
  dashSpeed: number; // 突進速度
  dashDurationMs: number; // 突進時間
  recoveryDurationMs: number; // 爪を振り抜いた後の硬直
  cooldownMs: number; // 次に発動できるまでの時間
}

export const dashClawAttackAction = defineAction({
  initData: (_enemy, _context, _args: DashClawArgs) => ({
    timer: 0,
    step: "DASH" as "DASH" | "RECOVERY",
  }),

  update: (enemy, context, data, args, delta) => {
    data.timer += delta;

    // ステップ1: プレイヤーに向かって超高速突進
    if (data.step === "DASH") {
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, context.player.x, context.player.y);
      enemy.moveAt(angle, args.dashSpeed);
      enemy.setRotation(angle + Math.PI / 2);

      // 突進時間終了：爪で攻撃判定
      if (data.timer >= args.dashDurationMs) {
        enemy.stopMoving();
        enemy.setTint(0xff0055); // 攻撃演出の赤フラッシュ
        // ここで近接ヒット判定を生成する

        data.step = "RECOVERY";
        data.timer = 0; // 硬直計測のために自前でゼロリセット
      }
      return;
    }

    // ステップ2: 爪攻撃後の硬直
    if (data.timer >= args.recoveryDurationMs) return "done";
  },

  onReset: (enemy, _data, args) => {
    enemy.clearTint();
    enemy.stopMoving();
    enemy.startCooldown("claw", args.cooldownMs); // 完了・中断どちらでも開始
  },
});
```

#### ④ スタンアクション (`stunAction`)

行動を中断し、`applyStun` で計算された実効スタン時間（`enemy.pendingStunDurationMs`）だけ硬直します。定数の設定値を持たないため、全種類の敵で同じインスタンスを共有できます。

```typescript
export const stunAction = defineAction({
  initData: (enemy) => {
    enemy.stopMoving();
    enemy.setTint(0xffff66);
    return {
      timer: 0,
      durationMs: enemy.pendingStunDurationMs, // 耐性計算済みのスタン時間を取得
    };
  },
  update: (_enemy, _context, data, _args, delta) => {
    data.timer += delta;
    if (data.timer >= data.durationMs) return "done";
  },
  onReset: (enemy) => {
    enemy.clearTint();
  },
});
```

---

### ステップ3: ステートマシン本体（`Enemy<K>`）

`"done"` を受けたときの遷移先は `pickNext(entry.onDone)` で決定します。

```typescript
export class Enemy<K extends string> extends EnemyBase {
  public currentState: K;
  private stateData: unknown = null;
  private started = false;
  private pendingState?: K;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    initialState: K,
    private table: StateTable<K>,
    private watcher?: Watcher<K>,
    resistances?: ResistanceConfig,
    private stunStateKey?: K, // スタン状態に対応するキー（例: "STUN"）
  ) {
    super(scene, x, y, "enemy", resistances);
    this.currentState = initialState;
    // 初期状態の init は、context が揃う最初の updateEnemy まで遅延する
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
    this.table[this.currentState].run.onReset?.(this, this.stateData);

    // 新状態への切り替え＆専用データの生成（進入処理もここで走る）
    this.currentState = next;
    this.stateData = this.table[next].run.init(this, context);
  }

  public updateEnemy(context: GameContext, delta: number): void {
    // 0. 基盤の更新（スロウ/アイスメーター・クールダウン・アニメ速度）
    const scaledDelta = this.tickBase(delta);

    // 凍結中はアクションもWatcherも止める。stateData は保持されるので、
    // 解除後に「続きから」再開する
    if (this.timeScale <= 0) {
      this.applyVelocity();
      return;
    }

    // 初回のみ初期状態へ進入
    if (!this.started) {
      this.started = true;
      this.stateData = this.table[this.currentState].run.init(this, context);
    }

    // 1. 割り込み（外部要求 → Watcher の順）。
    // スタン中の再スタン（時間上書き）も成立させるため、pendingState は同一状態への再遷移も許可する
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
```

---

### ステップ4: 敵の定義（テーブル・Watcherは共有）

```typescript
type PredatorState = "MOVE" | "TRIPLE_SHOT" | "DASH_CLAW" | "STUN";

// 行動テーブル：敵の種類ごとに1つだけ作り、全インスタンスで共有する
const PREDATOR_TABLE: StateTable<PredatorState> = {
  MOVE: {
    run: roamOrChaseAction({
      speed: m(2),
      chaseThresholdDistance: m(7),
      minDurationMs: 1000,
      maxDurationMs: 3000,
    }),
    // 確率分岐：75% で 3連射、25% でもう一度移動（weight 省略 = 1）
    onDone: [{ state: "TRIPLE_SHOT", weight: 3 }, { state: "MOVE" }],
  },
  TRIPLE_SHOT: {
    run: tripleShotAction({ totalShots: 3, intervalMs: 250, postDelayMs: 400 }),
    onDone: "MOVE",
  },
  DASH_CLAW: {
    run: dashClawAttackAction({
      dashSpeed: m(7.6),
      dashDurationMs: 300,
      recoveryDurationMs: 450,
      cooldownMs: 1500,
    }),
    onDone: "MOVE",
  },
  STUN: {
    run: stunAction(), // 時間は enemy.pendingStunDurationMs から動的に取る
    onDone: "MOVE",
  },
};

// 常時監視：至近距離に入ったら爪攻撃。クールダウン中・スタン中・爪攻撃中は発動しない
const predatorWatcher: Watcher<PredatorState> = (self, context) => {
  if (self.currentState === "DASH_CLAW" || self.currentState === "STUN") return;
  if (!self.isReady("claw")) return;

  const dist = Phaser.Math.Distance.Between(self.x, self.y, context.player.x, context.player.y);
  if (dist <= m(4)) return "DASH_CLAW";
};

export function createPredatorEnemy(scene: Phaser.Scene, x: number, y: number) {
  return new Enemy<PredatorState>(
    scene,
    x,
    y,
    "MOVE",
    PREDATOR_TABLE,
    predatorWatcher,
    { stunResistance: 20, slowResistance: 10 }, // 耐性設定（詳細は 08 参照）
    "STUN",
  );
}

// 被弾時（弾との衝突コールバックなどから）
// enemy.applyStun(1000); // 耐性20なら 800ms の STUN 状態へ強制遷移
// enemy.applySlow(30);   // スロウ耐性に応じてアイスメーター加算
```

### 実行時の挙動サイクル

```
[通常距離]
  MOVE (1〜3秒直線移動) ──(done)──┬─ 75% ─> TRIPLE_SHOT (予兆→3連射→硬直) ──(done)──> MOVE
    ▲                              │
    └──────────── 25% ─────────────┘   （MOVE を最初からやり直し：方向・時間を再抽選）
    │
    │  (プレイヤーが4m以内に接近 かつ "claw" クールダウン明け)
    ▼
  Watcherが割り込み検知 ───(強制遷移：抽選なし)───> DASH_CLAW (突進＋爪攻撃)
                                              │
    ┌──────────(done：onReset でクールダウン1.5秒開始)──┘
    ▼
  MOVE ──> (75%) TRIPLE_SHOT ──> MOVE ...   （クールダウン中は至近距離でも爪は再発動しない）
    └─ クールダウンが明けて、まだ4m以内なら再び DASH_CLAW
```

---

## 8. 行動阻害デバフとステートマシンの接続点

行動阻害デバフは **「スタン」** と **「スロウ（およびアイスメーター100到達時の凍結）」** の2種類のみであり、ステートマシンに対して**直交した2つの機構**として接続されます。詳細な仕様・耐性計算は **`08-crowd-control-stun-and-slow.md`** を参照してください。

|             | スタン                                                  | スロウ（アイスメーター）／ 凍結                 |
| :---------- | :------------------------------------------------------ | :---------------------------------------------- |
| 実現方法    | `applyStun(ms)` による **`"STUN"` 状態への強制遷移**    | `applySlow(amount)` による **`timeScale` 操作** |
| 耐性100の時 | 遷移自体が発生しない（**行動キャンセルも起きない**）    | メーターが溜まらない／即座に減衰する            |
| `stateData` | 破棄（リセット）                                        | **保持（続きから）**                            |
| 解除後      | 新しい行動（`STUN` の `onDone`）を開始                  | 元の行動を**中断した位置から再開**              |
| Watcher     | スタン中は発動しない（Watcher側で除外）                 | 凍結中（`timeScale = 0`）は Watcher も停止      |
| 遷移の抽選  | 強制遷移なので**抽選なし**（解除後の遷移先は `onDone`） | 遷移自体が起きないので**抽選も発生しない**      |

### なぜこの分離がうまく機能するのか

- **スタン**: 「行動をキャンセルして硬直させる」ため、現在の `stateData` を破棄して `"STUN"` ステートへ `transitionTo` するステートマシンの仕組みそのもので表現できます。
- **スロウ／凍結**: 「現在の行動をキャンセルせず、進行速度だけを落とす／一時停止する」ため、状態遷移を起こさず `delta` に `timeScale` を掛けるだけで、溜め攻撃の途中や連射の2発目から自然に再開できます。

---

## 9. Phaser アニメーションシステムとボスの扱い

### 1. アニメーションの尺との一致

Phaser 3 では `enemy.anims.currentAnim?.duration`（ミリ秒）を取得できるため、アニメーション再生完了待ちを `data.timer >= animDuration` で同期できます（`Sprite` 系クラスが必要）。`anims.timeScale` も `this.timeScale` に同期させるため、スロウ中も判定が破綻しません。

### 2. 強制中断（`onReset`）による不整合防止

被弾スタンなどで状態を奪われた際、`onReset` で後始末を呼ぶことで、「怯んでいるのに攻撃エフェクトや移動速度が残る」といったバグを防げます。`onReset` は正常完了時にも呼ばれるため、後始末は冪等に書きます。

### 3. 雑魚とボスの関係：共通基盤＋ボス専用ステートマシン

本設計の `Enemy<K>` は雑魚敵向けです。ボスには次の要件があり、**ボス専用のステートマシンを別に書く**と割り切ります。

- **フェーズ管理**（HP50%以下で発狂など）：フェーズごとに `StateTable` を差し替える
- **複数の割り込み**：優先度付き Watcher（配列）や、状態ごとの `interruptible` フラグ
- **割り込み後の復帰（スタック）**：現在の `state` と `stateData` を退避する `interruptWith` / `resume`
- **並列行動**：「移動しながら射撃」を複合アクションとして別途書く

**共有するもの**: `EnemyBase`（物理・スタン耐性・スロウ耐性・アイスメーター・クールダウン）、`defineAction`、`BoundAction`、`NextSpec` / `pickNext`（確率分岐）、時間の規約（第4章）。
`Boss extends EnemyBase` として書けば、雑魚で作ったアクションもそのまま流用でき、スタンやスロウ／凍結の耐性システムも共通で動作します（例：ボスは `stunResistance: 100` にして行動キャンセルを無効化し、`slowResistance: 80` で凍結上限を100未満に抑えて完全凍結を防ぐ、といった調整がパラメータだけで可能になります）。

---

## 10. 設計上の制約と拡張指針

### 本設計が解決しないこと

- **並列行動の合成**: 1つのアクションが1つの行動を占有するため、「移動しながら射撃」は専用アクションを書く必要がある（組み合わせ爆発の再発点）。
- **割り込み後の復帰**: スタンで状態を奪うと `stateData` は破棄される。続きから再開したい場合はスロウ／凍結（`timeScale`）を使うか、ボス側に `interruptWith` / `resume` を実装する。
- **複数の完了結果**: `"done"` の1種類のみ。完了結果で遷移先を分けたい場合は、戻り値を `"hit" | "miss"` のようなユニオンに拡張し、`onDone` を `on: { hit: NextSpec<K>; miss: NextSpec<K> }` に変える。確率分岐（`NextSpec`）は結果ごとの遷移先にもそのまま使えるため、両者は独立して組み合わせられる。
- **状況に応じて変わる確率**: `weight` は静的な数値のみ。「HPが低いほど攻撃に寄せる」「直前と同じ行動を避ける」といった動的な比率は扱えない。必要になったら `onDone` に `(enemy, context) => readonly WeightedNext<K>[]` のような関数形を許す拡張を検討する。

### 設計判断の要約

| 判断                                    | 理由                                                                  |
| :-------------------------------------- | :-------------------------------------------------------------------- |
| アクションは `"done"` / `void` のみ返す | 遷移先を知らないので再利用でき、遷移グラフがテーブルで読める          |
| 状態キーを敵ごとのリテラル型に          | 遷移先のタイポ・状態の定義漏れをコンパイル時に検出                    |
| `onDone` は状態名 or 重み付き配列       | 確率分岐もテーブルで宣言でき、配列内のタイポも型で検出できる          |
| `weight` は相対比率・省略時1            | 合計を気にせず書け、全省略で一様ランダムにできる                      |
| 抽選は正常完了時のみ                    | Watcher・外部要求は決定的に保ち、凍結中は遷移しないので抽選も起きない |
| 毎フレーム `delta` 渡し                 | 溜め中の旋回、スロウ・凍結が自然に書ける                              |
| 時間・速度・クールダウンの規約          | `timeScale` によるスロウ・凍結を、スタックなしで成立させる            |
| デバフ仕様を `EnemyBase` に隔離         | AIの行動ロジックと、耐性・メーター計算の関心事を完全に分離できる      |
| テーブルとWatcherを共有                 | スポーンごとのクロージャ生成を避ける                                  |
| ボスは別ステートマシン                  | 雑魚側の複雑化を防ぎつつ、基盤とアクションは共有できる                |
