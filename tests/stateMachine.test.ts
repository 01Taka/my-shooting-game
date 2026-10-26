import { describe, expect, it } from "vitest";

import {
  dashClawAttackAction,
  defineAction,
  m,
  pickNext,
  PX_PER_METER,
  roamOrChaseAction,
  stunAction,
  tripleShotAction,
} from "../src/game/ai";

describe("07 ステートマシン・アクションサブルーチン・AIロジック", () => {
  describe("単位換算 (m, PX_PER_METER)", () => {
    it("1m = 50px の換算が正しいこと", () => {
      expect(PX_PER_METER).toBe(50);
      expect(m(1)).toBe(50);
      expect(m(4)).toBe(200);
      expect(m(7.6)).toBe(380);
    });
  });

  describe("pickNext", () => {
    it("単一状態名の場合はそのまま返すこと", () => {
      expect(pickNext("MOVE")).toBe("MOVE");
      expect(pickNext("ATTACK")).toBe("ATTACK");
    });

    it("重み付き候補配列から正しく抽選されること", () => {
      const candidates = [
        { state: "MOVE", weight: 1 },
        { state: "ATTACK", weight: 3 },
      ] as const;

      // 複数回抽選してどちらのキーも返されうることを確認
      const results = new Set<string>();
      for (let i = 0; i < 50; i++) {
        results.add(pickNext(candidates));
      }
      expect(results.has("MOVE")).toBe(true);
      expect(results.has("ATTACK")).toBe(true);
    });

    it("weight が省略された場合は 1 として扱われること", () => {
      const candidates = [{ state: "A" }, { state: "B" }] as const;
      const res = pickNext(candidates);
      expect(["A", "B"]).toContain(res);
    });

    it("weight が 0 の候補は選ばれないこと", () => {
      const candidates = [
        { state: "A", weight: 0 },
        { state: "B", weight: 10 },
      ] as const;
      for (let i = 0; i < 20; i++) {
        expect(pickNext(candidates)).toBe("B");
      }
    });

    it("コールバック関数の場合は context と enemy を渡して評価すること", () => {
      const mockContext = { player: { x: 100, y: 0 } } as any;
      const mockEnemy = { x: 0, y: 0 } as any;

      const callback = (context: any, enemy: any) => {
        return context.player.x - enemy.x > 50 ? "RUN" : "ATTACK";
      };

      expect(pickNext(callback, mockContext, mockEnemy)).toBe("RUN");

      // コールバックが重み付き配列を返すケース
      const callbackWithArray = () => [{ state: "SUCCESS", weight: 1 }];
      expect(pickNext(callbackWithArray, mockContext, mockEnemy)).toBe("SUCCESS");
    });

    it("候補が空または重み合計が0以下のときは例外を投げること", () => {
      expect(() => pickNext([])).toThrow();
      expect(() => pickNext([{ state: "A", weight: 0 }])).toThrow();
    });
  });

  describe("defineAction", () => {
    it("initData, update, onReset がバインドされること", () => {
      let resetCalled = false;
      const testAction = defineAction<{ count: number }, { step: number }>({
        initData: (_enemy, _ctx, args) => ({ count: args.step }),
        update: (_enemy, _ctx, data, args, _delta) => {
          data.count += args.step;
          if (data.count >= 10) return "done";
        },
        onReset: (_enemy, _data, _args) => {
          resetCalled = true;
        },
      });

      const bound = testAction({ step: 3 });
      const mockEnemy = {} as any;
      const mockCtx = { player: { x: 0, y: 0 } };

      const data = bound.init(mockEnemy, mockCtx) as { count: number };
      expect(data.count).toBe(3);

      const r1 = bound.update(mockEnemy, mockCtx, data, 16);
      expect(r1).toBeUndefined();
      expect(data.count).toBe(6);

      const r2 = bound.update(mockEnemy, mockCtx, data, 16);
      expect(r2).toBeUndefined();
      expect(data.count).toBe(9);

      const r3 = bound.update(mockEnemy, mockCtx, data, 16);
      expect(r3).toBe("done");
      expect(data.count).toBe(12);

      bound.onReset?.(mockEnemy, data);
      expect(resetCalled).toBe(true);
    });
  });

  describe("組込みアクションの実行動作", () => {
    it("roamOrChaseAction: 指定時間経過で 'done' を返し onReset で停止すること", () => {
      let stopped = false;
      let movedAngle = -1;
      let movedSpeed = -1;
      const mockEnemy = {
        x: 0,
        y: 0,
        moveAt: (a: number, s: number) => {
          movedAngle = a;
          movedSpeed = s;
        },
        stopMoving: () => {
          stopped = true;
        },
        setRotation: () => {},
      } as any;

      const action = roamOrChaseAction({
        speed: 100,
        chaseThresholdDistance: 200,
        minDurationMs: 1000,
        maxDurationMs: 1000, // 固定1秒
      });

      const bound = action;
      const data = bound.init(mockEnemy, { player: { x: 500, y: 0 } });
      expect(movedSpeed).toBe(100);
      expect(movedAngle).toBeCloseTo(0); // x方向追尾

      // 500ms経過
      const r1 = bound.update(mockEnemy, { player: { x: 500, y: 0 } }, data, 500);
      expect(r1).toBeUndefined();

      // さらに500ms経過 (計1000ms)
      const r2 = bound.update(mockEnemy, { player: { x: 500, y: 0 } }, data, 500);
      expect(r2).toBe("done");

      bound.onReset?.(mockEnemy, data);
      expect(stopped).toBe(true);
    });

    it("tripleShotAction: intervalMs間隔で射撃し、3発撃った後に後隙を経て 'done' になること", () => {
      let stopped = false;
      const shotPositions: Array<{ x: number; y: number; angle: number }> = [];
      const mockEnemy = {
        x: 10,
        y: 20,
        stopMoving: () => {
          stopped = true;
        },
        setRotation: () => {},
      } as any;

      const mockBulletManager = {
        shoot: (x: number, y: number, angle: number) => {
          shotPositions.push({ x, y, angle });
        },
      };

      const ctx = {
        player: { x: 10, y: 120 },
        bulletManager: mockBulletManager,
      };

      const action = tripleShotAction({
        totalShots: 3,
        intervalMs: 250,
        postDelayMs: 400,
      });

      const bound = action;
      const data = bound.init(mockEnemy, ctx);
      expect(stopped).toBe(true);

      // 240ms: まだ撃たない (予兆)
      bound.update(mockEnemy, ctx, data, 240);
      expect(shotPositions.length).toBe(0);

      // +20ms (計260ms): 1発目発射！
      bound.update(mockEnemy, ctx, data, 20);
      expect(shotPositions.length).toBe(1);

      // 2発目 (250ms後)
      bound.update(mockEnemy, ctx, data, 250);
      expect(shotPositions.length).toBe(2);

      // 3発目 (250ms後) -> isRecovering = true
      bound.update(mockEnemy, ctx, data, 250);
      expect(shotPositions.length).toBe(3);

      // 後隙 (390ms) -> まだ継続
      const rNotDone = bound.update(mockEnemy, ctx, data, 390);
      expect(rNotDone).toBeUndefined();

      // +20ms (計410ms >= 400ms) -> done
      const rDone = bound.update(mockEnemy, ctx, data, 20);
      expect(rDone).toBe("done");
    });

    it("dashClawAttackAction: DASHステップからRECOVERYステップを経てdoneになり、クールダウンを開始すること", () => {
      const cooldowns: Record<string, number> = {};
      let stopped = false;

      const mockEnemy = {
        x: 0,
        y: 0,
        moveAt: () => {},
        stopMoving: () => {
          stopped = true;
        },
        setRotation: () => {},
        startCooldown: (k: string, ms: number) => {
          cooldowns[k] = ms;
        },
      } as any;

      const ctx = { player: { x: 100, y: 100 } };
      const action = dashClawAttackAction({
        dashSpeed: 380,
        dashDurationMs: 300,
        recoveryDurationMs: 450,
        cooldownMs: 1500,
      });

      const bound = action;
      const data = bound.init(mockEnemy, ctx) as any;
      expect(data.step).toBe("DASH");

      // 200ms突進
      bound.update(mockEnemy, ctx, data, 200);
      expect(data.step).toBe("DASH");

      // +150ms突進 (350ms >= 300ms) -> 爪攻撃判定、RECOVERYへ
      bound.update(mockEnemy, ctx, data, 150);
      expect(data.step).toBe("RECOVERY");
      expect(stopped).toBe(true);

      // 後隙 400ms
      const r1 = bound.update(mockEnemy, ctx, data, 400);
      expect(r1).toBeUndefined();

      // +60ms (460ms >= 450ms) -> done
      const r2 = bound.update(mockEnemy, ctx, data, 60);
      expect(r2).toBe("done");

      // onReset
      bound.onReset?.(mockEnemy, data);
      expect(cooldowns.claw).toBe(1500);
    });

    it("stunAction: pendingStunDurationMs 分だけ硬直して done になること", () => {
      let stopped = false;

      const mockEnemy = {
        pendingStunDurationMs: 800,
        stopMoving: () => {
          stopped = true;
        },
      } as any;

      const action = stunAction();
      const bound = action;
      const data = bound.init(mockEnemy, { player: { x: 0, y: 0 } });
      expect(stopped).toBe(true);

      // 500ms経過
      expect(bound.update(mockEnemy, {} as any, data, 500)).toBeUndefined();

      // さらに300ms経過 (計800ms)
      expect(bound.update(mockEnemy, {} as any, data, 300)).toBe("done");
    });
  });
});
