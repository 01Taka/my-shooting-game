import { describe, expect, it, vi } from "vitest";

import { DamageZoneManager } from "../src/game/damageZone/DamageZoneManager";
import { createLandmineConfig } from "../src/game/trap/prefabs/landmine";
import { createPoisonSwampConfig } from "../src/game/trap/prefabs/poisonSwamp";
import { TrapManager } from "../src/game/trap/TrapManager";

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
        exists: vi.fn(() => true),
      },
    },
    make: {
      graphics: vi.fn(() => ({
        fillStyle: vi.fn(),
        fillEllipse: vi.fn(),
        fillCircle: vi.fn(),
        lineStyle: vi.fn(),
        strokeCircle: vi.fn(),
        generateTexture: vi.fn(),
        destroy: vi.fn(),
      })),
    },
    textures: {
      exists: vi.fn(() => true),
      addImage: vi.fn(),
    },
    add: {
      existing: vi.fn(),
      image: vi.fn(() => ({
        setPosition: vi.fn(),
        setRotation: vi.fn(),
        setTexture: vi.fn(),
        setDepth: vi.fn(),
        destroy: vi.fn(),
        active: true,
      })),
    },
  };
}

describe("Trap System (設置型トラップシステム)", () => {
  describe("Poison Swamp (継続エリア型トラップ)", () => {
    it("生成後即座にACTIVEになり、DamageZoneを通じて継続ダメージを与えること", () => {
      const scene = createMockScene();
      const zoneManager = new DamageZoneManager(scene, false);
      const trapManager = new TrapManager(scene, zoneManager);

      const trap = trapManager.createTrap(
        createPoisonSwampConfig(100, 100, {
          size: 60,
          durationMs: 2000,
          damageIntervalMs: 200,
          damage: 5,
          slowAmount: 30,
        }),
      );

      expect(trap.state).toBe("ACTIVE");
      expect(trap.isActive).toBe(true);

      let playerDamaged = 0;
      let playerSlow = 0;
      const player = {
        x: 100,
        y: 100,
        width: 32,
        height: 32,
      };

      const targetContext = {
        player,
        onDamagePlayer: (dmg: number, zone: any) => {
          playerDamaged += dmg;
          if (zone.effect.slowAmount) {
            playerSlow += zone.effect.slowAmount;
          }
        },
      };

      // 1. 初回更新（ヒット）
      trapManager.update(16, targetContext);
      zoneManager.update(16, targetContext);
      expect(playerDamaged).toBe(5);
      expect(playerSlow).toBe(30);

      // 2. 100ms経過（間隔200ms未満のため再ヒットなし）
      trapManager.update(100, targetContext);
      zoneManager.update(100, targetContext);
      expect(playerDamaged).toBe(5);

      // 3. さらに150ms経過（計250ms >= 200ms -> 2回目のtickダメージ）
      trapManager.update(150, targetContext);
      zoneManager.update(150, targetContext);
      expect(playerDamaged).toBe(10);
      expect(playerSlow).toBe(60);

      // 4. 持続時間満了（2000ms超過）で消滅
      trapManager.update(2000, targetContext);
      expect(trap.isActive).toBe(false);
      expect(trapManager.getTraps().length).toBe(0);
    });
  });

  describe("Landmine (感知起爆型トラップ)", () => {
    it("設置準備時間(ARMING)中は踏んでも起爆しないこと", () => {
      const scene = createMockScene();
      const zoneManager = new DamageZoneManager(scene, false);
      const trapManager = new TrapManager(scene, zoneManager);

      const mine = trapManager.createTrap(
        createLandmineConfig(200, 200, {
          armingDurationMs: 500,
          triggerDelayMs: 200,
        }),
      );

      expect(mine.state).toBe("ARMING");

      const targetContext = {
        player: { x: 200, y: 200, width: 20, height: 20 },
      };

      // 準備時間中にプレイヤーが接触してもARMINGのまま
      trapManager.update(200, targetContext);
      expect(mine.state).toBe("ARMING");

      // 準備時間を過ぎるとACTIVEになる
      trapManager.update(350, targetContext); // 計550ms
      expect(mine.state).toBe("ACTIVE");
    });

    it("ACTIVE中にプレイヤーが範囲に入るとTRIGGEREDを経てEXPLODINGで爆発DamageZoneを発生させること", () => {
      const scene = createMockScene();
      const zoneManager = new DamageZoneManager(scene, false);
      const trapManager = new TrapManager(scene, zoneManager);

      const mine = trapManager.createTrap(
        createLandmineConfig(200, 200, {
          size: 30,
          armingDurationMs: 0, // 即座にACTIVE
          triggerDelayMs: 150,
          damage: 50,
          knockback: 100,
        }),
      );

      expect(mine.state).toBe("ACTIVE");

      let explosionDamaged = 0;
      let explosionKnockback = 0;
      const targetContext = {
        player: { x: 200, y: 200, width: 20, height: 20 },
        onDamagePlayer: (dmg: number, zone: any) => {
          explosionDamaged += dmg;
          explosionKnockback = zone.effect.knockback ?? 0;
        },
      };

      // 1. 範囲内にいるためTRIGGEREDへ遷移（起爆予兆）
      trapManager.update(16, targetContext);
      expect(mine.state).toBe("TRIGGERED");

      // 2. 起爆遅延（100ms < 150ms）の間はまだ爆発しない
      trapManager.update(100, targetContext);
      zoneManager.update(100, targetContext);
      expect(mine.state).toBe("TRIGGERED");
      expect(explosionDamaged).toBe(0);

      // 3. さらに60ms経過（計160ms >= 150ms）で爆発（EXPLODING）
      trapManager.update(60, targetContext);
      expect(mine.state).toBe("EXPLODING");

      // DamageZoneManagerを更新すると爆発ダメージが届く
      zoneManager.update(16, targetContext);
      expect(explosionDamaged).toBe(50);
      expect(explosionKnockback).toBe(100);

      // 4. 爆発演出時間（250ms）経過後に消滅
      trapManager.update(300, targetContext);
      expect(mine.isActive).toBe(false);
      expect(trapManager.getTraps().length).toBe(0);
    });
  });

  describe("Caster Independence (発動者からの独立性)", () => {
    it("トラップは設置者（Caster）が死亡・消滅しても独立して動作し続けること", () => {
      const scene = createMockScene();
      const zoneManager = new DamageZoneManager(scene, false);
      const trapManager = new TrapManager(scene, zoneManager);

      // 敵が死亡するシチュエーションを模擬
      const casterEnemy = { active: true, timeScale: 1 };

      const trap = trapManager.createTrap(
        createPoisonSwampConfig(50, 50, {
          durationMs: 1000,
        }),
      );

      // 発動者死亡
      casterEnemy.active = false;
      casterEnemy.timeScale = 0;

      // トラップの更新は通常通り進行する
      trapManager.update(500, { player: { x: 0, y: 0 } });
      expect(trap.isActive).toBe(true);
      expect(trap.totalElapsedMs).toBe(500);

      // 1000ms経過で寿命により破棄
      trapManager.update(600, { player: { x: 0, y: 0 } });
      expect(trap.isActive).toBe(false);
    });
  });
});
