import Phaser from "phaser";

/**
 * 端末の物理ピクセル密度（devicePixelRatio）に応じたスーパーサンプリング倍率を算出
 * 最低2倍、最大3倍（過剰なメモリ消費を防ぎつつ最高画質を実現）
 */
export const getSupersampleRatio = (): number => {
  if (typeof window === "undefined") return 2;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(Math.max(dpr, 2), 3);
};

export const SYSTEM_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

export const MONO_FONT_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/**
 * 【スーパーサンプリング（SSAA）方式による超高画質テキスト作成ヘルパー】
 *
 * フォントを 2〜3倍の巨大サイズで高密度にラスタライズし、
 * `setScale(1 / ratio)` で本来の大きさに縮小配置することで、
 * RetinaディスプレイやScale.FIT拡大時でもベクターのようにクッキリした文字を実現します。
 */
export function addCrispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  const ratio = getSupersampleRatio();

  // 1. フォントサイズの算出（指定サイズを ratio 倍に拡大）
  let originalSize = 16;
  if (typeof style?.fontSize === "number") {
    originalSize = style.fontSize;
  } else if (typeof style?.fontSize === "string") {
    originalSize = parseFloat(style.fontSize) || 16;
  }
  const highResFontSize = `${Math.round(originalSize * ratio)}px`;

  // 2. フチ線（strokeThickness）がある場合も比率に応じて拡大
  const strokeThickness = style?.strokeThickness ? style.strokeThickness * ratio : undefined;

  // 3. パディング（文字欠け防止）も拡大
  const padX = ((style?.padding?.x as number | undefined) ?? 4) * ratio;
  const padY = ((style?.padding?.y as number | undefined) ?? 4) * ratio;

  const isMono = style?.fontFamily?.includes("mono");

  // 4. 高密度フォントでテキスト生成
  const textObj = scene.add.text(x, y, text, {
    fontFamily: isMono ? MONO_FONT_STACK : SYSTEM_FONT_STACK,
    ...style,
    fontSize: highResFontSize,
    strokeThickness,
    padding: { x: padX, y: padY },
    // 内部キャンバスの解像度も 1.5倍で併用
    resolution: 1.5,
  });

  // 5. 本来の表示サイズになるよう縮小して配置
  textObj.setScale(1 / ratio);

  return textObj;
}
