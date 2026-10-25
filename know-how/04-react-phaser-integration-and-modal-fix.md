# React と Phaser の連携＆UIモーダルの入力突き抜け対策

ゲーム描画・物理演算を担う Phaser と、UI・設定モーダルを担う React をハイブリッド連携させる際のアーキテクチャと、**モーダル表示時のタップ判定すり抜けバグの完全な防ぎ方**です。

---

## 1. 責務の分離（Phaser と React）

| 領域       | 担当                                             | 理由                                                                        |
| :--------- | :----------------------------------------------- | :-------------------------------------------------------------------------- |
| **Phaser** | ゲーム世界、キャラ移動、当たり判定、パーティクル | 60FPS描画ループ、WebGL高速描画、ゲームループ                                |
| **React**  | 設定画面、全画面切替、フォーム、ダイアログ       | DOM標準のスライダーやスイッチ、Tailwind CSSによる美しいUI、アクセシビリティ |

設定画面を Phaser の Canvas 内で図形（矩形やテキスト）を組み合わせて自作するよりも、React コンポーネントとして作成する方が開発速度・デザインの柔軟性・保守性が格段に高くなります。

```
[TitleScene / UIScene (Phaser)]
       │ EventBus.emit("open-settings")
       ▼
[App.tsx (React)]
       │ useGameSettings.getState().openSettings()
       ▼
[SettingsModal (React / Tailwind)]
  ・画面表示（全画面切替）
  ・BGM / SE 音量スライダー
```

---

## 2. 背後シーンがタップ判定を拾ってしまう問題（クリックすり抜けバグ）

React の設定モーダルを開いている状態でモーダル上をタップ・操作すると、**モーダルの背後にある Phaser Canvas 上のボタンや自機が反応してしまう**というバグが頻発します。

### 原因

1. **React の合成イベントとブラウザのネイティブイベントの違い**:
   React の `onClick={(e) => e.stopPropagation()}` は React の仮想DOMツリー内での伝播を止めるだけであり、ブラウザネイティブの `pointerdown` や `touchstart` はすでに Canvas や Window に到達して発火しています。
2. **Phaser の常時入力リッスン**:
   Phaser の InputManager は Canvas や Window に直接イベントリスナーを登録しているため、HTML 要素が上に重なっていてもタッチ座標を拾ってしまいます。

---

## 3. 多重防御による完全遮断（解決策）

この問題は、**① Phaser側の入力マネージャー制御** と **② DOMネイティブイベントのキャプチャ遮断** の両方を組み合わせることで確実に防ぎます。

### 防御策 1: モーダル開閉に合わせて Phaser の入力を一時停止

```tsx
// src/App.tsx
export default function App() {
  const { isOpen: isSettingsOpen } = useGameSettings();
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  useEffect(() => {
    const game = phaserRef.current?.game;
    if (!game) return;

    if (isSettingsOpen) {
      // 1. 設定モーダルが開いている間は Phaser の全入力を停止
      game.input.enabled = false;
      // 2. 押しっぱなし状態（pointerdownの残り）をリセット
      game.input.pointers?.forEach((pointer) => pointer.reset());
    } else {
      // 3. 閉じたら入力を再開
      game.input.enabled = true;
    }
  }, [isSettingsOpen]);

  return (
    <main>
      {isSettingsOpen && <SettingsModal />}
      <PhaserGame ref={phaserRef} />
    </main>
  );
}
```

### 防御策 2: モーダル最外層でネイティブイベントをキャプチャフェーズで遮断

モーダルの背景要素（オーバーレイ）に対して、Reactのハンドラだけでなく、**DOMのキャプチャフェーズ（`capture: true`）** でイベントを捕捉して `stopPropagation()` します。

```tsx
// src/components/SettingsModal.tsx
const overlayRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const el = overlayRef.current;
  if (!el) return;

  const stopNativePropagation = (e: Event) => {
    e.stopPropagation();
  };

  const targetEvents = [
    "pointerdown",
    "pointerup",
    "pointermove",
    "mousedown",
    "mouseup",
    "touchstart",
    "touchend",
    "touchmove",
    "click",
    "contextmenu",
  ];

  targetEvents.forEach((evt) => {
    // capture: true で、DOMツリー上部から下りてくる段階で即座に遮断
    el.addEventListener(evt, stopNativePropagation, { capture: true });
  });

  return () => {
    targetEvents.forEach((evt) => {
      el.removeEventListener(evt, stopNativePropagation, { capture: true });
    });
  };
}, []);

return (
  <div
    ref={overlayRef}
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80"
    onClick={handleClose}
  >
    <div onClick={(e) => e.stopPropagation()}>{/* モーダル本文 */}</div>
  </div>
);
```

この2つの対策により、スマホの実機タッチ・PCのマウスクリック・ドラッグ操作のすべてにおいて背後のシーンへの誤爆を完全に防止できます。
