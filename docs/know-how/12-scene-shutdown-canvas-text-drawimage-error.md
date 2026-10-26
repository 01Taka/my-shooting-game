# シーン停止（Shutdown）時のUIテキスト更新による `can't access property "drawImage", this.data is null` エラー解決法

## エラー概要

ゲームオーバー画面やリザルト画面から「もう一度遊ぶ（リトライ）」や「タイトルへ戻る」を選択し、`this.scene.stop("ControllerScene")` や `this.scene.restart()` を実行した際に、画面がフリーズしてコンソールに以下のエラーが発生する：

```text
Uncaught TypeError: can't access property "drawImage", this.data is null
    updateUVs phaser.esm.js:233426
    setCutPosition phaser.esm.js:233045
    setSize phaser.esm.js:233088
    updateText phaser.esm.js:94588
    update phaser.esm.js:95645
    setColor phaser.esm.js:95871
    setColor phaser.esm.js:94138
    drawUI ControllerScene.ts:393
    resetInput ControllerScene.ts:960
    cleanup ControllerScene.ts:965
    emit phaser.esm.js:208
    shutdown phaser.esm.js:219950
    stop phaser.esm.js:217487
```

---

## 原因の分析

### 1. シーン破棄と GameObjects（Text）の内部リソース破棄順序

- `Scene.stop()` や `Scene.restart()` が実行されると、Phaser はシーン内の GameObjects（テキスト、スプライト等）の DisplayList、Texture Frame、Canvas 参照を順次破棄（teardown）します。
- `Phaser.GameObjects.Text` の内部では、テクスチャフレーム参照（`frame.data`）が解放され、`null` や切り離された状態になります。

### 2. シャットダウン時（`cleanup`）に UI 再描画やテキスト更新を実行してしまう罠

- シーン終了時のクリーンアップ処理（`cleanup()` や `shutdown` イベントハンドラ）の中で、「入力状態をリセットする」「UIの表示状態をデフォルトに戻す」といった意図で、以下のような描画更新関数を呼んでしまうケースがあります：
  ```typescript
  // ❌ 危険: シャットダウン処理中に呼び出されるとテクスチャ破棄済みでクラッシュする
  protected cleanup(): void {
    this.resetControls(); // 内部で this.updateUI() や this.label.setColor() を呼んでいる
  }
  ```
- この時、テキストのスタイル（`setColor`、`setText`、`setFontSize` 等）を変更しようとすると、Phaser は内部でキャンバスのサイズ再計算・UV更新（`updateText()` ➔ `updateUVs()` ➔ `this.data.drawImage(...)`）を行おうとします。
- しかし、すでにフレームデータ（`this.data`）は破棄されているため、**`TypeError: can't access property "drawImage", this.data is null`** がスローされ、Phaser のシーン遷移マネージャー全体のループがクラッシュして画面がフリーズします。

---

## 解決策

### ⭕ 対策1: クリーンアップ処理（shutdown）と画面描画更新を分離する

シーン終了時のクリーンアップで行うべきことは「状態のクリア（変数の初期化、ポインターID解放）」と「外部イベントリスナーの登録解除（`off`）」のみです。画面描画の更新（再描画）は呼んではいけません。

```typescript
// ❌ 悪い例: 描画更新処理をクリーンアップで使い回す
protected resetControls(): void {
  this.activePointerId = null;
  this.drawButtons(); // 内部で text.setColor() を実行
}

protected cleanup(): void {
  this.resetControls(); // 破棄中に描画が走りクラッシュ！
}

// ⭕ 良い例: 状態のクリアと描画更新を明確に分ける
protected resetControls(): void {
  this.clearInputState();
  if (this.sys && this.sys.isActive()) {
    this.drawButtons();
  }
}

protected clearInputState(): void {
  this.activePointerId = null;
}

protected cleanup(): void {
  this.clearInputState(); // 描画処理は一切呼ばない
  // リスナー解除
  this.scene.get("GameScene")?.events.off("custom-event", this.onEvent, this);
}
```

---

### ⭕ 対策2: 描画メソッドおよびテキスト変更処理にシーン活性チェック（`sys.isActive()`）を設ける

描画メソッドやイベントコールバック内でテキストやグラフィックスを更新する場合、シーンが現在アクティブ（動作中）であるかを必ず確認します。

> [!WARNING]
> Phaser の `this.sys` には `isShutdown()` というメソッドは存在しません。代わりに `this.sys.isActive()` を使用します。

```typescript
protected updateButtonLabel(isActive: boolean): void {
  // シーンおよび GameObject がアクティブな場合のみ実行
  if (
    this.buttonLabel &&
    this.buttonLabel.scene &&
    this.buttonLabel.active &&
    this.sys &&
    this.sys.isActive()
  ) {
    this.buttonLabel.setColor(isActive ? "#ffffff" : "#64748b");
    this.buttonLabel.setAlpha(isActive ? 1.0 : 0.5);
  }
}
```

---

### ⭕ 対策3: `shutdown` イベントリスナーは `once` で登録する

シーンの起動ごとに `this.events.on("shutdown", ...)` を行うと、リトライを繰り返すたびにハンドラが多重登録され、二重実行や競合を引き起こします。

```typescript
// ❌ 危険: リトライごとにリスナーが増殖する
this.events.on("shutdown", this.cleanup, this);

// ⭕ 安全: 1回のシャットダウンで1度だけ実行される
this.events.once("shutdown", this.cleanup, this);
```

---

### ⭕ 対策4: ゲームオーバーで `physics.pause()` を使用している場合は再開時に `physics.resume()` を呼ぶ

ゲームオーバー演出時に `this.physics.pause()` を実行している場合、リトライで `GameScene` が再起動しても、物理エンジン（Arcade Physics）のワールドインスタンスが停止状態のまま引き継がれることがあります。

`GameScene.create()` の冒頭で確実にアンポーズしておきます：

```typescript
create(): void {
  // ゲームオーバー時に pause された物理ワールドを確実に復帰
  this.physics.resume();

  // ゲームの初期化処理...
}
```

---

## チェックリスト

- [ ] `cleanup()` や `shutdown` リスナー内で、テキストやグラフィックスを再描画（更新）するメソッドを呼んでいないか？
- [ ] 外部イベントハンドラやUI更新メソッドに `this.sys?.isActive()` のガードを設けているか？
- [ ] `shutdown` リスナーの登録に `once("shutdown")` を使っているか？
- [ ] ゲームオーバーで停止したタイマーや物理シミュレーション（`this.physics.pause()`）を、再開時の `create()` で復帰させているか？
