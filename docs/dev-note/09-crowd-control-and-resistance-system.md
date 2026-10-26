# 行動阻害デバフ（スタン・スロウ）と耐性・アイスメーター設計 (`08-crowd-control-stun-and-slow.md`)

本作における敵への行動阻害（Crowd Control: CC）デバフの仕様と、それを管理する基盤クラス（`EnemyBase`）の設計ドキュメントです。

> **関連ドキュメント**: ステートマシンおよびアクションサブルーチン側の設計は **`07-state-machine-action-subroutine-enemy-ai.md`** を参照してください。本ドキュメントの機構は、AIの意思決定ロジックとは切り離された独立したレイヤーとして機能します。

---

## 1. 基本方針：行動阻害は「スタン」と「スロウ」の2種のみ

ゲームのルールを明快にし、敵ごとのパラメータ調整（耐性値）を直感的に行うため、行動阻害デバフは以下の**2種類のみ**に限定します。

1. **スタン（Stun）**: 現在の行動を**強制キャンセル**し、一定時間その場で硬直させる。
2. **スロウ（Slow / Ice Meter）**: 現在の行動を**キャンセルせず**、アイスメーターの蓄積割合に応じて動作速度（移動・攻撃・アニメ・クールダウン）を低下させる。メーターが **凍結ボーダー（現状100）以上** に達すると**凍結状態（完全停止）**になる。

これに伴い、すべての敵が持つ行動阻害耐性ステータスも以下の**2つのみ**となります。

- **`stunResistance`（スタン耐性）**: `0` 〜 `100`
- **`slowResistance`（スロウ耐性）**: `0` 〜 `100`

---

## 2. スタンの仕様

### 2.1 スタン耐性（`0` 〜 `100`）の挙動

スタン攻撃が命中した際、攻撃側が持つ「基礎スタン時間（`baseDurationMs`）」と、敵の「スタン耐性（`stunResistance`）」から**実効スタン時間**を決定します。

$$\text{effectiveDurationMs} = \text{baseDurationMs} \times \left(1 - \frac{\text{stunResistance}}{100}\right)$$

| スタン耐性            | 挙動                                                                                                   |
| :-------------------- | :----------------------------------------------------------------------------------------------------- |
| **`0`**               | 元のスタン時間（100%）をすべて適用し、行動をキャンセルしてスタン状態へ遷移する。                       |
| **`1` 〜 `99`**       | 耐性に応じて短縮されたスタン時間を適用し、行動をキャンセルしてスタン状態へ遷移する。                   |
| **`100`（完全耐性）** | **スタンの影響を一切受けない。状態遷移を発火させないため、実行中の行動キャンセル（怯み）も起きない。** |

### 2.2 設計上の重要ルール：耐性100での「0秒スタン」の防止

もし耐性100の敵に対して「0ミリ秒のスタン状態へ遷移させる」という実装にしてしまうと、**「一瞬でスタンは解けるが、チャージ中だった攻撃がキャンセルされてしまう」** という重大なバグになります。

そのため、`effectiveDurationMs <= 0`（または `stunResistance >= 100`）の場合は、**ステートマシンへの遷移要求（`onStunTriggered`）自体を呼ばずに早期リターンする**仕様とします。

---

## 3. スロウとアイスメーターの仕様

スロウおよび凍結は、敵ごとに保持する単一の数値 **「アイスメーター（`iceMeter`）」** によって一元管理します。

### 3.1 蓄積率（`iceMeter / freezeThreshold`）と速度（`timeScale`）の関係

凍結ボーダーに対する現在の蓄積率（進捗度）を $\text{ratio}$ とします。

$$\text{ratio} = \frac{\text{iceMeter}}{\text{freezeThreshold}}$$

アイスメーターの値に応じて、`timeScale`（速度倍率）は以下のように決まります。

| アイスメーターの状態                 | 蓄積率 ($\text{ratio}$) | 状態       | 速度倍率 (`timeScale`) | 挙動                                                                      |
| :----------------------------------- | :---------------------- | :--------- | :--------------------- | :------------------------------------------------------------------------ |
| **`iceMeter <= 0`**                  | `0.0` (0%)              | **通常**   | **`1.0` (100%)**       | 通常速度で行動。                                                          |
| **`0 < iceMeter < freezeThreshold`** | `0.0 < ratio < 1.0`     | **スロウ** | **`1.0 - ratio`**      | **溜まるほど滑らかに減速する。**<br>（例: 蓄積率 40% のとき、速度は 60%） |
| **`freezeThreshold <= iceMeter`**    | `1.0 <= ratio`          | **凍結**   | **`0.0` (0%)**         | **完全に動きが止まる。**<br>減衰してボーダー未満に戻るまで停止し続ける。  |

- **連続性の担保**: メーターが溜まるほど徐々に減速し、ボーダー（100%）に達した瞬間に `0.0`（停止）へ段差なく着地します。
- **UI連携の容易さ**: 頭上の凍結ゲージも `iceMeter / freezeThreshold` でそのまま 0.0〜1.0 のバーを描画できます。

