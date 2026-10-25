# あらゆるゲームに派生できるモジュール設計思想

本リポジトリは「単一のシューティングゲームを作る」だけでなく、**「あらゆるスマホ横画面ゲームを生み出すための汎用ゲームテンプレート」** として機能するように設計されています。

---

## 1. なぜゲーム固有情報をメソッドとして切り出したのか？

### 典型的なゲームコードの課題（密結合）

多くのゲーム開発では、`create()` メソッドの中に以下がすべて混在して書かれます：

- 画面遷移やUI配置などのフレームワーク処理
- 「SPACE SHOOTER」というタイトル文字
- 自機や敵の生成、速度、弾の連射速度などのゲーム特有ルール

これでは、別のゲーム（例えば横スクロールアクションやパズルゲーム）を作ろうとした際、コードのどこを修正すればいいのか分からず、プロジェクトを丸ごと書き直すことになります。

---

## 2. Template Method パターンによる関心の分離

本プロジェクトでは、すべての Scene で **「変更不要な共通基盤ロジック」** と **「ゲーム固有のカスタマイズ情報」** を明確に切り分けました。

```
[基盤処理（変更不要）]
create() {
  1. UIやコントローラーの初期化
  2. this.initGameObjects();  ◀── ゲーム固有メソッドを呼ぶ
  3. this.setupCollisions();   ◀── ゲーム固有メソッドを呼ぶ
}

[カスタマイズメソッド（派生時はここだけ変更・オーバーライド）]
protected getGameParameters() { ... }
protected initGameObjects() { ... }
protected setupCollisions() { ... }
```

### 各シーンで切り出されたメソッド一覧

- **`TitleScene`**: `getTitleConfig()`（タイトル文字・色）, `getMenuButtons()`（ボタン一覧）
- **`PreloadScene`**: `loadCustomAssets()`（画像・音声ロード）, `createDummyAssets()`（図形生成）
- **`GameScene`**: `getGameParameters()`（パラメータ）, `initGameObjects()`（キャラ生成）, `setupCollisions()`（当たり判定）
- **`UIScene`**: `getHUDConfig()`（HP/スコア文言）, `getPauseMenuConfig()`（ポーズメニュー項目）
- **`ControllerScene`**: `getStickConfig()`（スティック配置・半径・カラー・ラベル等）
- **`ResultScene`**: `getResultConfig()`（クリア/ゲームオーバー文字）, `getActionButtons()`（リトライボタン等）

### GameScene のモジュール責任分割（Manager パターン）

`GameScene` が肥大化して複数の責任を負うことを防ぐため、ゲームロジックは以下の独立したマネージャーモジュール（`src/game/`）へ委譲されています：

1. **`CameraManager`**: 自機への遅延ゼロ追従 ＋ SmoothDamp（臨界減衰スプリング）視線先行オフセット、画面シェイク
2. **`BulletManager`**: 弾丸プール、発射SE・角度制御、有効射程外の自動消去
3. **`EnemyManager`**: 360度ランダムスポーン、自機追従AI移動・向き合わせ、遠距離消去
4. **`PlayerController`**: キーボード（WASD/矢印/Space）、バーチャルスティック、PCマウス入力の合成と速度・向き計算
5. **`math.ts` (`src/utils/math.ts`)**: 臨界減衰スプリング（SmoothDamp）等の純粋な数学・物理演算

これにより、`GameScene` は各モジュールを配線し、衝突判定（`setupCollisions`）とゲーム進行（HP・スコア・ゲームオーバー）の調整役に専念できます。

---

## 3. 別ゲームへの派生ワークフロー

この設計により、別のゲームを作る際の手順は極めてシンプルになります：

1. **クラスを継承する**:
   ```ts
   export class FlappyBirdScene extends GameScene {
     protected getGameParameters() {
       return {
         initialHp: 1,
         gravity: 800,
         jumpVelocity: -300,
       };
     }
     // initGameObjects や setupCollisions をオーバーライド
   }
   ```
2. **基盤機能は自動で手に入る**:
   スマホ横画面対応、ズーム防止、フルスクリーン制御、タッチ操作、React設定モーダル、文字の高精細化などの複雑な基盤は、1行も書き直すことなくそのまま再利用できます。
