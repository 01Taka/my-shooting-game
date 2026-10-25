import { create } from "zustand";

interface GameSettingsState {
  bgmVolume: number; // 0 - 100
  seVolume: number; // 0 - 100
  bgmMuted: boolean;
  seMuted: boolean;
  isOpen: boolean;

  setBgmVolume: (volume: number) => void;
  setSeVolume: (volume: number) => void;
  toggleBgmMute: () => void;
  toggleSeMute: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
}

export const useGameSettings = create<GameSettingsState>((set) => ({
  bgmVolume: 80,
  seVolume: 80,
  bgmMuted: false,
  seMuted: false,
  isOpen: false,

  setBgmVolume: (volume) => set({ bgmVolume: Math.max(0, Math.min(100, volume)) }),
  setSeVolume: (volume) => set({ seVolume: Math.max(0, Math.min(100, volume)) }),
  toggleBgmMute: () => set((state) => ({ bgmMuted: !state.bgmMuted })),
  toggleSeMute: () => set((state) => ({ seMuted: !state.seMuted })),
  openSettings: () => set({ isOpen: true }),
  closeSettings: () => set({ isOpen: false }),
  toggleSettings: () => set((state) => ({ isOpen: !state.isOpen })),
}));
