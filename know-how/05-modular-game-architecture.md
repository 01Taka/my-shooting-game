# あらゆるゲームに派生できるモジュール設計

基盤となる共通処理（画面遷移、スマホ横画面制御、UIオーバーレイ、タッチ操作受付、入力遮断など）を保持したまま、**ゲーム特有の情報だけをメソッドとして切り出し、オーバーライドや編集だけで別のゲームに即座に派生できる設計パターン**です。

---

## 1. 切り出すべき情報のカテゴリ

| 対象シーン            | 切り出しメソッド名                                                                                     | 担当するゲーム固有情報                                                                           |
| :-------------------- | :----------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **`TitleScene`**      | `getTitleConfig()`<br>`getMenuButtons()`                                                               | タイトル・サブタイトルのテキストや配色<br>スタートや設定などのメニュー一覧                       |
| **`PreloadScene`**    | `loadCustomAssets()`<br>`createDummyAssets()`                                                          | 読み込む画像・音声ファイルパス<br>プロトタイプ用の図形テクスチャ生成                             |
| **`GameScene`**       | `getGameParameters()`<br>`initGameObjects()`<br>`setupCollisions()`<br>`handlePlayerInputAndActions()` | 初期HP、速度、スコアなどの定数<br>自機や敵グループの生成<br>当たり判定ルール<br>入力に応じた挙動 |
| **`UIScene`**         | `getHUDConfig()`<br>`getPauseMenuConfig()`                                                             | HPラベル、スコア表記プレフィックス<br>ポーズメニューの項目・遷移先                               |
| **`ControllerScene`** | `getControllerConfig()`                                                                                | D-Pad（十字キー）のボタン配置やラベル<br>アクションボタン（SHOT等）の数や色                      |
| **`ResultScene`**     | `getResultConfig()`<br>`getActionButtons()`                                                            | クリア/ゲームオーバーのタイトルや色、紙吹雪演出<br>リトライやタイトルへ戻るボタン                |
| **`SettingsModal`**   | `getModalHeader()`                                                                                     | 設定画面のタイトルやアイコン                                                                     |

---

## 2. 設計例 (`GameScene.ts`)

共通のライフサイクル（`create`, `update` 等）と、ゲーム固有のルール（パラメータ、当たり判定、移動）を明確に分離します。

```ts
export class GameScene extends Phaser.Scene {
  // ==========================================
  // ゲーム特有の設定・ルール・パラメータ
  // （派生ゲーム作成時はここをオーバーライドまたは編集）
  // ==========================================

  /** ゲームパラメータ（速度やHP、スコアなど） */
  protected getGameParameters() {
    return {
      initialHp: 100,
      playerSpeed: 250,
      fireRateMs: 180,
      enemyScore: 100,
    };
  }

  /** ゲームオブジェクト（プレイヤー、敵グループ等）の初期化 */
  protected initGameObjects(width: number, height: number) {
    this.player = this.physics.add.image(width / 2, height - 60, "player");
    this.bullets = this.physics.add.group({ defaultKey: "bullet" });
    this.enemies = this.physics.add.group();
  }

  /** 衝突判定ルールの設定 */
  protected setupCollisions() {
    const params = this.getGameParameters();
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => {
      b.destroy();
      e.destroy();
      this.addScore(params.enemyScore);
    });
  }

  /** 入力に応じたプレイヤーの移動とアクション */
  protected handlePlayerInputAndActions(time: number) {
    // 十字キー移動やショット処理
  }

  // ==========================================
  // ゲーム共通基盤処理（変更不要）
  // ==========================================

  create() {
    const { width, height } = this.scale;
    this.scene.launch("UIScene");

    // タッチ端末判定でコントローラー起動
    if (this.sys.game.device.input.touch || navigator.maxTouchPoints > 0) {
      this.scene.launch("ControllerScene");
    }

    // 上記のゲーム固有メソッドを順次呼び出し
    this.initGameObjects(width, height);
    this.setupCollisions();
  }

  update(time: number) {
    this.handlePlayerInputAndActions(time);
    this.updateGameObjects();
  }
}
```

---

## 3. 別ゲームへ派生させる手順

1. **クラスの継承**:
   `class ActionGameScene extends GameScene` のように継承クラスを作成します。
2. **メソッドのオーバーライド**:
   `getGameParameters()` で速度やHPを変更し、`initGameObjects()` や `setupCollisions()` にジャンプや障害物などの新しいルールを記述します。
3. **`TitleScene` や `ControllerScene` の調整**:
   `getControllerConfig()` をオーバーライドして、SHOTボタンを「JUMP」や「DASH」に変更するだけで、スマホ対応の横スクロールアクションやパズルゲームへ簡単に生まれ変わります。
