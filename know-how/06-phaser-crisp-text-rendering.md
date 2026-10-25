# Phaser の文字（Text）がぼやける理由と高解像度化ノウハウ

Phaser で作成したテキスト（`this.add.text()`）が、特にスマートフォンやRetinaディスプレイでぼやけたり、にじんだりする問題の原因と完全な解決策です。

---

## 1. なぜ Phaser の文字はぼやけるのか？（原因分析）

### 原因 1: デフォルトのラスタライズ解像度（DPI）が 1倍固定

Phaser の `Text` オブジェクトは、内部で不可視の `<canvas>` を生成し、ブラウザの 2D Canvas API で文字を描画してテクスチャ化（ラスタライズ）しています。  
スタイル設定に `resolution` を指定しない場合、デフォルトで **`resolution: 1`（基準解像度）** で画像化されます。

### 原因 2: `Scale.FIT` による画面の拡大（引き伸ばし）

ゲームの論理解像度（例: `800x450`）からスマートフォンの実機解像度（幅 2000px 超、または `window.devicePixelRatio = 2〜3` のRetina画面）へ拡大される際、**1倍解像度で作られた文字画像がそのまま2倍〜3倍に引き伸ばされるため、輪郭がボケてジャギーが発生**します。

### 原因 3: サブピクセル描画によるにじみ

テキストの配置座標（`x, y`）が小数点を含む場合、ピクセル間の補間によって輪郭がさらにぼやけます。

---

## 2. 解決策 1: 高解像度テキスト生成ヘルパー `addCrispText`

端末の `window.devicePixelRatio` を検知し、**最低2倍〜最大4倍の高密度キャンバス** で文字をラスタライズするヘルパー関数を使用します。

```ts
// src/utils/text.ts
import Phaser from "phaser";

export const getDeviceResolution = (): number => {
  if (typeof window === "undefined") return 2;
  // 端末の DPR に応じて最低2倍〜最大4倍の高密度テクスチャを生成
  return Math.min(Math.max(window.devicePixelRatio || 1, 2), 4);
};

export const SYSTEM_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const MONO_FONT_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

export function addCrispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  const isMono = style?.fontFamily?.includes("mono");

  return scene.add.text(x, y, text, {
    fontFamily: isMono ? MONO_FONT_STACK : SYSTEM_FONT_STACK,
    resolution: getDeviceResolution(), // ← 高解像度ラスタライズを指定
    padding: { x: 4, y: 4 }, // ← ディセンダー等の文字欠け防止
    ...style,
  });
}
```

### 使用例

```ts
// シーン内での利用
import { addCrispText } from "../utils/text";

const title = addCrispText(this, width / 2, 100, "GAME TITLE", {
  fontSize: "32px",
  color: "#ffffff",
}).setOrigin(0.5);
```

---

## 3. 解決策 2: Phaser レンダラー設定の最適化

`PhaserGame.tsx` のゲーム設定（`GameConfig`）で、アンチエイリアスと整数座標配置（`roundPixels`）を有効化します。

```ts
// src/PhaserGame.tsx
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true, // WebGLテクスチャのスムージング有効化
    antialiasGL: true, // WebGLコンテキスト自体のアンチエイリアス有効化
    roundPixels: true, // 座標を整数に丸めてサブピクセルにじみを防止
  },
  // ...
};
```

---

## 4. 改善効果

- **文字の輪郭がシャープに**: 800x450 の座標系を保ったまま、スマホの高密度Retina画面でもドットの潰れやにじみが一切なくなります。
- **文字の欠けを防止**: `padding: { x: 4, y: 4 }` を自動付与することで、「g」や「j」の足先、イタリック体の端がテクスチャ端でクリップされる現象を防ぎます。
