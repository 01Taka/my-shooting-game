# スマホのタッチ操作制限＆ズーム・選択防止

スマートフォンのブラウザ（iOS Safari / Android Chrome）でWebゲームを動かす際、連打やマルチタップで画面がズームしたり、テキスト選択バーが出現したりするのを完全に防ぐ汎用ノウハウです。

---

## 1. ピンチイン・ピンチアウトズームの防止

### 原因と落とし穴

よく使われる `touch-action: manipulation;` は「ダブルタップによるズーム」は防ぎますが、**2本指以上のマルチタッチによるピンチズームは許可されてしまいます**。ゲーム操作中に2本指で画面に触れると拡大されてしまいます。

### 解決策

1. **CSS**: `touch-action: none;` を指定し、ブラウザのジェスチャ解釈をすべて無効化する。
2. **HTML Viewport**: `user-scalable=no, maximum-scale=1.0` を設定する。
3. **JS (iOS Safari)**: iOS Safari は CSS や Viewport を無視して拡大することがあるため、`gesture` 系のイベントを `preventDefault` で直接キャンセルする。

```css
/* index.css */
html,
body,
#root {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  touch-action: none; /* ← none が必須 */
}
```

```html
<!-- index.html -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
/>
```

```ts
// main.ts / main.tsx (iOS Safari専用対策)
window.addEventListener("gesturestart", (e) => e.preventDefault());
window.addEventListener("gesturechange", (e) => e.preventDefault());
window.addEventListener("gestureend", (e) => e.preventDefault());
```

---

## 2. テキスト選択・長押しメニュー・青いハイライトの防止

ゲーム連打時や長押し時に、文字選択の青いバーやコンテキストメニュー（画像保存等）が出るのを防止します。

```css
/* index.css */
html,
body,
#root {
  -webkit-user-select: none;
  user-select: none; /* テキスト選択禁止 */
  -webkit-touch-callout: none; /* iOSで長押ししたときのポップアップ禁止 */
  -webkit-tap-highlight-color: transparent; /* タップ時の一瞬の青い枠を消す */
}
```

```ts
// main.ts / main.tsx
// 右クリックおよび長押しによるコンテキストメニュー表示を防止
window.addEventListener("contextmenu", (e) => e.preventDefault());
```
