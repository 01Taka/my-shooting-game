import Phaser from "phaser";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import { EventBus } from "./EventBus";
import { MainScene } from "./scenes/MainScene";

export interface IRefPhaserGame {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}

interface IProps {
  currentActiveScene?: (scene_instance: Phaser.Scene) => void;
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(
  function PhaserGame({ currentActiveScene }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const game = useRef<Phaser.Game | null>(null);
    const scene = useRef<Phaser.Scene | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        get game() {
          return game.current;
        },
        get scene() {
          return scene.current;
        },
      }),
      []
    );

    useEffect(() => {
      if (!containerRef.current) return;

      // Reactの再レンダリングや二重実行を防ぐガード
      if (game.current) return;

      // Phaserゲームの基本設定
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 800,
        height: 600,
        backgroundColor: "#1e293b", // Tailwind slate-800
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        physics: {
          default: "arcade",
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
          },
        },
        scene: [MainScene],
      };

      game.current = new Phaser.Game(config);

      const onSceneReady = (sceneInstance: Phaser.Scene) => {
        scene.current = sceneInstance;
        if (currentActiveScene) {
          currentActiveScene(sceneInstance);
        }
      };

      EventBus.on("current-scene-ready", onSceneReady);

      // コンポーネントが破棄されたらゲームインスタンスも片付ける
      return () => {
        EventBus.off("current-scene-ready", onSceneReady);
        if (game.current) {
          game.current.destroy(true);
          game.current = null;
        }
      };
    }, [currentActiveScene]);

    return <div ref={containerRef} className="h-full w-full" />;
  }
);
