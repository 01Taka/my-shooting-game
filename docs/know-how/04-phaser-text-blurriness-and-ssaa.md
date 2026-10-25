# Phaser文字がぼやける原因とスーパーサンプリング(SSAA)技法

Phaser の `this.add.text()` で作成した文字が、Retinaディスプレイや全画面スマートフォンで粗くぼやけてしまう問題の原因と、決定的な解決策です。

---

## 1. なぜ文字がぼやけるのか？

1. **ラスタライズ解像度（DPI）の不足**:
   Phaser の Text は、内部で不可視の `<canvas>` 上にフォントを描画し、WebGL テクスチャに変換しています。スタイルに何も指定しない場合、DPI = 1（基準解像度）で画像化されます。
2. **`Scale.FIT` による引き伸ばし**:
   ゲーム解像度（例: 800x450）から高精細スマホ（幅 2000px 超）に全画面拡大される際、1倍解像度で作られた文字画像が拡大され、ジャギーやにじみが発生します。
3. **`resolution` 指定単体の限界**:
   Text に `resolution: 2` を指定しても、入力されるフォントサイズ自体が小さい（例: 14px）と、フォントのカーブや直線のベクター階調情報自体が足りず、拡大時の粗さが残ります。

---

## 2. 決定打：スーパーサンプリング（SSAA）技法

最も効果的なアプローチは、**「フォントを 2〜3倍の巨大サイズで高密度に描画し、`setScale` で本来のサイズに縮小配置する」** 手法です。

```
[指定: 16px]
    │
    ▼ 3倍サイズでベクターラスタライズ
[内部フォント: 48px] (細部まで極めて滑らかなアウトラインが生成される)
    │
    ▼ setScale(1 / 3 = 0.333) で縮小配置
[画面上の見た目: 16px] (WebGLのバイリニアフィルタにより超高精細・ベクター級の鮮明さ)
```

### 汎用ヘルパーコード (`addCrispText`)

```ts
import Phaser from "phaser";

export const getSupersampleRatio = (): number => {
  if (typeof window === "undefined") return 2;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(Math.max(dpr, 2), 3); // 2倍〜3倍
};

export function addCrispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  const ratio = getSupersampleRatio();

  // 1. 指定サイズを ratio 倍に拡大
  let originalSize = 16;
  if (typeof style?.fontSize === "number") {
    originalSize = style.fontSize;
  } else if (typeof style?.fontSize === "string") {
    originalSize = parseFloat(style.fontSize) || 16;
  }
  const highResFontSize = `${Math.round(originalSize * ratio)}px`;

  // 2. フチ線やパディングも ratio 倍に拡大
  const strokeThickness = style?.strokeThickness ? style.strokeThickness * ratio : undefined;
  const padX = ((style?.padding?.x as number | undefined) ?? 4) * ratio;
  const padY = ((style?.padding?.y as number | undefined) ?? 4) * ratio;

  // 3. 高密度フォントで生成
  const textObj = scene.add.text(x, y, text, {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    ...style,
    fontSize: highResFontSize,
    strokeThickness,
    padding: { x: padX, y: padY },
    resolution: 1.5,
  });

  // 4. 本来の表示サイズになるよう縮小
  textObj.setScale(1 / ratio);

  return textObj;
}
```

---

## 3. レンダラー設定の併用

ピクセルの小数座標によるブレを防ぐため、`GameConfig` に以下を設定します。

```ts
render: {
  antialias: true,      // WebGLテクスチャのスムージング有効化
  antialiasGL: true,    // コンテキストのアンチエイリアス有効化
  roundPixels: true,    // 座標を整数に丸めてサブピクセルにじみを防止
}
```