### 3.2 スロウ耐性（`0` 〜 `100`）から一意に定まる3つのパラメータ

敵が持つ **`slowResistance`（`0` 〜 `100`）** から、以下の3つのパラメータが**一意の関数（またはテーブル）**として定まります（※具体的な数値・曲線はバランス調整フェーズで決定するため未定とし、純粋関数 `resolveSlowProfile` に集約します）。

1. **凍結するボーダー（`freezeThreshold`）**
   - 凍結状態（`timeScale = 0`）へと切り替わるメーター閾値。
   - **現行仕様では `slowResistance` に関わらず常に `100` を返します**（将来的な拡張性のためにプロファイル経由で取得）。
2. **アイスメーターの減少速度（自然減衰速度 / `decayPerSec`）**
   - 毎秒あたりにアイスメーターが減少していく量（実時間 `delta` に応じて減衰）。
   - 耐性が高いほど素早くメーターが減少し、スロウや凍結状態から早く復帰する。
3. **アイスメーターの上限（最大値 / `maxIceMeter`）**
   - その敵のアイスメーターが到達できる最大値。
   - **重要な役割**:
     - `maxIceMeter >= freezeThreshold` の敵（一般雑魚など）: ボーダーを超えて蓄積した余剰分が、そのまま**凍結持続時間（解凍までの猶予）**になる（例: 上限150・ボーダー100なら、余剰の50が自然減衰で100未満に下がるまで完全停止が持続）。
     - `maxIceMeter < freezeThreshold` の敵（高耐性のボスなど）: **どれだけスロウ攻撃を浴びせてもメーターがボーダーに届かないため、スロウ（減速）にはなるが絶対に完全凍結しない**という特性を、例外処理のコードを書かずに表現できる。

---

## 4. 実装設計（パラメータ解決と `EnemyBase`）

### 4.1 耐性パラメータ計算モジュール（未定値の隔離）

具体的な数値（バランス調整値）はすべてこのファイルに閉じ込め、AIや物理基盤のコードを汚さないようにします。

```typescript
/** 敵に設定する2つの耐性（0〜100） */
export interface ResistanceConfig {
  stunResistance?: number; // 0〜100（省略時 0）
  slowResistance?: number; // 0〜100（省略時 0）
}

/** スロウ耐性(0〜100)から一意に導出される特性プロファイル */
export interface SlowProfile {
  /** 凍結状態になるボーダー閾値（現行仕様では常に 100） */
  freezeThreshold: number;
  /** アイスメーターの減少速度（1秒あたりの自然減少量） */
  decayPerSec: number;
  /** アイスメーターの上限（freezeThreshold 未満なら凍結無効、以上なら超過分が凍結持続時間になる） */
  maxIceMeter: number;
}

/**
 * スタン耐性(0〜100)から実効スタン時間(ms)を計算する
 * - 耐性 0   -> 100% 適用
 * - 耐性 100 -> 0ms（スタン無効・行動キャンセルなし）
 */
export function calcEffectiveStunDuration(baseDurationMs: number, stunResistance: number): number {
  const r = Phaser.Math.Clamp(stunResistance, 0, 100);
  if (r >= 100 || baseDurationMs <= 0) return 0;
  return baseDurationMs * (1 - r / 100);
}

/**
 * スロウ耐性(0〜100)からパラメータを一意に決定する
 * ※ 具体的な係数・計算式は仮置き（バランス調整時にここだけを変更する）
 */
export function resolveSlowProfile(slowResistance: number): SlowProfile {
  const r = Phaser.Math.Clamp(slowResistance, 0, 100);
  const ratio = r / 100; // 0.0 〜 1.0

  // TODO: 具体的な数値・曲線はゲームバランスに合わせて確定させる
  return {
    // 凍結ボーダー：slowResistance に関わらず常に 100
    freezeThreshold: 100,

    // メーター減少速度（例: 耐性0で 毎秒15減少、耐性100で 毎秒60減少）
    decayPerSec: Phaser.Math.Linear(15, 60, ratio),

    // メーター上限（例: 耐性0で 上限150[凍結あり]、耐性80以上で 100未満[完全凍結しない]）
    maxIceMeter: Phaser.Math.Linear(150, 50, ratio),
  };
}

/**
 * アイスメーター蓄積率から timeScale (0.0 〜 1.0) を算出する
 * - 0% 以下      : 1.0 (通常速度 100%)
 * - 100% 以上    : 0.0 (凍結・完全停止)
 * - 0% 〜 100%   : 溜まるほど滑らかに減速 (1 - ratio)
 */
export function meterToTimeScale(iceMeter: number, freezeThreshold: number): number {
  if (iceMeter <= 0) return 1.0;
  if (iceMeter >= freezeThreshold) return 0.0;

  const ratio = iceMeter / freezeThreshold;
  return 1.0 - ratio;
}
```

---

### 4.2 基盤クラス `EnemyBase` の実装

`EnemyBase` は上記の純粋関数を使ってスタン・アイスメーターを更新し、`timeScale` を決定します。

