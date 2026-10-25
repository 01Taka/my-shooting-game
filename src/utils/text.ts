import Phaser from "phaser";

/**
 * スマートフォン（Retinaディスプレイ等）や拡大表示時でも文字がぼやけないよう、
 * 最低でも2倍、端末のdevicePixelRatioに応じた高解像度DPI値を算出
 */
export const getDeviceResolution = (): number => {
  if (typeof window === "undefined") return 2;
  return Math.min(Math.max(window.devicePixelRatio || 1, 2), 4);
};

export const SYSTEM_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

export const MONO_FONT_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/**
 * 高解像度・にじみ防止設定を適用したテキスト作成ヘルパー
 */
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
    resolution: getDeviceResolution(),
    padding: { x: 4, y: 4 },
    ...style,
  });
}
