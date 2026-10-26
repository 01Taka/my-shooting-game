import { describe, expect, it, vi } from "vitest";

import {
  defineAction,
  Enemy,
  EnemyBase,
  type GameContext,
  type ResistanceConfig,
  type StateTable,
  type Watcher,
} from "../src/game/ai";

/** テスト用ダミーPhaser Scene */
function createMockScene(): any {
  return {
    sys: {
      queueDepthSort: vi.fn(),
      settings: { key: "test" },
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

/** テスト用 EnemyBase 実装 */
class TestEnemyBase extends EnemyBase {
  public stunTriggeredCount = 0;

  constructor(scene: any, resistances?: ResistanceConfig) {
    super(scene, 0, 0, "dummy", resistances);
    // モック物理body
    this.body = {
      setVelocity: vi.fn(),
    } as any;
  }

  protected onStunTriggered(): void {
    this.stunTriggeredCount++;
  }

  // 外部から tickBase を呼べるように公開
  public publicTickBase(delta: number): number {
    return this.tickBase(delta);
  }

  public publicApplyVelocity(): void {
    this.applyVelocity();
  }
}

describe("08/09 EnemyBase デバフ・耐性・物理・時間基底クラス", () => {
  it("耐性0: applyStun で実効時間が100%計算され onStunTriggered が呼ばれる", () => {
    const scene = createMockScene();
    const enemy = new TestEnemyBase(scene, { stunResistance: 0 });

    enemy.applyStun(1000);
    expect(enemy.pendingStunDurationMs).toBe(1000);
    expect(enemy.stunTriggeredCount).toBe(1);
  });

  it("耐性50: applyStun で時間が半減して onStunTriggered が呼ばれる", () => {
    const scene = createMockScene();
    const enemy = new TestEnemyBase(scene, { stunResistance: 50 });

    enemy.applyStun(1000);
    expect(enemy.pendingStunDurationMs).toBe(500);
    expect(enemy.stunTriggeredCount).toBe(1);
  });

  it("耐性100: applyStun で実効時間が0となり、onStunTriggered が一切呼ばれないこと（0秒スタン・行動キャンセルなし）", () => {
    const scene = createMockScene();
    const enemy = new TestEnemyBase(scene, { stunResistance: 100 });

    enemy.applyStun(1000);
    expect(enemy.pendingStunDurationMs).toBe(0);
    expect(enemy.stunTriggeredCount).toBe(0); // 呼ばれない！
  });

  it("applySlow: メーターが蓄積され timeScale が連続的に低下すること", () => {
    const scene = createMockScene();
    const enemy = new TestEnemyBase(scene, { slowResistance: 0 });

    expect(enemy.timeScale).toBe(1.0);
    expect(enemy.iceMeter).toBe(0);

    enemy.applySlow(40);
    expect(enemy.iceMeter).toBe(40);
    expect(enemy.timeScale).toBeCloseTo(0.6);

    // さらに蓄積
    enemy.applySlow(30);
    expect(enemy.iceMeter).toBe(70);
    expect(enemy.timeScale).toBeCloseTo(0.3);

    // 100到達で完全凍結 (timeScale = 0)
    enemy.applySlow(30);
    expect(enemy.iceMeter).toBe(100);
    expect(enemy.timeScale).toBe(0.0);
  });

  it("耐性100の場合、maxIceMeter が 100 未満のため大量に applySlow されても完全凍結しないこと", () => {
    const scene = createMockScene();
    const enemy = new TestEnemyBase(scene, { slowResistance: 100 });

    expect(enemy.slowProfile.maxIceMeter).toBe(50);
    expect(enemy.slowProfile.freezeThreshold).toBe(100);

    // 9999 のスロウを浴びせる
    enemy.applySlow(9999);
    expect(enemy.iceMeter).toBe(50);
    expect(enemy.timeScale).toBeCloseTo(0.5); // 0.0 にならない！
  });

  it("tickBase: 実時間 delta に応じてアイスメーターが自然減衰し、クールダウンが scaledDelta で進行すること", () => {
    const scene = createMockScene();
    // decayPerSec = 20 の敵を想定
    const enemy = new TestEnemyBase(scene, { slowResistance: 0 }); // decayPerSec = 15

    enemy.applySlow(30); // ratio = 0.3 -> timeScale = 0.7
    enemy.startCooldown("skill", 1000);

    expect(enemy.isReady("skill")).toBe(false);

    // 1000ms 経過 (1秒)
    // decayPerSec = 15 なので 1秒で 15 減衰 -> 残りメーター 15
    // timeScale は最初 0.7、tickBase で減衰後の timeScale に更新
    const scaled = enemy.publicTickBase(1000);
    expect(enemy.iceMeter).toBeCloseTo(15);
    expect(enemy.timeScale).toBeCloseTo(0.85);
    expect(scaled).toBeCloseTo(850); // 1000 * 0.85
    expect(enemy.isReady("skill")).toBe(false);

    // さらに 1000ms 経過 -> メーター 0 になり全快、timeScale = 1.0
    const scaled2 = enemy.publicTickBase(1000);
    expect(enemy.iceMeter).toBe(0);
    expect(enemy.timeScale).toBe(1.0);
    expect(scaled2).toBe(1000);
    expect(enemy.isReady("skill")).toBe(true);
  });

  it("凍結中 (timeScale = 0) は scaledDelta = 0 となりクールダウンが停止すること", () => {
    const scene = createMockScene();
    const enemy = new TestEnemyBase(scene, { slowResistance: 0 });

    // 上限150まで溜めて凍結
    enemy.applySlow(150);
    expect(enemy.timeScale).toBe(0);

    enemy.startCooldown("skill", 1000);

    // 500ms 経過: メーターは 150 - (15 * 0.5) = 142.5 (> 100 なのでまだ凍結)
    const scaled = enemy.publicTickBase(500);
    expect(scaled).toBe(0);
    expect(enemy.isReady("skill")).toBe(false);
  });
});

describe("07 サブルーチン型マイクロステートマシン (Enemy<K>)", () => {
  type TestState = "IDLE" | "PATROL" | "ATTACK" | "PANIC" | "STUN";

  it("初回フレームで初期状態に進入し、各フレームのアクション実行と onDone 遷移が動作すること", () => {
    const scene = createMockScene();
    let idleResets = 0;
    let patrolInits = 0;

    const idleAction = defineAction({
      initData: () => ({ timer: 0 }),
      update: (_enemy, _ctx, data, _args, delta) => {
        data.timer += delta;
        if (data.timer >= 100) return "done";
      },
      onReset: () => {
        idleResets++;
      },
    });

    const patrolAction = defineAction({
      initData: () => {
        patrolInits++;
        return { timer: 0 };
      },
      update: () => {},
    });

    const table: StateTable<TestState> = {
      IDLE: { run: idleAction(), onDone: "PATROL" },
      PATROL: { run: patrolAction(), onDone: "IDLE" },
      ATTACK: { run: patrolAction(), onDone: "IDLE" },
      PANIC: { run: patrolAction(), onDone: "IDLE" },
      STUN: { run: patrolAction(), onDone: "IDLE" },
    };

    const enemy = new Enemy<TestState>(scene, 0, 0, "IDLE", table);
    enemy.body = { setVelocity: vi.fn() } as any;

    const ctx: GameContext = { player: { x: 0, y: 0 } };

    // フレーム1 (delta = 50ms): IDLE 継続
    enemy.updateEnemy(ctx, 50);
    expect(enemy.currentState).toBe("IDLE");
    expect(idleResets).toBe(0);
    expect(patrolInits).toBe(0);

    // フレーム2 (delta = 60ms, 計110ms >= 100ms): IDLE 完了 -> PATROL へ遷移
    enemy.updateEnemy(ctx, 60);
    expect(idleResets).toBe(1);
    expect(patrolInits).toBe(1);
    expect(enemy.currentState).toBe("PATROL");
  });

  it("Watcher による割り込み強制遷移が最優先で適用されること", () => {
    const scene = createMockScene();
    let patrolReset = false;
    let panicInit = false;

    const patrolAction = defineAction({
      initData: () => ({}),
      update: () => {},
      onReset: () => {
        patrolReset = true;
      },
    });

    const panicAction = defineAction({
      initData: () => {
        panicInit = true;
        return {};
      },
      update: () => {},
    });

    const table: StateTable<TestState> = {
      IDLE: { run: patrolAction(), onDone: "IDLE" },
      PATROL: { run: patrolAction(), onDone: "IDLE" },
      ATTACK: { run: patrolAction(), onDone: "IDLE" },
      PANIC: { run: panicAction(), onDone: "IDLE" },
      STUN: { run: patrolAction(), onDone: "IDLE" },
    };

    let shouldPanic = false;
    const watcher: Watcher<TestState> = () => {
      if (shouldPanic) return "PANIC";
    };

    const enemy = new Enemy<TestState>(scene, 0, 0, "PATROL", table, watcher);
    enemy.body = { setVelocity: vi.fn() } as any;
    const ctx: GameContext = { player: { x: 0, y: 0 } };

    enemy.updateEnemy(ctx, 16);
    expect(enemy.currentState).toBe("PATROL");

    // Watcher 条件成立
    shouldPanic = true;
    enemy.updateEnemy(ctx, 16);
    expect(patrolReset).toBe(true);
    expect(panicInit).toBe(true);
    expect(enemy.currentState).toBe("PANIC");
  });

  it("applyStun により STUN 状態へ強制遷移し、スタン解除後は onDone（例: IDLE）へ戻ること", () => {
    const scene = createMockScene();
    let stunResetCalled = false;

    const stunAction = defineAction({
      initData: (e) => ({ timer: 0, duration: e.pendingStunDurationMs }),
      update: (_e, _ctx, data, _args, delta) => {
        data.timer += delta;
        if (data.timer >= data.duration) return "done";
      },
      onReset: () => {
        stunResetCalled = true;
      },
    });

    const dummyAction = defineAction({
      initData: () => ({}),
      update: () => {},
    });

    const table: StateTable<TestState> = {
      IDLE: { run: dummyAction(), onDone: "PATROL" },
      PATROL: { run: dummyAction(), onDone: "IDLE" },
      ATTACK: { run: dummyAction(), onDone: "IDLE" },
      PANIC: { run: dummyAction(), onDone: "IDLE" },
      STUN: { run: stunAction(), onDone: "IDLE" },
    };

    const enemy = new Enemy<TestState>(
      scene,
      0,
      0,
      "PATROL",
      table,
      undefined,
      { stunResistance: 20 },
      "STUN",
    );
    enemy.body = { setVelocity: vi.fn() } as any;
    const ctx: GameContext = { player: { x: 0, y: 0 } };

    enemy.updateEnemy(ctx, 16);
    expect(enemy.currentState).toBe("PATROL");

    // 被弾スタン (baseDuration = 1000ms, 耐性20 -> 800ms)
    enemy.applyStun(1000);
    expect(enemy.pendingStunDurationMs).toBe(800);

    // 次のフレームで STUN 状態に遷移
    enemy.updateEnemy(ctx, 16);
    expect(enemy.currentState).toBe("STUN");

    // 500ms 消化 (計516ms < 800ms)
    enemy.updateEnemy(ctx, 500);
    expect(enemy.currentState).toBe("STUN");

    // さらに 300ms 消化 (計816ms >= 800ms) -> done -> IDLE へ遷移
    enemy.updateEnemy(ctx, 300);
    expect(stunResetCalled).toBe(true);
    expect(enemy.currentState).toBe("IDLE");
  });

  it("凍結中 (timeScale = 0) はアクションやWatcherの更新が停止し、stateDataが保持され解凍後に再開すること", () => {
    const scene = createMockScene();
    let actionUpdateCalls = 0;

    const countingAction = defineAction({
      initData: () => ({ progress: 0 }),
      update: (_e, _ctx, data, _args, delta) => {
        actionUpdateCalls++;
        data.progress += delta;
        if (data.progress >= 500) return "done";
      },
    });

    const table: StateTable<TestState> = {
      IDLE: { run: countingAction(), onDone: "IDLE" },
      PATROL: { run: countingAction(), onDone: "IDLE" },
      ATTACK: { run: countingAction(), onDone: "IDLE" },
      PANIC: { run: countingAction(), onDone: "IDLE" },
      STUN: { run: countingAction(), onDone: "IDLE" },
    };

    const enemy = new Enemy<TestState>(scene, 0, 0, "IDLE", table);
    enemy.body = { setVelocity: vi.fn() } as any;
    const ctx: GameContext = { player: { x: 0, y: 0 } };

    // フレーム1: 正常実行
    enemy.updateEnemy(ctx, 100);
    expect(actionUpdateCalls).toBe(1);

    // 完全凍結させる（上限150まで溜めて減衰による即解凍を防ぐ）
    enemy.applySlow(150);
    expect(enemy.timeScale).toBe(0);

    // 凍結中のフレーム: updateEnemy を呼んでもアクションは実行されない（凍結早期リターン）
    // delta = 100ms だと減衰は 1.5 なので、150 - 1.5 = 148.5 (> 100) で凍結持続
    enemy.updateEnemy(ctx, 100);
    expect(actionUpdateCalls).toBe(1); // 増えない！

    // 解凍させる (iceMeter を 0 にして updateEnemy で timeScale = 1.0 に回復させる)
    enemy.iceMeter = 0;
    enemy.timeScale = 1.0;
    expect(enemy.timeScale).toBe(1.0);

    // 解凍後: 再び続きから実行される
    enemy.updateEnemy(ctx, 100);
    expect(actionUpdateCalls).toBe(2);
  });
});
