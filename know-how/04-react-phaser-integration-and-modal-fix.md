# React と Phaser の連携＆UIモーダルの入力突き抜け対策

ゲーム描画・物理演算を担う Phaser と、UI・設定モーダルを担う React をハイブリッド連携させる際のアーキテクチャと、**モーダル表示時のタップ判定すり抜けバグの完全な防ぎ方・注意点**です。

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

## 3. 正しい完全遮断の実装（最も安全な解決策）

### 決定打: モーダル開閉に合わせて Phaser の入力を一時停止

Phaser 側で `game.input.enabled = false` を設定すれば、仮にブラウザのネイティブイベントが Canvas に届いても、Phaser の入力マネージャー自体が停止しているため、**ゲーム内のボタンや自機が反応することは 100% 確実に防げます**。

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

---

## 4. 【重要】モーダル実装時の落とし穴（子要素のクリック消失バグ）

> [!CAUTION]
> **やってはいけないアンチパターン: 最外層での `capture: true` による `stopPropagation`**  
> 「DOMイベントを根元で止めよう」として、モーダル最外層（背景オーバーレイ）で以下のようにネイティブの `capture: true` を使うと、**イベントが子要素に下りていかなくなり、モーダル内の「×」ボタンや「完了」ボタン、スライダーが一切クリック・操作できなくなります**。
>
> ```ts
> // ❌ やってはいけない！子要素のボタンクリックまで死んでしまう
> overlayElement.addEventListener("click", (e) => e.stopPropagation(), { capture: true });
> overlayElement.addEventListener("pointerdown", (e) => e.stopPropagation(), { capture: true });
> ```

### 正しいモーダル実装コード ([src/components/SettingsModal.tsx](../src/components/SettingsModal.tsx))

Phaser 側の入力は上記の `App.tsx`（`game.input.enabled = false`）で完全に止まっているため、モーダルコンポーネント側は通常の React パターン（背景クリックで閉じ、本体クリックでバブリング防止）で実装すれば安全かつ正常に動作します。

```tsx
export function SettingsModal({ onClose }: SettingsModalProps) {
  const settings = useGameSettings();

  const handleClose = () => {
    settings.closeSettings();
    if (onClose) onClose();
  };

  return (
    // 背景オーバーレイ: 背景タップでモーダルを閉じる
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80"
      onClick={handleClose}
    >
      {/* モーダル本体: クリックが背景へ伝播して勝手に閉じないよう stopPropagation */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-slate-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ×ボタン */}
        <button type="button" onClick={handleClose}>
          <X className="h-5 w-5" />
        </button>

        {/* スライダーや全画面ボタンなど */}

        {/* 完了ボタン */}
        <button type="button" onClick={handleClose}>
          完了
        </button>
      </div>
    </div>
  );
}
```
