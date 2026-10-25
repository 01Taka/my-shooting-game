# Phaser の文字（Text）がぼやける理由と更なる超高画質化ノウハウ

Phaser でテキスト（`this.add.text()`）を描画した際に生じる「にじみ・ぼやけ・ジャギー」を徹底的に排除し、Retinaディスプレイや全画面スマホでもクッキリ鮮明な文字を実現するための完全ガイドです。

---

## 1. なぜ Phaser の文字は粗が目立つのか？（原因分析）

### 原因 ①: `resolution` オプション単体の限界

Phaser の `resolution` プロパティは、テキスト描画用のオフスクリーン `<canvas>` の幅と高さを引き上げますが、**文字のフォントサイズそのもの（ラスタライザに入力されるベクターアウトライン）は元の指定サイズ（例: 14px）のまま**です。  
極小サイズのフォントをいくら高い解像度でサンプリングしても、カーブや直線の階調表現（グリフ情報）が不足しているため、拡大時に粗さやにじみが残ってしまいます。

### 原因 ②: `Scale.FIT` による画面の拡大（引き伸ばし）

ゲームの論理解像度（`800x450`）からスマートフォンの実機解像度（幅 2000px 超、または `window.devicePixelRatio = 2〜3` のRetina画面）へ拡大される際、Canvas全体が 2〜3倍以上に引き伸ばされます。  
そのため、わずかなフォントの輪郭の甘さが画面上で目立ってしまいます。

---

## 2. 【最善の解決策】スーパーサンプリング（Super-Sampling / SSAA）技法

Phaser コミュニティで最も実証されており、絶大な効果を持つ手法が **「巨大なフォントサイズで高密度に描画し、`setScale` で本来のサイズに縮小する」** スーパーサンプリング技法です。

```
[指定: 16px]
    │
    ▼ 3倍のサイズで高密度ベクターラスタライズ
[内部フォントサイズ: 48px] (細部まで極めて滑らかなアウトラインが生成される)
    │
    ▼ setScale(1 / 3 = 0.333) で縮小配置
[画面上の見た目: 16px] (WebGLのバイリニアフィルタにより超高精細・ベクター級の鮮明さ)
```

### 実装コード ([src/utils/text.ts](../src/utils/text.ts))

呼び出し元が `fontSize: "18px"` や `fontSize: 24` と指定しても、内部で自動的に拡大・縮小処理を行うため、既存のコードを変更することなく最高画質化できます。

```ts
import Phaser from "phaser";

export const getSupersampleRatio = (): number => {
  if (typeof window === "undefined") return 2;
  const dpr = window.devicePixelRatio || 1;
  // 最低2倍、最大3倍（過剰なメモリ消費を防ぎつつ最高画質を実現）
  return Math.min(Math.max(dpr, 2), 3);
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

  // 2. フチ線（strokeThickness）やパディングも比率に合わせて拡大
  const strokeThickness = style?.strokeThickness ? style.strokeThickness * ratio : undefined;
  const padX = ((style?.padding?.x as number | undefined) ?? 4) * ratio;
  const padY = ((style?.padding?.y as number | undefined) ?? 4) * ratio;

  // 3. 高密度フォントでテキスト生成
  const textObj = scene.add.text(x, y, text, {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    ...style,
    fontSize: highResFontSize,
    strokeThickness,
    padding: { x: padX, y: padY },
    resolution: 1.5, // 内部キャンバスの解像度も併用
  });

  // 4. 本来の表示サイズになるよう縮小して配置
  textObj.setScale(1 / ratio);

  return textObj;
}
```

---

## 3. レンダラー設定の最適化 ([src/PhaserGame.tsx](../src/PhaserGame.tsx))

テクスチャの補間と、ピクセルの小数配置によるブレを防ぐ設定を `GameConfig` に追加します。

```ts
render: {
  antialias: true,      // WebGLテクスチャのスムージング有効化
  antialiasGL: true,    // コンテキスト自体のアンチエイリアス有効化
  roundPixels: true,    // 座標を整数に丸めてサブピクセルにじみを防止
}
```

---

## 4. さらなる高画質化のための代替アプローチ（3つの選択肢）

スーパーサンプリング技法以外にも、要件やゲームジャンルに応じて以下の強力な選択肢があります。

### 選択肢 A: DOM Element / React オーバーレイの活用（究極のベクター画質）

- **仕組み**: 文字を Phaser の Canvas に描画するのではなく、HTML/CSS（または React）のレイヤーとして上に重ねる。
- **メリット**: ブラウザのネイティブフォントラスタライザ（OS組み込みの最高峰エンジン）が直接描画するため、**物理ピクセル等倍の100%完璧なベクター画質**になります。どれだけ画面が拡大されても一切ボケません。
- **適用先**: スコア、HP、ポーズメニュー、ダイアログなどの HUD や UI テキストに最適。

### 選択肢 B: ゲーム基準解像度の引き上げ（フルHD化: 1600x900）

- **仕組み**: `width: 800, height: 450` ではなく、基準サイズを `1600x900`（または `1920x1080`）で作成する。
- **メリット**: Canvas の描画バッファ自体のピクセル数が 4倍 になるため、文字だけでなくスプライトや図形、パーティクルなどゲーム画面全体の解像度が Retina ディスプレイに極限まで近づきます。

### 選択肢 C: MSDF (Multi-channel Signed Distance Field) / BitmapText

- **仕組み**: フォントの輪郭の「距離情報（SDF）」をテクスチャアトラスとして保持し、専用シェーダーで描画する。
- **メリット**: 3Dゲームでも使われる技術で、文字を何倍にズームイン・ズームアウトしても、ベクターのように境界線がシャープなまま一切劣化しません。
- **適用先**: ゲーム内でカメラが激しく拡大縮小する場合や、ダメージ数値ポップアップなど。
