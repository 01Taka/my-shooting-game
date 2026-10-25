# Phaser 4 の Group.children 仕様変更エラー解決法

## エラー概要

```
Uncaught TypeError: this.bullets.children.each is not a function
    at update (GameScene.ts:193)
```

Phaser 3 から Phaser 4 へ移行した際、または Phaser 3 の解説記事を参考にコードを書いた際に必ず発生するエラーです。

---

## 原因の分析

- **Phaser 3**: `group.children` は Phaser 独自のデータ構造（`Phaser.Structs.Set`）であり、反復用ヘルパー `.each()` が提供されていました。
- **Phaser 4**: `group.children` の内部型が **JavaScript 標準の `Set<GameObject>`** に変更されました。標準の `Set` には `.each()` というメソッドは存在しないため、`TypeError` が発生します。

---

## 解決策

### ❌ 誤ったコード（Phaser 3 以前）

```ts
this.bullets.children.each((bullet) => {
  if (bullet.y < -10) bullet.destroy();
});
```

### ⭕ 正しいコード（Phaser 4）

`group.getChildren()` メソッドを使用します。

```ts
const bullets = this.bullets.getChildren() as Phaser.Physics.Arcade.Image[];
for (const bullet of bullets) {
  if (bullet.active && bullet.y < -10) {
    bullet.destroy(); // ループ中に destroy しても安全
  }
}
```

### なぜ `getChildren()` が安全なのか？

`Group.getChildren()` は内部メンバーの配列のコピーを返します。  
JavaScript の `for..of` や `forEach` で直接 `group.children`（Set）を走査しながら `destroy()` を呼ぶと、反復中にコレクションが変更されて要素のスキップや不具合が起きる危険がありますが、`getChildren()` の配列を走査すれば要素を安全に破棄できます。
