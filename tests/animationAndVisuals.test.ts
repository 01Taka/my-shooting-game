import { describe, expect, it, vi } from "vitest";

import { dashClawAttackAction } from "../src/game/ai/actions/dashClawAttackAction";
import { loopFrames, sequenceFrames, staticFrame } from "../src/game/ai/actions/utils/animation";
import { Enemy } from "../src/game/ai/Enemy";
import { EnemyBase } from "../src/game/ai/EnemyBase";
import type { ResistanceConfig, StateTable } from "../src/game/ai/types";
import { DamageZone } from "../src/game/damageZone/DamageZone";
import { CircleShape } from "../src/game/damageZone/shapes/CircleShape";

function createMockScene(): any {
  return {
    sys: {
      queueDepthSort: vi.fn(),
      settings: { key: "test" },
      updateList: {
        remove: vi.fn(),
      },
      anims: {
        on: vi.fn(),
        off: vi.fn(),
        removeListener: vi.fn(),
      },
      textures: {
        get: vi.fn(() => ({
          get: vi.fn(() => ({})),
          frames: {},
        })),
      },
    },
    add: {
      existing: vi.fn(),
      image: vi.fn(() => ({
        setPosition: vi.fn(),
        setRotation: vi.fn(),
        setTexture: vi.fn(),
        destroy: vi.fn(),
        active: true,
      })),
    },
    physics: {
      add: {
        existing: vi.fn(),
      },
      velocityFromRotation: vi.fn((_angle, speed, vec) => {
        vec.setTo(speed, 0);
      }),
    },
    anims: {
      timeScale: 1,
    },
  };
}

