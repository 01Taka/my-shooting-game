import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_BGM_VOLUME, DEFAULT_SE_VOLUME, MAX_VOLUME, MIN_VOLUME } from "../constants";

export type JoystickType = "fixed" | "dynamic";

interface GameSettingsState {
  bgmVolume: number; // 0 - 100
  seVolume: number; // 0 - 100
  bgmMuted: boolean;
  seMuted: boolean;
  joystickType: JoystickType;
  keyboardMouseMode: boolean; // キーボード&マウスモード (旧 followCursor)
  followCursor: boolean; // 互換性プロパティ
  isOpen: boolean;

  setBgmVolume: (volume: number) => void;
  setSeVolume: (volume: number) => void;
  toggleBgmMute: () => void;
  toggleSeMute: () => void;
  setJoystickType: (type: JoystickType) => void;
  setKeyboardMouseMode: (enabled: boolean) => void;
  toggleKeyboardMouseMode: () => void;
  // 下位互換メソッド
  setFollowCursor: (enabled: boolean) => void;
  toggleFollowCursor: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
}

export const useGameSettings = create<GameSettingsState>()(
  persist(
    (set) => ({
      bgmVolume: DEFAULT_BGM_VOLUME,
      seVolume: DEFAULT_SE_VOLUME,
      bgmMuted: false,
      seMuted: false,
      joystickType: "dynamic",
      keyboardMouseMode: true,
      followCursor: true,
      isOpen: false,

      setBgmVolume: (volume) =>
        set({ bgmVolume: Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volume)) }),
      setSeVolume: (volume) =>
        set({ seVolume: Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volume)) }),
      toggleBgmMute: () => set((state) => ({ bgmMuted: !state.bgmMuted })),
      toggleSeMute: () => set((state) => ({ seMuted: !state.seMuted })),
      setJoystickType: (type) => set({ joystickType: type }),
      setKeyboardMouseMode: (enabled) => set({ keyboardMouseMode: enabled, followCursor: enabled }),
      toggleKeyboardMouseMode: () =>
        set((state) => ({
          keyboardMouseMode: !state.keyboardMouseMode,
          followCursor: !state.keyboardMouseMode,
        })),
      setFollowCursor: (enabled) => set({ keyboardMouseMode: enabled, followCursor: enabled }),
      toggleFollowCursor: () =>
        set((state) => ({
          keyboardMouseMode: !state.keyboardMouseMode,
          followCursor: !state.keyboardMouseMode,
        })),
      openSettings: () => set({ isOpen: true }),
      closeSettings: () => set({ isOpen: false }),
      toggleSettings: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: "game-settings-storage",
      // 旧ストレージデータ（followCursorのみ保存されている場合）のマイグレーション
      merge: (persistedState: unknown, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<
          GameSettingsState & { followCursor?: boolean }
        >;
        const kmMode =
          persisted.keyboardMouseMode !== undefined
            ? persisted.keyboardMouseMode
            : persisted.followCursor !== undefined
              ? persisted.followCursor
              : currentState.keyboardMouseMode;

        return {
          ...currentState,
          ...persisted,
          keyboardMouseMode: kmMode,
          followCursor: kmMode,
        };
      },
      partialize: (state) => ({
        bgmVolume: state.bgmVolume,
        seVolume: state.seVolume,
        bgmMuted: state.bgmMuted,
        seMuted: state.seMuted,
        joystickType: state.joystickType,
        keyboardMouseMode: state.keyboardMouseMode,
        followCursor: state.keyboardMouseMode,
      }),
    },
  ),
);
