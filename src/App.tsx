import { useEffect, useRef } from "react";

import { SettingsModal } from "./components/SettingsModal";
import { EventBus } from "./EventBus";
import { type IRefPhaserGame, PhaserGame } from "./PhaserGame";
import { useGameSettings } from "./stores/useGameSettings";

export default function App() {
  const { isOpen: isSettingsOpen, openSettings, closeSettings } = useGameSettings();

  // 子コンポーネント（PhaserGame）の game インスタンスや scene への参照
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  useEffect(() => {
    // Phaser側からの「設定を開く」イベントを購読
    const handleOpenSettings = () => {
      openSettings();
    };

    EventBus.on("open-settings", handleOpenSettings);

    return () => {
      EventBus.off("open-settings", handleOpenSettings);
    };
  }, [openSettings]);

  // 設定モーダルの開閉に合わせて Phaser の入力を制御
  useEffect(() => {
    const game = phaserRef.current?.game;
    if (!game) return;

    if (isSettingsOpen) {
      game.input.enabled = false;
      // 押しっぱなし状態が残らないようポインター状態をリセット
      game.input.pointers?.forEach((pointer) => {
        pointer.reset();
      });
    } else {
      game.input.enabled = true;
    }
  }, [isSettingsOpen]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-900 select-none">
      {/* 設定モーダル（Reactコンポーネント。全画面切り替えや音量設定を内包） */}
      {isSettingsOpen && <SettingsModal onClose={closeSettings} />}

      {/* 縦画面時に表示する横向き推奨メッセージ */}
      <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center bg-slate-950/95 p-6 text-center text-white backdrop-blur-sm portrait:flex">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-4 h-16 w-16 animate-bounce text-sky-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <p className="text-lg font-bold">画面を横向きにしてください</p>
        <p className="mt-2 text-sm text-slate-400">
          このゲームは横画面プレイ専用です。端末を横にしてお楽しみください。
        </p>
      </div>

      {/* Phaserゲーム画面 */}
      <PhaserGame ref={phaserRef} />
    </main>
  );
}
