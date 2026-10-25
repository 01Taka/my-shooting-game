import Phaser from "phaser";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import { EventBus } from "./EventBus";
import {
  ControllerScene,
  GameScene,
  PreloadScene,
  ResultScene,
  TitleScene,
  UIScene,
} from "./scenes";

export interface IRefPhaserGame {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}

interface IProps {
  currentActiveScene?: (scene_instance: Phaser.Scene) => void;
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(function PhaserGame(
  { currentActiveScene },
  ref,
) {
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
    [],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    // Reactの再レンダリングや二重実行を防ぐガード
    if (game.current) return;

    // Phaserゲームの基本設定（高解像度 1600x900 / 16:9 比率でRetina・スマホ全画面にクッキリ描画）
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 1600,
      height: 900,
      backgroundColor: "#0f172a", // Tailwind slate-900
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        antialiasGL: true,
        roundPixels: true,
      },
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: [PreloadScene, TitleScene, GameScene, UIScene, ControllerScene, ResultScene],
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
});
