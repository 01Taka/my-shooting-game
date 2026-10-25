# Reactモーダルのタップ突き抜け防止とキャプチャフェーズの罠

Phaser Canvas の上に React 製モーダル（設定画面やダイアログ）を重ねた際に発生する、「背後へのタップ突き抜けバグ」と「閉じるボタンが押せなくなる落とし穴」の完全な解決手順です。

---

## 1. 背後シーンへのタップ突き抜け問題

### 現象

設定モーダルを開いている最中にモーダル上をタップ・操作すると、背後にある Phaser のゲーム画面内のボタンやキャラクターが反応してしまう。

### 原因

React の `onClick={(e) => e.stopPropagation()}` は React ツリー内でのみ有効であり、ブラウザネイティブの `pointerdown` や `touchstart` イベントはすでに背後の Canvas や Window に到達して発火しているため。

### 正しい解決策：Phaser 側の入力を停止する

モーダルの開閉ステート（`isModalOpen`）に連動して、Phaser の入力マネージャーを一時停止します。

```tsx
// App.tsx
useEffect(() => {
  const game = phaserRef.current?.game;
  if (!game) return;

  if (isModalOpen) {
    // モーダル表示中は Phaser の入力を完全無効化
    game.input.enabled = false;
    // 押しっぱなし状態（pointerdownの残り）をリセット
    game.input.pointers?.forEach((p) => p.reset());
  } else {
    // 閉じたら再開
    game.input.enabled = true;
  }
}, [isModalOpen]);
```

---

## 2. 【落とし穴】最外層で `capture: true` によるイベント遮断をしてはいけない

### やりがちなミス

「DOMイベントを確実に止めよう」として、モーダル最外層（背景オーバーレイ）でネイティブイベントを `capture: true` で遮断してしまう：

```ts
// ❌ 絶対にやってはいけないコード
overlayElement.addEventListener("click", (e) => e.stopPropagation(), { capture: true });
overlayElement.addEventListener("pointerdown", (e) => e.stopPropagation(), { capture: true });
```

### なぜ動かなくなるのか？

- **キャプチャフェーズ（`capture: true`）** は、ブラウザが DOM ツリーの親から子要素へイベントを下ろしていくフェーズです。
- 最外層で遮断すると、**イベントが子要素に一切届かなくなり、モーダル内の「×」ボタン、「完了」ボタン、スライダーが完全に反応しなくなります**。

---

## 3. 安全なモーダル実装パターン

Phaser 側の入力は上記の `game.input.enabled = false` で完全に防げているため、モーダルコンポーネント側は標準的な React の実装で安全に動作します。

```tsx
export function Modal({ onClose }: { onClose: () => void }) {
  return (
    // 背景オーバーレイ: 背景タップで閉じる
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      {/* モーダル本体: クリックが背景へバブリングして閉じないよう stopPropagation */}
      <div className="relative rounded-xl bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}
```

---

## 4. スマホ横画面でのモーダルはみ出しとスクロール不能（`touch-action: none` の罠）

### 発生する問題

Webゲームの拡大縮小・ピンチズーム防止のため、`body` や `#root` に `touch-action: none;` を指定している環境では、Reactモーダル内のコンテンツエリアに `overflow-y: auto;` を設定しただけでは**スマートフォンの指ドラッグによるスクロールがブラウザに無効化されて動きません**。
さらに横画面スマホではビューポートの縦幅が 350px〜400px 程度と低いため、設定モーダルが上下に突き抜け、閉じるボタンが押せなくなります。

### 解決策

1. モーダル本体を `flex flex-col max-h-[90dvh]` にし、ヘッダーとフッターを `flex-shrink-0` で固定。
2. スクロール領域に `flex-1 overflow-y-auto` とともに、必ず **`touch-action: pan-y;`（Tailwind: `touch-pan-y`）** を明示して縦スクロールを許可する。

```tsx
<div className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-2xl ...">
  {/* 固定ヘッダー */}
  <div className="flex-shrink-0 ...">ヘッダー</div>

  {/* スクロール領域: touch-pan-y を付与してスマホでの縦スクロールを有効化 */}
  <div className="flex-1 touch-pan-y space-y-3 overflow-y-auto overscroll-contain py-3 pr-1">
    {/* 各種設定項目 */}
  </div>

  {/* 固定フッター */}
  <div className="flex-shrink-0 ...">完了ボタン</div>
</div>
```
