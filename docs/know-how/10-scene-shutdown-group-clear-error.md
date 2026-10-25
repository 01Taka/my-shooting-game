# シーン終了・リスタート時の `group.clear()` による `children is undefined` エラー解決法

## エラー概要

リザルト画面から「もう一度遊ぶ（リトライ）」や「タイトルへ戻る」を選択し、`this.scene.stop("GameScene")` を呼び出した際に以下のエラーが発生する：

```
Uncaught TypeError: can't access property "forEach", children is undefined
    clear phaser.esm.js:60963
    destroy EnemyManager.ts:145
    shutdown GameScene.ts:233
    emit phaser.esm.js:208
    shutdown phaser.esm.js:219950
    stop phaser.esm.js:217487
```

---

## 原因の分析

1. **Phaser本体による自動クリーンアップとの競合**:
   - `Scene.stop()` や `Scene.restart()` が実行されると、Phaser 本体のライフサイクルマネージャーがシーン内の DisplayList、UpdateList、Physics World を走査し、所属するすべての GameObject や Physics Group を自動的にクリーンアップ・破棄します。
2. **`group.children` の事前解放**:
   - Phaser 本体が先にグループを解体すると、内部のメンバーコレクション（`group.children`）が `undefined` に設定されます。
   - この状態で、ユーザー定義の `shutdown` イベントリスナー（各マネージャーの `destroy()` 等）から `group.clear(true, true)` を呼び出すと、Phaser 内部の `clear()` 実装が `this.children.forEach(...)` を実行しようとして **`TypeError: children is undefined`** でクラッシュします。

---

## 解決策

### ⭕ 対策1: `group.children` の存在チェック（安全ガード）

マネージャーやシーンの解放処理内で `group.clear()` を呼ぶ際は、`children` がまだ有効に存在するかを必ずチェックします。

```typescript
// ❌ 危険: シーン停止処理中に children が undefined になりクラッシュする
destroy(): void {
  this.enemies?.clear(true, true);
}

// ⭕ 安全: children が存在する場合のみクリアを実行
destroy(): void {
  if (this.enemies && this.enemies.children) {
    this.enemies.clear(true, true);
  }
}
```

> [!NOTE]
> シーン自体が破棄（`stop` または `destroy`）される場合は、Phaser 自身がグループと子要素をメモリから完全に解放するため、手動で `clear()` を呼ぶ必要性自体が低いです。手動で呼ぶ場合は必ず上記のガードを挟みます。

---

### ⭕ 対策2: `shutdown` リスナーの多重登録を防止（`once` を使用）

シーンが再起動（リトライ）されるたびに `this.events.on("shutdown", ...)` を実行していると、シーンが破棄されるたびにリスナーが重複して呼び出され、思わぬ二次災害を引き起こします。

```typescript
// ❌ 危険: シーン再開ごとにハンドラが累積登録される
this.events.on("shutdown", () => {
  this.cleanup();
});

// ⭕ 安全: 1回のシャットダウンで一度だけ確実に実行される
this.events.once("shutdown", () => {
  this.cleanup();
});
```