```typescript
export abstract class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  // --- 耐性ステータス (0〜100) ---
  public readonly stunResistance: number;
  public readonly slowResistance: number;
  public readonly slowProfile: SlowProfile;

  // --- デバフ実行時状態 ---
  /** アイスメーター (0 〜 slowProfile.maxIceMeter) */
  public iceMeter = 0;
  /** 現在の行動速度倍率 (1.0 = 通常, 0 < t < 1 = スロウ, 0.0 = 凍結) */
  public timeScale = 1;
  /** 直近の applyStun で確定した実効スタン時間(ms) */
  public pendingStunDurationMs = 0;

  private baseVelocity = new Phaser.Math.Vector2();
  private cooldowns: Record<string, number> = {};

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    resistances: ResistanceConfig = {},
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.stunResistance = Phaser.Math.Clamp(resistances.stunResistance ?? 0, 0, 100);
    this.slowResistance = Phaser.Math.Clamp(resistances.slowResistance ?? 0, 0, 100);
    this.slowProfile = resolveSlowProfile(this.slowResistance);
  }

  // =====================================================================
  // 1. 行動阻害デバフ付与API（被弾判定などから呼ぶ）
  // =====================================================================

  /**
   * スタンを付与する。
   * - 耐性100の場合は実効時間が 0 となり、行動キャンセル（状態遷移）自体が発生しない。
   */
  public applyStun(baseDurationMs: number): void {
    const duration = calcEffectiveStunDuration(baseDurationMs, this.stunResistance);
    if (duration <= 0) return; // 耐性100：キャンセルも発生させない

    this.pendingStunDurationMs = duration;
    this.onStunTriggered();
  }

  /**
   * スロウ（アイスメーター）を蓄積させる。
   */
  public applySlow(amount: number): void {
    if (amount <= 0) return;

    this.iceMeter = Math.min(this.slowProfile.maxIceMeter, this.iceMeter + amount);
    this.timeScale = meterToTimeScale(this.iceMeter, this.slowProfile.freezeThreshold);
  }

  /** サブクラス（Enemy<K> や Boss）で「スタン状態への強制遷移」を実装するフック */
  protected abstract onStunTriggered(): void;

  // =====================================================================
  // 2. アクション向け移動・クールダウンAPI
  // =====================================================================

  public moveAt(angle: number, speed: number): void {
    this.scene.physics.velocityFromRotation(angle, speed, this.baseVelocity);
  }

  public stopMoving(): void {
    this.baseVelocity.set(0, 0);
  }

  public startCooldown(key: string, ms: number): void {
    this.cooldowns[key] = ms;
  }

  public isReady(key: string): boolean {
    return (this.cooldowns[key] ?? 0) <= 0;
  }

  // =====================================================================
  // 3. 毎フレームの更新処理
  // =====================================================================

  /** 毎フレーム冒頭に呼ぶ。timeScale 適用後の delta (ミリ秒) を返す */
  protected tickBase(delta: number): number {
    this.updateIceMeter(delta);
    const scaledDelta = delta * this.timeScale;

    // クールダウンは scaledDelta で進行（凍結中は進まない、スロウ中は遅く進む）
    for (const key in this.cooldowns) {
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - scaledDelta);
    }

    // アニメーション速度も timeScale に完全同期
    this.anims.timeScale = this.timeScale;
    return scaledDelta;
  }

  /** 基準速度 × timeScale を物理ボディへ反映する */
  protected applyVelocity(): void {
    this.body.setVelocity(
      this.baseVelocity.x * this.timeScale,
      this.baseVelocity.y * this.timeScale,
    );
  }

  /** アイスメーターの自然減衰と timeScale の更新（減衰自体は実時間 delta で進む） */
  private updateIceMeter(delta: number): void {
    if (this.iceMeter > 0) {
      const decay = (this.slowProfile.decayPerSec * delta) / 1000;
      this.iceMeter = Math.max(0, this.iceMeter - decay);
    }
    this.timeScale = meterToTimeScale(this.iceMeter, this.slowProfile.freezeThreshold);
  }
}
```

---

## 5. スタンとスロウ（凍結）が重なった場合の挙動

スタン（状態遷移）とスロウ（`timeScale`）は直交しているため、同時にかかった場合も特別な分岐コードなしで自然に連携します。

1. **スロウ中にスタンを受けた場合**
   - 即座に `STUN` 状態へ遷移して行動はキャンセルされる。
   - `STUN` アクションの `data.timer += scaledDelta` にもスロウの `timeScale` が掛かるため、**冷えている敵はスタンからの復帰（硬直解除）も遅くなる**。
2. **スタン中に凍結（アイスメーターがボーダー以上）になった場合**
   - `timeScale = 0` になるため、スタンの経過タイマーも一時停止する（氷漬けのまま固まり、解凍後に残りのスタン時間を消化して復帰する）。
3. **凍結中にスタンを受けた場合**
   - `onStunTriggered` により `pendingState = "STUN"` が予約される。
   - 凍結中（`timeScale <= 0`）はステートマシンの更新が止まっているが、解凍された瞬間のフレームで `STUN` への遷移が実行され、チャージ中だった行動などは確実にキャンセルされる。
