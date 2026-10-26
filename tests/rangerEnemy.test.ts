import Phaser from "phaser";
import { describe, expect, it, vi } from "vitest";

import {
  aimedShotAction,
  createRangerEnemy,
  decideRangerNext,
  type GameContext,
  m,
  pickNext,
  RANGER_CLOSE_DIST,
  RANGER_FAR_DIST,
  RANGER_TABLE,
  timedDirectionalMoveAction,
} from "../src/game/ai";
import { isLineOfSightBlockedByEnemies, isPointBlockingLineSegment } from "../src/utils/math";

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
        exists: vi.fn(() => true),
      },
    },
    add: {
      existing: vi.fn(),
      group: vi.fn(() => ({
        add: vi.fn(),
      })),
    },
    physics: {
      add: {
        existing: vi.fn(),
      },
      velocityFromRotation: vi.fn((angle, speed, vec) => {
        vec.setTo(Math.cos(angle) * speed, Math.sin(angle) * speed);
      }),
    },
    anims: {
      timeScale: 1,
    },
  };
}

/** テスト用モックEnemy */
function createMockEnemy(opts: Record<string, any> = {}): any {
  return {
    x: 0,
    y: 0,
    rotation: 0,
    moveVelocity: new Phaser.Math.Vector2(),
    direction: "right",
    directionalMode: "horizontal2",
    moveAt: vi.fn(function (this: any, angle: number, speed: number) {
      this.moveVelocity.setTo(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.rotation = angle;
    }),
    stopMoving: vi.fn(function (this: any) {
      this.moveVelocity.setTo(0, 0);
    }),
    faceAngle: vi.fn(function (this: any, angle: number) {
      this.rotation = angle;
    }),
    playActionAnim: vi.fn(),
    applyAnim: vi.fn(),
    setCooldown: vi.fn(),
    setData: vi.fn(),
    destroy: vi.fn(),
    scene: createMockScene(),
    ...opts,
  };
}

describe("射線遮蔽判定ユーティリティ (isPointBlockingLineSegment & isLineOfSightBlockedByEnemies)", () => {
  const from = { x: 0, y: 0 };
  const to = { x: 200, y: 0 };

  it("線分の直線上（中間）に障害物がある場合は true を返す", () => {
    const obstacle = { x: 100, y: 5 }; // 線分 (0,0)-(200,0) の中央から y方向に5px
    expect(isPointBlockingLineSegment(obstacle, from, to, 30)).toBe(true);
  });

  it("コリドー幅の外側にある障害物は false を返す", () => {
    const obstacle = { x: 100, y: 50 }; // y=50px 離れている (30px より外)
    expect(isPointBlockingLineSegment(obstacle, from, to, 30)).toBe(false);
  });

  it("始点の後方や終点の前方にある障害物は false を返す", () => {
    const behindFrom = { x: -30, y: 0 };
    const beyondTo = { x: 250, y: 0 };
    expect(isPointBlockingLineSegment(behindFrom, from, to, 30)).toBe(false);
    expect(isPointBlockingLineSegment(beyondTo, from, to, 30)).toBe(false);
  });

  it("isLineOfSightBlockedByEnemies: 自身を除外し、生存中の障害敵がいる時のみ true を返す", () => {
    const self = { x: 0, y: 0, active: true };
    const deadObstacle = { x: 100, y: 0, active: false };
    const activeObstacle = { x: 100, y: 0, active: true };

    // 死んでいる敵のみ
    expect(isLineOfSightBlockedByEnemies(from, to, [self, deadObstacle], self, 30)).toBe(false);

    // 生きている他の敵がいる
    expect(
      isLineOfSightBlockedByEnemies(from, to, [self, deadObstacle, activeObstacle], self, 30),
    ).toBe(true);
  });
});

describe("aimedShotAction (前隙1秒の狙撃アクション)", () => {
  it("前隙1000ms中は移動停止し、完了しない (undefined)", () => {
    const action = aimedShotAction({
      windupDurationMs: 1000,
      postDelayMs: 200,
    });
    const mockEnemy = createMockEnemy({ x: 0, y: 0 });
    const mockBulletManager = { shoot: vi.fn() };
    const mockContext: GameContext = {
      player: { x: 100, y: 0 } as any,
      bulletManager: mockBulletManager as any,
    };

    const data = action.init(mockEnemy, mockContext);
    const status = action.update(mockEnemy, mockContext, data, 500);

    expect(status).toBeUndefined();
    expect(mockEnemy.moveVelocity.x).toBe(0);
    expect(mockEnemy.moveVelocity.y).toBe(0);
    expect(mockBulletManager.shoot).not.toHaveBeenCalled();
  });

  it("前隙1000msに達すると射撃し、拡大弾丸スケールを渡して後隙を経て 'done' を返す", () => {
    const action = aimedShotAction({
      windupDurationMs: 1000,
      postDelayMs: 200,
      bulletSpeed: 360,
      bulletScale: 2.4, // レンジャーの拡大弾
      damage: 20,
    });
    const mockEnemy = createMockEnemy({ x: 0, y: 0 });
    const mockBulletManager = { shoot: vi.fn() };
    const mockContext: GameContext = {
      player: { x: 100, y: 0 } as any,
      bulletManager: mockBulletManager as any,
    };

    const data = action.init(mockEnemy, mockContext);
    // 1010ms 経過で弾発射
    const status1 = action.update(mockEnemy, mockContext, data, 1010);
    expect(status1).toBeUndefined();
    expect(mockBulletManager.shoot).toHaveBeenCalledTimes(1);
    // 第7引数に拡大スケール 2.4 が渡されていること
    expect(mockBulletManager.shoot).toHaveBeenCalledWith(
      0,
      0,
      expect.any(Number),
      360,
      20,
      mockEnemy,
      2.4,
    );

    // さらに 200ms 後隙経過で完了
    const status2 = action.update(mockEnemy, mockContext, data, 200);
    expect(status2).toBe("done");
  });
});

describe("timedDirectionalMoveAction (時間指定の方向性移動アクション)", () => {
  it("approach: プレイヤーに向かって直線移動する", () => {
    const action = timedDirectionalMoveAction({
      mode: "approach",
      speed: 200,
      durationMs: 1000,
    });
    const mockEnemy = createMockEnemy({ x: 0, y: 0 });
    const mockContext: GameContext = {
      player: { x: 100, y: 0 } as any,
    };

    const data = action.init(mockEnemy, mockContext);
    action.update(mockEnemy, mockContext, data, 16);
    expect(mockEnemy.moveVelocity.x).toBeCloseTo(200);
    expect(mockEnemy.moveVelocity.y).toBeCloseTo(0);
  });

  it("backstep: プレイヤーと逆方向に向かって後ずさり移動する", () => {
    const action = timedDirectionalMoveAction({
      mode: "backstep",
      speed: 150,
      durationMs: 1000,
    });
    const mockEnemy = createMockEnemy({ x: 0, y: 0 });
    const mockContext: GameContext = {
      player: { x: 100, y: 0 } as any,
    };

    const data = action.init(mockEnemy, mockContext);
    action.update(mockEnemy, mockContext, data, 16);
    expect(mockEnemy.moveVelocity.x).toBeCloseTo(-150);
    expect(mockEnemy.moveVelocity.y).toBeCloseTo(0);
  });

  it("flank: プレイヤーに対して直交方向（±90度）へ移動する", () => {
    const action = timedDirectionalMoveAction({
      mode: "flank",
      speed: 180,
      durationMs: 1000,
      flankSide: 1, // +90度
    });
    const mockEnemy = createMockEnemy({ x: 0, y: 0 });
    const mockContext: GameContext = {
      player: { x: 100, y: 0 } as any, // プレイヤーは真右
    };

    const data = action.init(mockEnemy, mockContext);
    action.update(mockEnemy, mockContext, data, 16);
    // +90度 = 真下 (y > 0)
    expect(mockEnemy.moveVelocity.x).toBeCloseTo(0);
    expect(mockEnemy.moveVelocity.y).toBeCloseTo(180);
  });

  it("1000ms 経過で停止し 'done' を返す", () => {
    const action = timedDirectionalMoveAction({
      mode: "approach",
      speed: 200,
      durationMs: 1000,
    });
    const mockEnemy = createMockEnemy({ x: 0, y: 0 });
    const mockContext: GameContext = {
      player: { x: 100, y: 0 } as any,
    };

    const data = action.init(mockEnemy, mockContext);
    const status = action.update(mockEnemy, mockContext, data, 1000);
    expect(status).toBe("done");
    expect(mockEnemy.stopMoving).toHaveBeenCalled();
  });
});

describe("decideRangerNext & ステート遷移（距離分岐・射線迂回）", () => {
  it("遠距離 (>= 11.0m): APPROACH へ遷移する", () => {
    const mockEnemy: any = {
      x: 0,
      y: 0,
    };
    const mockContext: GameContext = {
      player: { x: RANGER_FAR_DIST + 50, y: 0 } as any,
      getEnemies: () => [mockEnemy],
    };

    const next = pickNext(decideRangerNext, mockContext, mockEnemy);
    expect(next).toBe("APPROACH");
  });

  it("中距離で射線がクリアな場合: 射撃選択時は SHOOT へ遷移する", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.8); // roll >= 0.5 で射撃を選択

    const mockEnemy: any = {
      x: 0,
      y: 0,
    };
    const mockContext: GameContext = {
      player: { x: m(5.0), y: 0 } as any, // 5.0m (中距離)
      getEnemies: () => [mockEnemy], // 障害物なし
    };

    const next = pickNext(decideRangerNext, mockContext, mockEnemy);
    expect(next).toBe("SHOOT");

    vi.restoreAllMocks();
  });

  it("中距離で射線上に他の敵がいる場合: FLANK（迂回）へ遷移する", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.8); // 射撃を選択

    const mockEnemy: any = {
      x: 0,
      y: 0,
    };
    const blockingEnemy = { x: m(2.5), y: 0, active: true }; // 直線の真ん中にいる敵
    const mockContext: GameContext = {
      player: { x: m(5.0), y: 0 } as any,
      getEnemies: () => [mockEnemy, blockingEnemy],
    };

    const next = pickNext(decideRangerNext, mockContext, mockEnemy);
    expect(next).toBe("FLANK");

    vi.restoreAllMocks();
  });

  it("至近距離 (< 1.5m): 1/3 で BACKSTEP, 1/3 で LUNGE, 1/3 で射線判定", () => {
    const mockEnemy: any = {
      x: 0,
      y: 0,
    };
    const mockContext: GameContext = {
      player: { x: RANGER_CLOSE_DIST - 20, y: 0 } as any,
      getEnemies: () => [mockEnemy],
    };

    // roll < 1/3 -> BACKSTEP
    vi.spyOn(Math, "random").mockReturnValue(0.2);
    expect(pickNext(decideRangerNext, mockContext, mockEnemy)).toBe("BACKSTEP");

    // 1/3 <= roll < 2/3 -> LUNGE
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(pickNext(decideRangerNext, mockContext, mockEnemy)).toBe("LUNGE");

    // roll >= 2/3 -> 射撃（射線クリアなら SHOOT）
    vi.spyOn(Math, "random").mockReturnValue(0.8);
    expect(pickNext(decideRangerNext, mockContext, mockEnemy)).toBe("SHOOT");

    vi.restoreAllMocks();
  });

  it("FLANK の onDone: 必ず攻撃を試み、遮蔽されていれば再度 FLANK、クリアなら SHOOT", () => {
    const mockEnemy: any = {
      x: 0,
      y: 0,
    };
    const blockingEnemy = { x: 50, y: 0, active: true };
    const mockContextWithBlock: GameContext = {
      player: { x: 100, y: 0 } as any,
      getEnemies: () => [mockEnemy, blockingEnemy],
    };

    // まだ障害物がいる場合は再度 FLANK
    expect(pickNext(RANGER_TABLE.FLANK.onDone, mockContextWithBlock, mockEnemy)).toBe("FLANK");

    // 迂回して射線が通った場合は SHOOT
    const mockContextClear: GameContext = {
      player: { x: 100, y: 0 } as any,
      getEnemies: () => [mockEnemy],
    };
    expect(pickNext(RANGER_TABLE.FLANK.onDone, mockContextClear, mockEnemy)).toBe("SHOOT");
  });

  it("RangerEnemy 初期化 & StateTable の整合性", () => {
    const scene = createMockScene();
    const ranger = createRangerEnemy(scene, 150, 250);
    expect(ranger).toBeDefined();
    expect(ranger.x).toBe(150);
    expect(ranger.y).toBe(250);
    expect(ranger.maxHp).toBe(70);
    expect(ranger.hp).toBe(70);
    expect(ranger.getData("hp")).toBe(70);
    expect(ranger.stunResistance).toBe(15);
    expect(ranger.slowResistance).toBe(20);
    expect(ranger.directionalMode).toBe("horizontal2");
    expect(ranger.direction).toBe("right");

    expect(ranger.currentState).toBe("APPROACH");

    expect(RANGER_TABLE.APPROACH).toBeDefined();
    expect(RANGER_TABLE.BACKSTEP).toBeDefined();
    expect(RANGER_TABLE.LUNGE).toBeDefined();
    expect(RANGER_TABLE.FLANK).toBeDefined();
    expect(RANGER_TABLE.SHOOT).toBeDefined();
    expect(RANGER_TABLE.STUN).toBeDefined();
  });
});
