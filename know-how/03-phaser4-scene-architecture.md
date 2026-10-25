# Phaser 4 シーン構成アーキテクチャ

ゲーム体験を快適にし、保守性の高い構造を実現するための Phaser シーン設計パターンです。

---

## 1. シーン遷移と構成図

```
PreloadScene (初期読み込み)
    │
    ▼ scene.start
TitleScene (タイトル・スタート)
    │
    ▼ scene.start
GameScene (ゲーム本体・物理演算)
    ├── [並行起動: launch] UIScene (HPバー、スコア、ポーズ)
    ├── [並行起動: launch] ControllerScene (バーチャル十字キー、SHOTボタン ※タッチ時)
    └── [ゲームオーバー時: launch] ResultScene (静止したゲーム画面の上に重ねて表示)
```

---

## 2. 各シーンの役割と起動タイプ

| シーン名              | 役割                               | 起動タイプ                        | 呼び出し元                                           |
| :-------------------- | :--------------------------------- | :-------------------------------- | :--------------------------------------------------- |
| **`PreloadScene`**    | アセット読み込み、プログレスバー   | **初期起動**                      | ゲーム起動時に配列先頭で自動起動                     |
| **`TitleScene`**      | タイトル表示、スタート・設定ボタン | **メイン画面** (`scene.start`)    | Preload完了時、または各シーンの「タイトルへ」        |
| **`GameScene`**       | 自機、敵、弾、当たり判定、物理演算 | **メイン画面** (`scene.start`)    | タイトルのスタート、Resultのリトライ                 |
| **`UIScene`**         | HPバー、スコア、ポーズボタン       | **オーバーレイ** (`scene.launch`) | GameScene 作成時に自動並行起動                       |
| **`ControllerScene`** | バーチャル十字キー、ショットボタン | **オーバーレイ** (`scene.launch`) | GameScene 作成時にタッチ端末検知で自動起動           |
| **`ResultScene`**     | クリア／ゲームオーバー演出、スコア | **オーバーレイ** (`scene.launch`) | GameScene でHPゼロ時にゲームを一時停止して重ねて表示 |

---

## 3. メイン画面 (`scene.start`) と オーバーレイ画面 (`scene.launch`)

### `scene.start("NewScene")`

- 呼び出し元のシーンを終了（破棄）し、新しいシーンに切り替えます。
- **使用例**: タイトル画面からゲーム本編へ進むとき、リザルトからタイトルへ戻るとき。

### `scene.launch("OverlayScene")`

- 現在のシーンを動かしたまま、その上に別のシーンを並行して重ねて描画します。
- **ポーズメニューやリザルト画面の極意**:
  `GameScene` を `this.scene.pause("GameScene")` で一時停止した上で `ResultScene` や `UIScene` のモーダルを重ねることで、**背後に静止したプレイ画面を残したまま半透明のダイアログを表示**できます。

```ts
// ゲームオーバー時の処理例 (GameScene.ts)
private gameOver() {
  this.physics.pause();
  this.scene.pause("GameScene"); // 画面を静止

  // 背後のゲーム画面を残したままリザルト画面を重ねる
  this.scene.launch("ResultScene", {
    result: "gameover",
    score: this.score,
  });
}
```

---

## 4. Phaser 4 における Group.children の重大な仕様変更

> [!WARNING]
> **Phaser 3 と Phaser 4 の互換性破壊**  
> Phaser 3 では `group.children.each()` が使えましたが、**Phaser 4 では `Group.children` は JavaScript 標準の `Set<GameObject>`** に変更されました。そのため、`.each()` を呼ぶと `TypeError: this.bullets.children.each is not a function` エラーが発生します。

### 解決策: `getChildren()` による安全なループ処理

```ts
// ❌ Phaser 3 以前の書き方 (Phaser 4 ではエラー)
this.bullets.children.each((bullet) => {
  bullet.destroy();
});

// ⭕ Phaser 4 での安全な書き方
const bullets = this.bullets.getChildren() as Phaser.Physics.Arcade.Image[];
for (const bullet of bullets) {
  if (bullet.active && bullet.y < -10) {
    bullet.destroy(); // ループ中に destroy しても安全
  }
}
```

`Group.getChildren()` は内部メンバーの配列のシャローコピーを返すため、ループ内で要素を `destroy()` しても反復処理が壊れません。
