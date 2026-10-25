import { create } from "zustand";

export type InputMode = "pc" | "mobile";

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

export function setupInputModeListener() {
  if (typeof window === "undefined" || isListenerInitialized) return;
  isListenerInitialized = true;

  const setMode = useInputMode.getState().setMode;

  // ポインター押下時の判定（touch -> mobile, mouse -> pc）
  window.addEventListener(
    "pointerdown",
    (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        setMode("mobile");
      } else if (e.pointerType === "mouse") {
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
