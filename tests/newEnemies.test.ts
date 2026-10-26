import Phaser from "phaser";
import { describe, expect, it, vi } from "vitest";

import {
  BOMBER_TABLE,
  bomberWatcher,
  chasePlayerAction,
  createBipedalWolfEnemy,
  createBomberEnemy,
  type GameContext,
  lungeAttackAction,
  m,
  suicideExplodeAction,
  WOLF_TABLE,
  wolfWatcher,
} from "../src/game/ai";
import { rotateTowardsAngle } from "../src/utils/math";

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
    textures: {
      get: vi.fn(() => ({
        get: vi.fn(() => ({})),
        frames: {},
      })),
      exists: vi.fn(() => true),
    },
    add: {
      existing: vi.fn(),
      group: vi.fn(() => ({
        add: vi.fn(),
      })),
      sprite: vi.fn(() => ({
        setOrigin: vi.fn().mockReturnThis(),
        play: vi.fn().mockReturnThis(),
        once: vi.fn(),
      })),
      image: vi.fn(() => ({
        setPosition: vi.fn().mockReturnThis(),
        setRotation: vi.fn().mockReturnThis(),
        setTexture: vi.fn().mockReturnThis(),
        setOrigin: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        active: true,
        destroy: vi.fn(),
        scene: { textures: { exists: vi.fn(() => true) } },
      })),
    },
    tweens: {
      add: vi.fn(),
    },
    time: {
      addEvent: vi.fn(() => ({ remove: vi.fn() })),
    },
    physics: {
      textures: {
        get: vi.fn(() => ({
          get: vi.fn(() => ({})),
          frames: {},
        })),
        exists: vi.fn(() => true),
      },
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

describe("rotateTowardsAngle (角度制限旋回ユーティリティ)", () => {
  it("現在角と目標角が同一の場合は変化しない", () => {
    const res = rotateTowardsAngle(1.0, 1.0, 0.5);
    expect(res).toBeCloseTo(1.0);
  });

  it("差分が maxDelta 未満の場合は直接目標角に到達する", () => {
    const res = rotateTowardsAngle(0.1, 0.3, 0.5);
    expect(res).toBeCloseTo(0.3);
  });

  it("時計回り方向に maxDelta 分だけ進む", () => {
    const res = rotateTowardsAngle(0.0, 1.0, 0.3);
    expect(res).toBeCloseTo(0.3);
  });

  it("反時計回り方向に maxDelta 分だけ進む", () => {
    const res = rotateTowardsAngle(1.0, 0.0, 0.4);
    expect(res).toBeCloseTo(0.6);
  });

  it("-PI / +PI 境界を跨ぐ最短経路で回転する", () => {
    // 3.0rad (+171度) から -3.0rad (-171度) への最短経路は +方向 (+18度)
    const res = rotateTowardsAngle(3.0, -3.0, 0.2);
    // 3.0 + 0.2 = 3.2 -> wrapAngle(3.2) = 3.2 - 2PI = -3.083...
    const diff = Phaser.Math.Angle.Wrap(res - 3.0);
    expect(diff).toBeGreaterThan(0); // 正の回転（最短）
  });
});

describe("chasePlayerAction (直線追尾アクション)", () => {
  it("目標距離外のときはプレイヤーに向けて等速移動し、undefined (継続) を返す", () => {
    const action = chasePlayerAction({
      speed: 100,
      stopDistance: 50,
    });

    const mockEnemy = createMockEnemy({ x: 0, y: 0 });
    const mockContext: GameContext = {
      player: { x: 200, y: 0 } as any,
      damageZoneManager: { createZone: vi.fn() } as any,
    };

    const data = action.init(mockEnemy, mockContext);
    const status = action.update(mockEnemy, mockContext, data, 16);
    expect(status).toBeUndefined();
    expect(mockEnemy.moveVelocity.x).toBeCloseTo(100);
    expect(mockEnemy.moveVelocity.y).toBeCloseTo(0);
  });

  it("stopDistance 以内に到達したときは停止して 'done' を返す", () => {
    const action = chasePlayerAction({
      speed: 100,
      stopDistance: 50,
    });

    const mockEnemy = createMockEnemy({ x: 30, y: 0 });
    const mockContext: GameContext = {
      player: { x: 50, y: 0 } as any, // 距離 20 <= 50
      damageZoneManager: { createZone: vi.fn() } as any,
    };

    const data = action.init(mockEnemy, mockContext);
    const status = action.update(mockEnemy, mockContext, data, 16);
    expect(status).toBe("done");
    expect(mockEnemy.moveVelocity.x).toBe(0);
    expect(mockEnemy.moveVelocity.y).toBe(0);
  });
});

describe("suicideExplodeAction (自爆特攻アクション)", () => {
  it("予兆時間中は移動を停止し、完了しない (undefined)", () => {
    const action = suicideExplodeAction({
      windupDurationMs: 500,
      explosionRadius: 100,
      damage: 50,
      knockback: 200,
    });

    const mockEnemy = createMockEnemy({ x: 100, y: 100 });
    mockEnemy.moveVelocity.set(50, 50);

    const mockContext: GameContext = {
      player: { x: 100, y: 100 } as any,
      damageZoneManager: { createZone: vi.fn() } as any,
    };

    const data = action.init(mockEnemy, mockContext);
    // 100ms 経過
    const status = action.update(mockEnemy, mockContext, data, 100);
    expect(status).toBeUndefined();
    expect(mockEnemy.moveVelocity.x).toBe(0);
    expect(mockEnemy.moveVelocity.y).toBe(0);
    expect(mockContext.damageZoneManager?.createZone).not.toHaveBeenCalled();
    expect(mockEnemy.destroy).not.toHaveBeenCalled();
  });

  it("予兆時間が満了すると DamageZone を生成し自身を破棄して 'done' を返す", () => {
    const action = suicideExplodeAction({
      windupDurationMs: 500,
      explosionRadius: 100,
      damage: 50,
      knockback: 200,
    });

    const mockEnemy = createMockEnemy({ x: 100, y: 100 });
    const mockScene = createMockScene();
    const mockContext: GameContext = {
      player: { x: 100, y: 100 } as any,
      damageZoneManager: { createZone: vi.fn() } as any,
      scene: mockScene,
    };

    const data = action.init(mockEnemy, mockContext);
    // 550ms 経過
    const status = action.update(mockEnemy, mockContext, data, 550);
    expect(status).toBe("done");
    expect(mockContext.damageZoneManager?.createZone).toHaveBeenCalledTimes(1);
    expect(mockScene.add.image).toHaveBeenCalled(); // 攻撃範囲と同等の爆発エフェクトをシーンに生成
    expect(mockEnemy.setData).toHaveBeenCalledWith("hp", 0);
    expect(mockEnemy.destroy).toHaveBeenCalled();
  });
});

describe("lungeAttackAction (大一歩旋回制限突進攻撃)", () => {
  it("WINDUP 中は windupTurnRateRadPerSec でゆっくりプレイヤー方向へ旋回する", () => {
    const turnRate = Math.PI * 0.5; // 90度/秒
    const action = lungeAttackAction({
      windupDurationMs: 1000,
      windupTurnRateRadPerSec: turnRate,
      lungeSpeed: 200,
      lungeDurationMs: 300,
      attackRange: 80,
      damage: 30,
      recoveryDurationMs: 200,
      cooldownMs: 1000,
    });

    const mockEnemy = createMockEnemy({
      x: 0,
      y: 0,
      rotation: 0,
    });
    // 初期化時は真右 (0rad) を向く
    const mockContext: GameContext = {
      player: { x: 100, y: 0 } as any,
      damageZoneManager: { createZone: vi.fn() } as any,
    };

    const data = action.init(mockEnemy, mockContext);
    expect(mockEnemy.rotation).toBeCloseTo(0);

    // プレイヤーが真下 (PI/2 = 1.57rad) に移動
    mockContext.player = { x: 0, y: 100 };

    // 500ms 経過 -> turnRate * 0.5s = PI * 0.25 rad (約0.785rad) 回転するはず
    const status = action.update(mockEnemy, mockContext, data, 500);
    expect(status).toBeUndefined();
    expect(mockEnemy.rotation).toBeCloseTo(Math.PI * 0.25, 2);
    expect(mockEnemy.moveVelocity.x).toBe(0);
    expect(mockEnemy.moveVelocity.y).toBe(0);
  });

  it("LUNGE フェーズ中は前進するが判定は出ず、踏み込み完了の瞬間に攻撃判定と斬撃エフェクトを発動する", () => {
    const action = lungeAttackAction({
      windupDurationMs: 200,
      windupTurnRateRadPerSec: Math.PI,
      lungeSpeed: 300,
      lungeDurationMs: 300,
      attackRange: 80,
      slashDurationMs: 200,
      damage: 30,
      recoveryDurationMs: 200,
      cooldownMs: 1000,
      clawEffectAnim: () => "wolf_slash_fx_0",
    });

    const mockEnemy = createMockEnemy({
      x: 0,
      y: 0,
      rotation: 0,
    });
    const mockContext: GameContext = {
      player: { x: 100, y: 0 } as any,
      damageZoneManager: { createZone: vi.fn() } as any,
      scene: createMockScene(),
    };

    const data = action.init(mockEnemy, mockContext);

    // 1. 210ms 経過 -> WINDUP(200ms) 終了直後で LUNGE 突入（踏み込み開始）
    const status1 = action.update(mockEnemy, mockContext, data, 210);
    expect(status1).toBeUndefined();
    expect(mockEnemy.moveVelocity.x).toBeCloseTo(300);
    // 踏み込み中はまだ攻撃判定を出さない
    expect(mockContext.damageZoneManager?.createZone).not.toHaveBeenCalled();

    // 2. さらに 300ms 経過 (累計 510ms) -> 踏み込み完了 (LUNGE 終了)
    // 踏み込み完了の瞬間に停止し、攻撃判定（createZone）が生成される
    const status2 = action.update(mockEnemy, mockContext, data, 300);
    expect(status2).toBeUndefined();
    expect(mockEnemy.moveVelocity.x).toBe(0);
    expect(mockContext.damageZoneManager?.createZone).toHaveBeenCalledTimes(1);
  });
});

describe("Bomber & BipedalWolf Watchers & State Tables", () => {
  it("bomberWatcher: プレイヤーが1.3m以内の至近距離に肉薄すると EXPLODE をトリガーする", () => {
    const mockEnemy: any = {
      x: 0,
      y: 0,
      currentState: "CHASE",
      getData: vi.fn(),
    };
    const mockContext: GameContext = {
      player: { x: m(1.0), y: 0 } as any, // 1.0m <= 1.3m
      damageZones: {} as any,
    };

    const nextState = bomberWatcher(mockEnemy, mockContext);
    expect(nextState).toBe("EXPLODE");
  });

  it("bomberWatcher: プレイヤーが1.3mより遠いときは自爆を開始しない", () => {
    const mockEnemy: any = {
      x: 0,
      y: 0,
      currentState: "CHASE",
      getData: vi.fn(),
    };
    const mockContext: GameContext = {
      player: { x: m(2.0), y: 0 } as any, // 2.0m > 1.3m
      damageZones: {} as any,
    };

    const nextState = bomberWatcher(mockEnemy, mockContext);
    expect(nextState).toBeUndefined();
  });

  it("bomberWatcher: 自爆モード中にプレイヤーが離れる (>= 2.4m) と自爆をキャンセルして CHASE へ戻る (クリーパー仕様)", () => {
    const mockEnemy: any = {
      x: 0,
      y: 0,
      currentState: "EXPLODE",
      getData: vi.fn((key) => (key === "isDying" ? false : undefined)),
    };
    const mockContext: GameContext = {
      player: { x: m(2.6), y: 0 } as any, // 2.6m >= 2.4m
      damageZones: {} as any,
    };

    const nextState = bomberWatcher(mockEnemy, mockContext);
    expect(nextState).toBe("CHASE");
  });

  it("bomberWatcher: 死亡による強制自爆中 (isDying: true) は、プレイヤーが離れても自爆がキャンセルされない", () => {
    const mockEnemy: any = {
      x: 0,
      y: 0,
      currentState: "EXPLODE",
      getData: vi.fn((key) => (key === "isDying" ? true : undefined)),
    };
    const mockContext: GameContext = {
      player: { x: m(3.0), y: 0 } as any, // 3.0m (離れている)
      damageZones: {} as any,
    };

    const nextState = bomberWatcher(mockEnemy, mockContext);
    expect(nextState).toBeUndefined(); // キャンセルされず自爆を継続
  });

  it("BomberEnemy: handleDeath で自爆ステートへ遷移し、即時破棄を抑制する", () => {
    const scene = createMockScene();
    const bomber = createBomberEnemy(scene, 100, 200);
    bomber.body = {
      checkCollision: { none: false },
      setVelocity: vi.fn(),
    } as any;

    const requestSpy = vi.spyOn(bomber, "requestState");
    const handled = bomber.handleDeath();

    expect(handled).toBe(true);
    expect(requestSpy).toHaveBeenCalledWith("EXPLODE");
    expect(bomber.getData("isDying")).toBe(true);
    expect(bomber.body.checkCollision.none).toBe(true);
  });

  it("wolfWatcher: プレイヤーが2.0m以内にいてCD外なら LUNGE をトリガーする", () => {
    const mockEnemy: any = {
      x: 0,
      y: 0,
      currentState: "CHASE",
      isReady: vi.fn(() => true),
    };
    const mockContext: GameContext = {
      player: { x: m(1.8), y: 0 } as any,
      damageZones: {} as any,
    };

    const nextState = wolfWatcher(mockEnemy, mockContext);
    expect(nextState).toBe("LUNGE");
  });

  it("wolfWatcher: クールダウン中なら LUNGE をトリガーしない", () => {
    const mockEnemy: any = {
      x: 0,
      y: 0,
      currentState: "CHASE",
      isReady: vi.fn(() => false),
    };
    const mockContext: GameContext = {
      player: { x: m(2.5), y: 0 } as any,
      damageZones: {} as any,
    };

    const nextState = wolfWatcher(mockEnemy, mockContext);
    expect(nextState).toBeUndefined();
  });

  it("StateTable: BOMBER_TABLE と WOLF_TABLE に必須状態が定義されている", () => {
    expect(BOMBER_TABLE.CHASE).toBeDefined();
    expect(BOMBER_TABLE.EXPLODE).toBeDefined();
    expect(BOMBER_TABLE.STUN).toBeDefined();

    expect(WOLF_TABLE.CHASE).toBeDefined();
    expect(WOLF_TABLE.LUNGE).toBeDefined();
    expect(WOLF_TABLE.STUN).toBeDefined();
  });

  it("Factory: createBomberEnemy & createBipedalWolfEnemy が正しく初期化される", () => {
    const scene = createMockScene();
    const bomber = createBomberEnemy(scene, 100, 200);
    expect(bomber).toBeDefined();
    expect(bomber.x).toBe(100);
    expect(bomber.y).toBe(200);
    expect(bomber.maxHp).toBe(30);
    expect(bomber.hp).toBe(30);
    expect(bomber.stunResistance).toBe(10);
    expect(bomber.slowResistance).toBe(10);

    const wolf = createBipedalWolfEnemy(scene, 300, 400);
    expect(wolf).toBeDefined();
    expect(wolf.x).toBe(300);
    expect(wolf.y).toBe(400);
    expect(wolf.maxHp).toBe(80);
    expect(wolf.hp).toBe(80);
    expect(wolf.stunResistance).toBe(30);
    expect(wolf.slowResistance).toBe(25);
  });
});
