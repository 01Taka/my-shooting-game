# Phaser文字のぼやけ解消と「全テキスト消失バグ」の回避法

Phaser の `this.add.text()` で作成した文字が粗くぼやけてしまう問題の原因と、テキストが画面から完全に消えてしまう危険な落とし穴（NaN座標バグ）の解決策です。

---

## 1. なぜ文字がぼやけるのか？

1. **ラスタライズ解像度（DPI）の未指定**:
   Phaser の Text は、内部で不可視の `<canvas>` 上にフォントを描画し、WebGL テクスチャに変換しています。スタイルに何も指定しない場合、DPI = 1（基準解像度）で画像化されます。
2. **`Scale.FIT` による引き伸ばし**:
   ゲーム解像度（例: 800x450）から高精細スマホ（幅 2000px 超）に全画面拡大される際、1倍解像度で作られた文字画像が拡大され、ジャギーやにじみが発生します。
3. **OS標準の粗いデフォルトフォントへのフォールバック**:
   単に `fontFamily: "sans-serif"` とだけ書くと、Windows 等の環境ではアンチエイリアスの効きにくいビットマップ風の粗いフォントが選ばれることがあります。

---

## 2. 【重大な落とし穴】テキストが全滅する「strokeThickness: undefined」バグ

> [!CAUTION]
> **全テキストが消えてしまう原因**  
> スタイルオブジェクトを展開する際、`{ ...style, strokeThickness: undefined }` のように `undefined` なプロパティが含まれていると、Phaser 内部のデフォルト値フォールバック処理をすり抜けて `style.strokeThickness = undefined` が代入されます。
>
> すると、Phaser のテキスト描画座標の計算式：
>
> ```js
> linePositionX = style.strokeThickness / 2; // ➔ undefined / 2 = NaN
> linePositionY = (style.strokeThickness / 2 + ...) + ...; // ➔ NaN
> ```
>
> が **`NaN`** になり、Canvas の `fillText(line, NaN, NaN)` が一切描画されず、**すべてのテキストが完全に消滅**します。

---

## 3. 安全かつ超高画質を実現する汎用ヘルパー (`addCrispText`)

1. **`resolution: getDeviceResolution()`**: 端末の `devicePixelRatio`（最低2倍、最大3倍）でオフスクリーンキャンバスを高密度にラスタライズ。
2. **高品位フォントスタック**: Windows（Segoe UI / Meiryo / Yu Gothic UI）や Mac / iOS（San Francisco / Hiragino）で DirectWrite / CoreText の美しいアンチエイリアスが確実に効くフォントスタックを自動設定。
3. **`undefined` プロパティの排除**: `strokeThickness` 等の `undefined` 値を完全除去して NaN 座標バグを未然に防止。

```ts
// src/utils/text.ts
import Phaser from "phaser";

export const getDeviceResolution = (): number => {
  if (typeof window === "undefined") return 2;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(Math.max(dpr, 2), 3);
};

export const SYSTEM_FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, sans-serif';

export const MONO_FONT_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export function addCrispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  const isMono = style?.fontFamily?.includes("mono") || style?.fontFamily?.includes("Courier");

  const chosenFontFamily = isMono ? MONO_FONT_STACK : SYSTEM_FONT_STACK;

  // styleから未定義のstrokeThickness等を取り除き、NaN座標バグを防ぐ
  const cleanStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    ...style,
    fontFamily: chosenFontFamily,
  };
  delete cleanStyle.strokeThickness;

  const textObj = scene.add.text(x, y, text, {
    resolution: getDeviceResolution(),
    padding: { x: 4, y: 4 }, // 文字端の欠け防止
    ...cleanStyle,
    // 数値が明示されている場合のみセット
    ...(typeof style?.strokeThickness === "number" && style.strokeThickness > 0
      ? { strokeThickness: style.strokeThickness }
      : {}),
  });

  return textObj;
}
```

---

## 4. レンダラー設定の併用 (`PhaserGame.tsx`)

ピクセルの小数座標によるブレを防ぐため、`GameConfig` に以下を設定します。

```ts
render: {
  antialias: true,      // WebGLテクスチャのスムージング有効化
  antialiasGL: true,    // コンテキストのアンチエイリアス有効化
  roundPixels: true,    // 座標を整数に丸めてサブピクセルにじみを防止
}
```