describe("Animation and Visual System", () => {
  describe("animation resolvers (animation.ts)", () => {
    it("staticFrame: 常に同一のフレームキーを返すこと", () => {
      const resolver = staticFrame("idle_frame");
      expect(resolver({ elapsedMs: 0 })).toBe("idle_frame");
      expect(resolver({ elapsedMs: 500, durationMs: 1000 })).toBe("idle_frame");
    });

    it("loopFrames: frameIntervalMs ごとに frames をループ再生すること", () => {
      const resolver = loopFrames(["frame_0", "frame_1", "frame_2"], 100);

      expect(resolver({ elapsedMs: 0 })).toBe("frame_0");
      expect(resolver({ elapsedMs: 50 })).toBe("frame_0");
      expect(resolver({ elapsedMs: 100 })).toBe("frame_1");
      expect(resolver({ elapsedMs: 199 })).toBe("frame_1");
      expect(resolver({ elapsedMs: 200 })).toBe("frame_2");
      expect(resolver({ elapsedMs: 300 })).toBe("frame_0"); // ループして最初に戻る
    });

    it("sequenceFrames: durationMs の進行度に応じて順次再生すること", () => {
      const resolver = sequenceFrames(["step_0", "step_1", "step_2"], 300);

      expect(resolver({ elapsedMs: 0, durationMs: 300 })).toBe("step_0");
      expect(resolver({ elapsedMs: 90, durationMs: 300 })).toBe("step_0");
      expect(resolver({ elapsedMs: 100, durationMs: 300 })).toBe("step_1");
      expect(resolver({ elapsedMs: 200, durationMs: 300 })).toBe("step_2");
      expect(resolver({ elapsedMs: 299, durationMs: 300 })).toBe("step_2");
    });
  });

  describe("EnemyBase Visuals & Directional Texture Resolution", () => {
    class DummyEnemy extends EnemyBase {
      public stunTriggeredCount = 0;
      constructor(scene: any, resistances?: ResistanceConfig) {
        super(scene, 100, 100, "enemy", resistances);
        this.body = {
          setVelocity: vi.fn(),
          reset: vi.fn(),
          destroy: vi.fn(),
        } as any;
      }
      protected onStunTriggered(): void {
        this.stunTriggeredCount++;
      }
      public callTickBase(delta: number): number {
        return this.tickBase(delta);
      }
    }

    const createDummyEnemy = () => {
      const scene = createMockScene();
      const enemy = new DummyEnemy(scene, { stunResistance: 0 });
      return { scene, enemy };
    };

    it("faceAngle の指定がある場合はプレイヤー方向ではなく指定角度に向くこと", () => {
      const { enemy } = createDummyEnemy();
      enemy.directionalMode = "horizontal2";

      // faceAngle 未指定時はプレイヤー方向 (angle = 0 -> right)
      enemy.updateVisuals(0, false);
      expect(enemy.direction).toBe("right");

      // faceAngle で左向き角度 (Math.PI) を指定
      enemy.faceAngle(Math.PI);
      enemy.updateVisuals(0, false);
      expect(enemy.direction).toBe("left");

      // clearFacingAngle でプレイヤー方向に戻る
      enemy.clearFacingAngle();
      enemy.updateVisuals(0, false);
      expect(enemy.direction).toBe("right");
    });

    it("Tint 優先度: 被弾フラッシュ > 凍結 > スタン > スロウ > 通常", () => {
      const { enemy } = createDummyEnemy();

      let currentTint: number | null = null;
      enemy.setTint = (t: number) => {
        currentTint = t;
        return enemy;
      };
      enemy.clearTint = () => {
        currentTint = null;
        return enemy;
      };

      // 1. 通常状態
      enemy.updateVisuals(0, false);
      expect(currentTint).toBeNull();

      // 2. スロウ蓄積時 (iceMeter > 0) -> 0x99ddff
      enemy.iceMeter = 20;
      enemy.updateVisuals(0, false);
      expect(currentTint).toBe(0x99ddff);

      // 3. スタン時 (isStunned = true) -> スロウより優先して 0xffff66
      enemy.updateVisuals(0, true);
      expect(currentTint).toBe(0xffff66);

      // 4. 凍結時 (iceMeter = 120 >= 100, timeScale = 0) -> スタンより優先して 0x66ccff
      enemy.iceMeter = 120;
      enemy.timeScale = 0;
      enemy.updateVisuals(0, true);
      expect(currentTint).toBe(0x66ccff);

      // 5. 被弾フラッシュ (hitFlashTimerMs > 0) -> 凍結よりも最優先で 0xff5555
      enemy.triggerHitFlash(70);
      enemy.updateVisuals(0, true);
      expect(currentTint).toBe(0xff5555);

      // 6. 凍結中であっても実時間 delta で被弾フラッシュタイマーが消化されること
      enemy.callTickBase(70);
      enemy.updateVisuals(0, true);
      expect(currentTint).toBe(0x66ccff); // フラッシュ消化後は凍結色に戻る
    });
  });

  describe("DamageZone Owner-bound timeScale and Interruption", () => {
    it("owner の timeScale に応じて DamageZone の経過時間・寿命がスケールすること", () => {
      const owner = { active: true, timeScale: 0.5 };
      const zone = new DamageZone({
        shape: new CircleShape({ radius: 50 }),
        faction: "enemy",
        durationMs: 200,
        effect: { damage: 10 },
        owner,
      });

      // 100ms 経過 (timeScale 0.5 のため実効経過は 50ms)
      const alive1 = zone.update(100);
      expect(alive1).toBe(true);
      expect(zone.elapsedMs).toBe(50);

      // owner が凍結 (timeScale 0)
      owner.timeScale = 0;
      const alive2 = zone.update(100);
      expect(alive2).toBe(true);
      expect(zone.elapsedMs).toBe(50); // 経過時間は進まない
    });

    it("owner が非アクティブ（死亡等）になったとき DamageZone は即座に消滅すること", () => {
      const owner = { active: true, timeScale: 1 };
      const zone = new DamageZone({
        shape: new CircleShape({ radius: 50 }),
        faction: "enemy",
        durationMs: 500,
        effect: { damage: 10 },
        owner,
      });

      owner.active = false; // オーナー死亡
      const alive = zone.update(16);
      expect(alive).toBe(false);
      expect(zone.isActive).toBe(false);
    });

    it("dashClawAttackAction: 突進攻撃中にスタンまたは死亡で onReset が呼ばれ、DamageZone が破棄されること", () => {
      const scene = createMockScene();

      let createdZone: DamageZone | undefined;
      const mockDamageZoneManager = {
        createZone: vi.fn((config) => {
          createdZone = new DamageZone(config);
          return createdZone;
        }),
      };

      const table: StateTable<"ATTACK" | "IDLE"> = {
        ATTACK: {
          run: dashClawAttackAction({
            dashSpeed: 200,
            dashDurationMs: 100,
            recoveryDurationMs: 200,
            cooldownMs: 1000,
          }),
          onDone: "IDLE",
        },
        IDLE: {
          run: {
            init: () => ({}),
            update: () => undefined,
          },
          onDone: "IDLE",
        },
      };

      const enemy = new Enemy(scene, 0, 0, "ATTACK", table);
      enemy.body = {
        setVelocity: vi.fn(),
        reset: vi.fn(),
        destroy: vi.fn(),
      } as any;

      // 1. 初回更新 & 突進 (100ms経過で攻撃判定・DamageZone生成)
      enemy.updateEnemy(
        {
          player: { x: 50, y: 0 },
          damageZoneManager: mockDamageZoneManager as any,
          scene,
        },
        100,
      );

      expect(createdZone).toBeDefined();
      expect(createdZone!.isActive).toBe(true);

      // 2. 攻撃硬直中にスタン付与または destroy 実行
      enemy.destroy();

      // onReset が実行され、DamageZone が即座に destroy されていること
      expect(createdZone!.isActive).toBe(false);
    });
  });
});
