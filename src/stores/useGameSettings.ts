import { create } from "zustand";
import { persist } from "zustand/middleware";

export type JoystickType = "fixed" | "dynamic";

interface GameSettingsState {
  bgmVolume: number; // 0 - 100
  seVolume: number; // 0 - 100
  bgmMuted: boolean;
  seMuted: boolean;
  joystickType: JoystickType;
  isOpen: boolean;

  setBgmVolume: (volume: number) => void;
  setSeVolume: (volume: number) => void;
  toggleBgmMute: () => void;
  toggleSeMute: () => void;
  setJoystickType: (type: JoystickType) => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
}

export const useGameSettings = create<GameSettingsState>()(
  persist(
    (set) => ({
      bgmVolume: 80,
      seVolume: 80,
      bgmMuted: false,
      seMuted: false,
      joystickType: "dynamic",
      isOpen: false,

      setBgmVolume: (volume) => set({ bgmVolume: Math.max(0, Math.min(100, volume)) }),
      setSeVolume: (volume) => set({ seVolume: Math.max(0, Math.min(100, volume)) }),
      toggleBgmMute: () => set((state) => ({ bgmMuted: !state.bgmMuted })),
      toggleSeMute: () => set((state) => ({ seMuted: !state.seMuted })),
      setJoystickType: (type) => set({ joystickType: type }),
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
      }),
    },
  ),
);
