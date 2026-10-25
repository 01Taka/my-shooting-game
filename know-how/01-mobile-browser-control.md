# スマホ横画面のためのブラウザ制御＆操作制限

スマートフォン（iOS Safari / Android Chrome）の横画面ブラウザで快適にWebゲームを遊べるようにするための設定・制限ノウハウです。

---

## 1. マルチタップによる画面拡大縮小（ズーム）の防止

スマートフォンのブラウザは、デフォルトでダブルタップやピンチイン・ピンチアウトによるズームを許可しています。アクションゲームなどでマルチタップした際に画面が拡大されてしまうのを防ぎます。

### 1.1 CSS での完全遮断

よく使われる `touch-action: manipulation;` は「ダブルタップズーム」は防ぎますが、**2本指以上のピンチイン・ピンチアウト操作によるズームは許可されてしまいます**。これを防ぐには `touch-action: none;` が必須です。

```css
/* src/index.css */
html,
body,
#root {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100dvh; /* アドレスバーの伸縮に追従 */
  overflow: hidden;
  touch-action: none; /* ← none を指定してピンチズームも完全遮断 */
}
```

### 1.2 Viewport メタタグの設定

```html
<!-- index.html -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
/>
```

- `maximum-scale=1.0, user-scalable=no`: 拡大率を1倍に固定
- `viewport-fit=cover`: ノッチ（切り欠き）やダイナミックアイランドを含む画面全体まで広げる

### 1.3 iOS Safari のジェスチャ強制キャンセル (JavaScript)

iOS Safari は CSS や `user-scalable=no` を一部無視して拡大することがあるため、ブラウザ固有のジェスチャイベントを直接キャンセルします。

```ts
// src/main.tsx
window.addEventListener("gesturestart", (e) => e.preventDefault());
window.addEventListener("gesturechange", (e) => e.preventDefault());
window.addEventListener("gestureend", (e) => e.preventDefault());
```

---

## 2. 文字選択・長押しメニュー・青いハイライトの防止

ゲーム連打時や長押し時に、テキスト選択やブラウザのコンテキストメニューが出るのを防ぎます。

```css
/* src/index.css */
html,
body,
#root {
  -webkit-user-select: none;
  user-select: none; /* テキスト選択の禁止 */
  -webkit-touch-callout: none; /* iOS長押し時の画像保存・リンクメニュー禁止 */
  -webkit-tap-highlight-color: transparent; /* タップ時の一瞬の青い枠を消す */
}
```

```ts
// src/main.tsx
window.addEventListener("contextmenu", (e) => e.preventDefault());
```

---

## 3. フルスクリーン化と横画面（Landscape）固定

ブラウザのセキュリティ仕様上、**タップやクリックなどのユーザー操作をトリガー**としてのみ実行可能です。

```ts
export const enterFullscreen = async () => {
  const elem = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };

  // 1. フルスクリーン化
  if (elem.requestFullscreen) {
    await elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) {
    await elem.webkitRequestFullscreen();
  }

  // 2. 横画面に固定（Android Chrome等で動作）
  if (screen.orientation && "lock" in screen.orientation) {
    try {
      await (screen.orientation as any).lock("landscape");
    } catch {
      // 未対応ブラウザは安全に無視
    }
  }
};
```

### iOS (iPhone Safari) の特性と PWA 対応

iPhone Safari は標準の `requestFullscreen` API をサポートしていません。  
そのため、`index.html` に以下のメタタグを付与し、「ホーム画面に追加」して PWA として起動させることでアドレスバーのない完全全画面アプリとして遊ぶことができます。

```html
<!-- index.html -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

---

## 4. 縦画面時の「横向き回転」案内オーバーレイ

CSSメディアクエリの `orientation: portrait`（Tailwind の `portrait:` バリアント）を利用し、スマホを縦に持っている間はゲーム画面を隠して回転を促すオーバーレイを表示します。

```tsx
/* src/App.tsx */
<div className="fixed inset-0 z-50 hidden flex-col items-center justify-center bg-slate-950/95 p-6 text-center text-white backdrop-blur-sm portrait:flex">
  <RotateDeviceIcon className="h-16 w-16 animate-bounce text-sky-400" />
  <p className="text-lg font-bold">画面を横向きにしてください</p>
  <p className="mt-2 text-sm text-slate-400">
    このゲームは横画面プレイ専用です。端末を横にしてお楽しみください。
  </p>
</div>
```
