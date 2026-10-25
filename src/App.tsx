import { useEffect, useRef, useState } from "react";

import { EventBus } from "./EventBus";
import { type IRefPhaserGame, PhaserGame } from "./PhaserGame";

export default function App() {
  const [status, setStatus] = useState("準備完了");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 子コンポーネント（PhaserGame）の game インスタンスや scene への参照
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  useEffect(() => {
    // Phaser側からのイベントを受け取る例
    const onStarted = () => {
      setStatus("プレイ中");
    };

    EventBus.on("game-started", onStarted);

    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      EventBus.off("game-started", onStarted);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const docEl = document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
        };

        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }

        // 横画面に固定（Android Chrome等で対応）
        if (screen.orientation && "lock" in screen.orientation) {
          await (screen.orientation as any).lock("landscape").catch(() => {});
        }
      } else {
        const doc = document as Document & {
          webkitExitFullscreen?: () => Promise<void>;
        };

        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  return (
    <main className="relative h-screen w-screen bg-slate-900 select-none">
      {/* UIオーバーレイ例 */}
      <header className="pointer-events-none absolute top-4 left-4 z-10 rounded bg-slate-800/80 px-3 py-1.5 font-mono text-sm text-white backdrop-blur">
        状態: {status}
      </header>

      {/* フルスクリーン切り替えボタン */}
      <button
        onClick={toggleFullscreen}
        type="button"
        className="absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded bg-slate-800/80 px-3 py-1.5 text-xs text-white backdrop-blur transition-colors hover:bg-slate-700 active:scale-95"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isFullscreen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 9L4 4m0 0h4m-4 0v4m7 7l5 5m0 0h-4m4 0v-4M9 15l-5 5m0 0h4m-4 0v-4m11-7l5-5m0 0h-4m4 0v4"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          )}
        </svg>
        {isFullscreen ? "全画面解除" : "全画面"}
      </button>

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
