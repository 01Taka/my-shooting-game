import Phaser from "phaser";

import type { CharacterDirection } from "../../../../utils/directionalSprite";

/**
 * アニメーションフレーム解決時に渡されるコンテキスト
 */
export interface ActionAnimContext {
  /** 現在のフェーズ/ステップ開始からの経過時間（ms、owner.timeScale でスケール済み） */
  elapsedMs: number;
  /** 現在のフェーズの予定全体長（ms）。ループや無制限の場合は undefined */
  durationMs?: number;
  /** 現在のキャラクターの向き（エフェクトスプライト等の場合は未指定可） */
  direction?: CharacterDirection;
}

/**
 * ステートレスなアニメーション解決関数
 * 引数のコンテキストから、対応するベースフレームテクスチャキー（またはエフェクトテクスチャキー）を返す
 */
export type ActionAnimResolver = (ctx: ActionAnimContext) => string;

/**
 * 経過時間に関わらず常に同一の1枚絵テクスチャキーを返すリゾルバ
 */
export function staticFrame(baseKey: string): ActionAnimResolver {
  return () => baseKey;
}

/**
 * 一定間隔（frameIntervalMs）ごとに frames を順繰りにループ再生するリゾルバ
 */
export function loopFrames(frames: readonly string[], frameIntervalMs: number): ActionAnimResolver {
  if (frames.length === 0) {
    throw new Error("loopFrames: frames must not be empty");
  }
  const interval = Math.max(1, frameIntervalMs);
  return (ctx) => {
    const totalFrames = frames.length;
    const index = Math.floor(ctx.elapsedMs / interval) % totalFrames;
    return frames[index];
  };
}

/**
 * 全体長（durationMs）の進行度（0.0 〜 1.0）に応じて frames を先頭から末尾まで均等に再生するリゾルバ
 */
export function sequenceFrames(
  frames: readonly string[],
  fallbackDurationMs = 300,
): ActionAnimResolver {
  if (frames.length === 0) {
    throw new Error("sequenceFrames: frames must not be empty");
  }
  return (ctx) => {
    const total = ctx.durationMs ?? fallbackDurationMs;
    if (total <= 0) return frames[frames.length - 1];

    const progress = Phaser.Math.Clamp(ctx.elapsedMs / total, 0, 0.999);
    const index = Math.floor(progress * frames.length);
    return frames[index];
  };
}

/**
 * アクションが生成・管理する視覚エフェクトスプライト用のヘルパー
 */
export class ActionEffectSprite {
  public image: Phaser.GameObjects.Image;
  private resolver?: ActionAnimResolver;
  private currentTextureKey?: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    initialTexture: string,
    resolver?: ActionAnimResolver,
    origin?: { x: number; y: number },
  ) {
    this.image = scene.add.image(x, y, initialTexture);
    if (origin) {
      this.image.setOrigin(origin.x, origin.y);
    }
    this.resolver = resolver;
    this.currentTextureKey = initialTexture;
  }

  /**
   * 座標・角度・アニメーションフレームを更新
   */
  public update(
    x: number,
    y: number,
    angleRad: number,
    elapsedMs: number,
    durationMs?: number,
  ): void {
    if (!this.image.active) return;

    this.image.setPosition(x, y);
    this.image.setRotation(angleRad);

    if (this.resolver) {
      const nextKey = this.resolver({ elapsedMs, durationMs });
      if (nextKey && nextKey !== this.currentTextureKey) {
        if (this.image.scene?.textures?.exists(nextKey)) {
          this.image.setTexture(nextKey);
          this.currentTextureKey = nextKey;
        }
      }
    }
  }

  /**
   * スプライトの破棄
   */
  public destroy(): void {
    if (this.image && this.image.active) {
      this.image.destroy();
    }
  }
}
