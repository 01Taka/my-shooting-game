# タッチ（指）操作とマウス（クリック）操作の判定方法とUI出し分け

Webブラウザやゲーム開発において、ユーザーが**「画面を指でタップしている」**のか**「マウスでクリックしている」**のかを正確に判別・検出し、操作ガイドやバーチャルコントローラーなどのUIを適切に出し分けるための実装レシピです。

---

## 1. 判定が必要になる背景と課題

PC（マウス/キーボード）とスマホ/タブレット（タッチ）のクロスプラットフォーム対応を行う際、以下の課題が発生します：

1. **UI・操作ガイドの切り替え**:
   - PCでは「クリックしてスタート」、スマホでは「タップしてスタート」と文言を切り替えたい。
   - タッチ操作時のみバーチャルスティックやオンスクリーンボタンを表示し、マウス操作時は非表示またはマウスエイム操作にしたい。
2. **タッチ後の疑似クリック（Ghost Click）問題**:
   - モバイルブラウザでタップすると、互換性のために `touchstart` ➔ `touchend` の直後に疑似的な `mousedown` ➔ `mouseup` ➔ `click` が約300ms遅れて連続発火し、意図しない二重操作や突き抜けが発生する。
3. **2-in-1 ノートPCの存在**:
   - タッチパネル付きPCやiPad＋マウス環境のように「両方使える」環境があり、単に「スマホかどうか（UserAgent判定）」ではなく**「今どのデバイスで操作されたか」**をイベントごとに判定する必要がある。

---

## 2. Web標準: Pointer Events API (`event.pointerType`)

現代のモダンブラウザでは、マウス・タッチ・ペンを統合して扱える **Pointer Events API** を使用するのが最も確実かつ標準的な方法です。

### 基本的な書き方

```typescript
// pointerdown または pointerup イベントで判定
window.addEventListener("pointerdown", (event: PointerEvent) => {
  switch (event.pointerType) {
    case "touch":
      console.log("指（タッチ）でタップされました");
      break;
    case "mouse":
      console.log("マウスでクリックされました");
      break;
    case "pen":
      console.log("スタイラスペンで操作されました");
      break;
    default:
      console.log("その他の入力:", event.pointerType);
  }
});
```

### 主なメリット

- **イベントの重複発火がない**: `touchstart` と `click` の両方をリッスンした時のように二重に処理が走るリスクが低い。
- **統一されたイベントリスナー**: `pointerdown`, `pointermove`, `pointerup` だけで全デバイスを網羅できる。

---

## 3. Phaser 3/4 における判定実装

Phaserのシーン内でも、入力ポインター（`Phaser.Input.Pointer`）から `pointerType` を判別できます。

### Phaser ポインターでの判定

```typescript
// Scene の create() 内
this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
  // pointer.event はネイティブの PointerEvent / MouseEvent / TouchEvent
  const nativeEvent = pointer.event as PointerEvent;

  if (nativeEvent.pointerType === "touch") {
    // 指でタップされた場合
    this.handleTouchInput(pointer);
  } else if (nativeEvent.pointerType === "mouse") {
    // マウスでクリックされた場合
    this.handleMouseInput(pointer);
  }
});
```

> [!TIP]
> `pointer.wasTouch` プロパティも Phaser 内部で用意されていますが、ブラウザネイティブの `pointer.event.pointerType` を直接確認する方が確実です。

---

## 4. CSS Media Queries (`pointer` / `hover`) によるデバイス特性判定

「操作の瞬間」ではなく、「ユーザー環境がタッチ主体かマウス主体か」をレイアウト構築時に判定したい場合は、**Media Queries Level 4** を利用します。

### CSS によるスタイル分岐

```css
/* マウスなど高精度ポインタがあり、ホバーが使えるPC環境 */
@media (hover: hover) and (pointer: fine) {
  .game-button:hover {
    filter: brightness(1.2);
    cursor: pointer;
  }
  .virtual-pad {
    display: none; /* マウス環境ではバーチャルパッドを非表示 */
  }
}

/* タッチ操作などポインタ精度が粗く、ホバーがない環境（スマホ・タブレット） */
@media (hover: none) and (pointer: coarse) {
  .game-button {
    padding: 16px 24px; /* 指で押しやすいように大きくする */
  }
  .virtual-pad {
    display: block; /* タッチ環境では表示 */
  }
}
```

### JavaScript からの事前判定 (`matchMedia`)

```typescript
// 初回起動時のUI初期状態を決定する
export function getInitialInputMode(): "touch" | "mouse" {
  // 指タッチ（粗いポインター）環境かチェック
  const isTouchPrimary = window.matchMedia("(pointer: coarse)").matches;
  return isTouchPrimary ? "touch" : "mouse";
}
```

---

## 5. 実践パターン: 入力デバイスの動的自動切り替え (React / Zustand)

ユーザーがキーボード/マウスを操作したら「PCモード」、画面をタップしたら「スマホモード」へシームレスに切り替えるステート管理設計です。

```typescript
// store/inputModeStore.ts
import { create } from "zustand";

type InputMode = "mouse" | "touch";

interface InputModeState {
  mode: InputMode;
  setMode: (mode: InputMode) => void;
}

export const useInputModeStore = create<InputModeState>((set) => ({
  mode: window.matchMedia("(pointer: coarse)").matches ? "touch" : "mouse",
  setMode: (mode) => set({ mode }),
}));

// App初期化時（グローバルリスナー）
export function setupInputModeListener() {
  const setMode = useInputModeStore.getState().setMode;

  window.addEventListener(
    "pointerdown",
    (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        setMode("touch");
      } else if (e.pointerType === "mouse") {
        setMode("mouse");
      }
    },
    { passive: true },
  );
}
```

UI側では `const mode = useInputModeStore((s) => s.mode);` を購読することで、ガイドテキスト（`mode === 'touch' ? 'タップしてスタート' : 'クリックまたはSPACEでスタート'`）を自動で切り替えることができます。

---

## 6. ゲームエンジン（Unity）での判定例（参考）

ゲーム開発エンジン Unity で判定する場合は以下の通りです。

### 新 Input System の場合

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

public class InputDetector : MonoBehaviour
{
    void Update()
    {
        // 指（タッチスクリーン）でのタップ
        if (Touchscreen.current != null && Touchscreen.current.primaryTouch.press.wasPressedThisFrame)
        {
            Debug.Log("指でタップされました");
        }
        // マウスクリック
        else if (Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame)
        {
            Debug.Log("マウスでクリックされました");
        }
    }
}
```

### 従来の Input クラス（Legacy）の場合

```csharp
if (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Began)
{
    Debug.Log("指でタップされました");
}
else if (Input.GetMouseButtonDown(0))
{
    Debug.Log("マウスでクリックされました");
}
```

---

## 7. トラブルシューティングと注意点

### Q. `touchstart` と `click` を両方登録したら2回処理が走る

- **原因**: スマホブラウザはタッチ後に互換性目的で疑似的な `click` イベントを発行するため。
- **対策**: `touchstart` / `click` 個別ではなく、`pointerdown` に統一するか、`touchstart` 側で `event.preventDefault()` を呼んで疑似クリックの合成をキャンセルします。

### Q. `pointerType` が空文字 `""` になる場合がある

- **原因**: 古いブラウザや、スクリプトから `dispatchEvent(new Event('pointerdown'))` のように合成イベントを発行した際に `pointerType` が指定されていない場合に発生します。
- **対策**: `event.pointerType || 'mouse'` のようにフォールバック値を用意しておくと安全です。
