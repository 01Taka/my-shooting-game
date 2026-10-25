# フルスクリーンAPIと横画面（Landscape）固定

Webゲームを全画面で起動し、横向き（Landscape）に固定するための汎用ノウハウと、各OSのブラウザ制約への対処法です。

---

## 1. フルスクリーン＆横画面ロックの汎用実装

ブラウザのセキュリティ仕様上、**「画面タップ」などのユーザー操作イベントのコールバック内でのみ実行可能**です。

```ts
export const requestFullScreenAndLandscape = async () => {
  const elem = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };

  // 1. フルスクリーン化
  if (elem.requestFullscreen) {
    await elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) {
    await elem.webkitRequestFullscreen(); // 旧WebKit / Safari
  }

  // 2. 画面の向きを横向きにロック (Android Chrome等)
  if (screen.orientation && "lock" in screen.orientation) {
    try {
      await (screen.orientation as any).lock("landscape");
    } catch (err) {
      // 未対応ブラウザやユーザー拒否時は安全に無視
      console.warn("Screen orientation lock is not supported or was rejected:", err);
    }
  }
};
```

---

## 2. iOS (iPhone Safari) の制約と PWA 対応

- **制約**: iPhone Safari は標準の `requestFullscreen()` に対応していません。
- **解決策 (PWA化)**:
  `index.html` に以下のメタタグを記述し、ユーザーに「ホーム画面に追加」してもらうことで、アドレスバーや下部ナビゲーションのない完全全画面アプリ（スタンドアロン）として起動できます。

```html
<!-- index.html -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

---

## 3. 縦画面時に「端末を回転してください」と促す CSS ガード

ブラウザ側で向きをロックできない環境（iOS Safari等）では、CSSメディアクエリ `@media (orientation: portrait)` を使用して、縦向きの間だけ回転案内画面を表示するのがゲーム開発の業界標準です。

```html
<!-- 縦画面時のみ flex で表示される案内要素 -->
<div class="rotate-notice">
  <p>画面を横向きにしてください</p>
</div>
```

```css
.rotate-notice {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.95);
  color: #fff;
}

@media screen and (orientation: portrait) {
  .rotate-notice {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
}
```
