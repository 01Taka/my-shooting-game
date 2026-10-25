import Phaser from "phaser";

/**
 * デバイスピクセル比（DPR）に応じた高精細解像度（最低2倍、最大3倍）を取得
 */
export const getDeviceResolution = (): number => {
  if (typeof window === "undefined") return 2;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(Math.max(dpr, 2), 3);
};

// Windows・Mac・iOS・Androidすべてで最高品質のアンチエイリアスが効くフォントスタック
export const SYSTEM_FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, sans-serif';

export const MONO_FONT_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/**
 * 高解像度・文字欠け防止・美麗フォントスタックを安全に適用するテキスト作成ヘルパー
 */
export function addCrispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  const isMono = style?.fontFamily?.includes("mono") || style?.fontFamily?.includes("Courier");

  const chosenFontFamily = isMono ? MONO_FONT_STACK : SYSTEM_FONT_STACK;

  // styleからstrokeThicknessやfontFamilyを取り除き、確実に安全な値をセット（NaN防止）
  const cleanStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    ...style,
    fontFamily: chosenFontFamily,
  };
  delete cleanStyle.strokeThickness;

  const textObj = scene.add.text(x, y, text, {
    resolution: getDeviceResolution(),
    padding: { x: 4, y: 4 },
    ...cleanStyle,
    // strokeThicknessが明示的に数値で指定されている場合のみ渡す
    ...(typeof style?.strokeThickness === "number" && style.strokeThickness > 0
      ? { strokeThickness: style.strokeThickness }
      : {}),
  });

  return textObj;
}
