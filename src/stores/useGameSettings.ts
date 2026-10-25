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
  followCursor: boolean;
  isOpen: boolean;

  setBgmVolume: (volume: number) => void;
  setSeVolume: (volume: number) => void;
  toggleBgmMute: () => void;
  toggleSeMute: () => void;
  setJoystickType: (type: JoystickType) => void;
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
      followCursor: true,
      isOpen: false,

      setBgmVolume: (volume) =>
        set({ bgmVolume: Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volume)) }),
      setSeVolume: (volume) =>
        set({ seVolume: Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volume)) }),
      toggleBgmMute: () => set((state) => ({ bgmMuted: !state.bgmMuted })),
      toggleSeMute: () => set((state) => ({ seMuted: !state.seMuted })),
      setJoystickType: (type) => set({ joystickType: type }),
      setFollowCursor: (enabled) => set({ followCursor: enabled }),
      toggleFollowCursor: () => set((state) => ({ followCursor: !state.followCursor })),
      openSettings: () => set({ isOpen: true }),
      closeSettings: () => set({ isOpen: false }),
      toggleSettings: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: "game-settings-storage",
      partialize: (state) => ({
        bgmVolume: state.bgmVolume,
        seVolume: state.seVolume,
        bgmMuted: state.bgmMuted,
        seMuted: state.seMuted,
        joystickType: state.joystickType,
        followCursor: state.followCursor,
      }),
    },
  ),
);
