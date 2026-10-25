import { useEffect, useRef, useState } from "react";

import { EventBus } from "./EventBus";
import { type IRefPhaserGame, PhaserGame } from "./PhaserGame";

export default function App() {
  const [status, setStatus] = useState("準備完了");

  // 子コンポーネント（PhaserGame）の game インスタンスや scene への参照
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  useEffect(() => {
    // Phaser側からのイベントを受け取る例
    const onStarted = () => {
      setStatus("プレイ中");
    };

    EventBus.on("game-started", onStarted);

    return () => {
      EventBus.off("game-started", onStarted);
    };
  }, []);

  return (
    <main className="relative h-screen w-screen bg-slate-900">
      {/* UIオーバーレイ例（スコアやタイトルなどのReactコンポーネントを置く場所） */}
      <header className="absolute top-4 left-4 z-10 rounded bg-slate-800/80 px-3 py-1.5 font-mono text-sm text-white backdrop-blur">
        状態: {status}
      </header>
      {/* Phaserゲーム画面 */}
      <PhaserGame ref={phaserRef} />
    </main>
  );
}
