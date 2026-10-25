# Phaser文字のぼやけ解消とCanvas解像度のボトルネック

Phaser の `this.add.text()` で作成した文字が粗くぼやけてしまう問題の根本原因と、決定的な解決策、そしてテキストが画面から消滅してしまう危険な落とし穴の完全ガイドです。

---

## 1. なぜ `resolution: 10` にしても画質が全く変わらないのか？

### 実験結果

`style.resolution` を `2` にしても `10` にしても、目に見える文字の画質は 1 ピクセルも変わりません。

### 根本原因：ボトルネックは「Canvas全体の物理解像度」にある

画面に文字が表示されるまでのパイプラインを確認すると、原因が明らかになります：

```
① 文字テクスチャの生成
   resolution: 10 により、文字単体は「超高解像度な画像（例: 2000×400px）」として生成される
       │
       ▼
② ゲーム Canvas（800×450）への焼き付け ★ここで潰れる！
   ゲーム全体のキャンバスバッファが【800 × 450 ピクセル】しかないため、
   せっかくの超高解像度文字が「800×450 の粗いピクセル格子」に強制縮小されて焼き付けられる
       │
       ▼
③ スマホ画面への CSS 拡大表示
   800×450 に縮小されたキャンバス全体を、ブラウザがスマホの実機画面（幅2000px超）へ
   2.5倍〜3倍にバイリニア拡大して表示する
```

> **たとえるなら**  
> 「4Kカメラで撮影した超高画質な文字を、一度 480p（昔の画質）の動画に縮小して貼り付け、それを巨大な4Kテレビで全画面再生している状態」です。  
> 途中のキャンバス（800×450）という「狭いパイプ」でピクセルが間引かれてしまうため、元の文字テクスチャの解像度をいくら上げても、最終的な画面上では画質が変わりません。

---

## 2. 決定打：ゲーム Canvas 本体のベース解像度を引き上げる（1600×900化）

Canvas の物理ピクセル数そのものを 4倍 に引き上げることで、ボトルネックを根本から解消します。

### 設定変更 (`PhaserGame.tsx`)

```ts
// src/PhaserGame.tsx
const config: Phaser.Types.Core.GameConfig = {
  // 変更前: width: 800, height: 450,
  width: 1600, // 2倍のフルHD基準へ
  height: 900, // 16:9 アスペクト比を維持
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    antialiasGL: true,
    roundPixels: true,
  },
};
```

### 効果

- キャンバスの物理ピクセル数が **4倍（36万画素 ➔ 144万画素）** に激増。
- 近年のフルHDやRetinaスマートフォンの物理ピクセルとほぼ 1:1 になるため、**文字の輪郭の粗さ・にじみが一瞬で消え去り、極めてシャープな描画**になります。
- 文字だけでなく、自機・敵・弾・エフェクトなどゲーム画面全体のグラフィック品質が同時に引き上がります。

---

## 3. 【重大な落とし穴】テキストが全滅する「strokeThickness: undefined」バグ

> [!CAUTION]
> **全テキストが消えてしまう原因**  
> スタイルオブジェクトを展開する際、`{ ...style, strokeThickness: undefined }` のように `undefined` なプロパティが含まれていると、Phaser 内部のデフォルト値フォールバック処理をすり抜けて `style.strokeThickness = undefined` が代入されます。
>
> すると、Phaser のテキスト描画座標の計算式：
>
> ```js
> linePositionX = style.strokeThickness / 2; // ➔ undefined / 2 = NaN !
> linePositionY = (style.strokeThickness / 2 + ...) + ...; // ➔ NaN !
> ```
>
> が **`NaN`** になり、Canvas の `fillText(line, NaN, NaN)` が一切描画されず、**すべてのテキストが完全に消滅**します。

---

## 4. 安全かつ高画質を実現する汎用ヘルパー (`addCrispText`)

1. **`SYSTEM_FONT_STACK`**: Windows（Segoe UI / Meiryo / Yu Gothic UI）や Mac / iOS（San Francisco / Hiragino）で DirectWrite / CoreText の美しいアンチエイリアスが確実に効くフォントスタックを自動設定。
2. **`cleanStyle`**: `strokeThickness` 等の `undefined` 値を完全除去して NaN 座標バグを未然に防止。

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

## 5. 【究極の選択肢】UI テキストを HTML/React レイヤーで重ねる

スコアやHPバー、ポーズメニューなどを Phaser の Canvas の中ではなく、React（HTML/CSS）レイヤーとして描画する手法です。

- **効果**: ブラウザと OS のネイティブフォントエンジンが**端末の物理ピクセル等倍（100% 完璧なベクター画質）** で直接描画するため、解像度の限界がなくなり、どれだけ拡大しても完全にクッキリします。
