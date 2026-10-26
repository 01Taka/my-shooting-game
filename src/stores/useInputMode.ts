import { create } from "zustand";

import { useGameSettings } from "./useGameSettings";

export type InputMode = "pc" | "mobile";

/**
 * 操作モードの3つの状態
 * - mobile: スマホモード（タッチデバイス・現在のスマホモードそのまま）
 * - keyboardMouse: キーボード&マウスモード（PC向け・UI非表示・常時カーソル向き・クリック発射・ホイール武器切替・Shiftブリンク・ロックオン無効）
 * - pcMobile: PCスマホモード（PCでスマホUI表示・WASD移動・右側スマホUIクリック操作・Shiftブリンクやホイールは無効）
 */
export type ControlMode = "mobile" | "keyboardMouse" | "pcMobile";

/**
 * 現在の操作モードを取得
 */
export function getControlMode(): ControlMode {
  const inputMode = useInputMode.getState().mode;
  if (inputMode === "mobile") {
    return "mobile";
  }
  return useGameSettings.getState().keyboardMouseMode ? "keyboardMouse" : "pcMobile";
}

interface InputModeState {
  mode: InputMode;
  setMode: (mode: InputMode) => void;
}

export const useInputMode = create<InputModeState>((set, get) => ({
  // タッチ主体の端末（スマホ・タブレット）かどうかを初期判定
  mode:
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
      ? "mobile"
      : "pc",

  setMode: (newMode: InputMode) => {
    if (get().mode !== newMode) {
      set({ mode: newMode });
    }
  },
}));

// グローバルな入力検知リスナー（指タップ / マウスクリック / WASDキー）
let isListenerInitialized = false;
let lastTouchTimestamp = 0;

export function setupInputModeListener() {
  if (typeof window === "undefined" || isListenerInitialized) return;
  isListenerInitialized = true;

  const setMode = useInputMode.getState().setMode;

  // タッチ開始時（touchstart）も確実に検知
  window.addEventListener(
    "touchstart",
    () => {
      lastTouchTimestamp = Date.now();
      setMode("mobile");
    },
    { passive: true },
  );

  // ポインター押下時の判定（touch -> mobile, mouse -> pc）
  window.addEventListener(
    "pointerdown",
    (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        lastTouchTimestamp = Date.now();
        setMode("mobile");
      } else if (e.pointerType === "mouse") {
        // タッチ直後の疑似マウスクリック（Ghost click）は無視
        if (Date.now() - lastTouchTimestamp < 600) {
          return;
        }
        setMode("pc");
      }
    },
    { passive: true },
  );

  // キーボード押下時の判定（WASD / 矢印キー -> pc）
  window.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        key === "w" ||
        key === "a" ||
        key === "s" ||
        key === "d" ||
        key === "arrowup" ||
        key === "arrowdown" ||
        key === "arrowleft" ||
        key === "arrowright"
      ) {
        setMode("pc");
      }
    },
    { passive: true },
  );
}
