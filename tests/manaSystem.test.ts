import { describe, expect, it, vi } from "vitest";

import { WEAPON_DEFINITIONS } from "../src/constants";
import { BulletManager } from "../src/game/BulletManager";
import { PlayerStatusHUD } from "../src/game/PlayerStatusHUD";

describe("武器ごと独立マナシステム (Mana System)", () => {
  function createMockScene(): any {
    const groupMock = {
      get: vi.fn().mockReturnValue({
        setActive: vi.fn(),
        setVisible: vi.fn(),
        setDepth: vi.fn(),
        setScale: vi.fn(),
        setTint: vi.fn(),
        setVelocity: vi.fn(),
        setRotation: vi.fn(),
        setData: vi.fn(),
      }),
      getChildren: vi.fn().mockReturnValue([]),
      clear: vi.fn(),
    };
    return {
      physics: {
        add: {
          group: vi.fn().mockReturnValue(groupMock),
        },
      },
      add: {
        container: vi.fn().mockReturnValue({
          setDepth: vi.fn(),
          setVisible: vi.fn(),
          setPosition: vi.fn(),
          add: vi.fn(),
          destroy: vi.fn(),
        }),
        graphics: vi.fn().mockReturnValue({
          clear: vi.fn(),
          fillStyle: vi.fn(),
          fillRoundedRect: vi.fn(),
          fillRect: vi.fn(),
          lineStyle: vi.fn(),
          strokeRoundedRect: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          strokePath: vi.fn(),
        }),
      },
    };
  }

  const defaultBulletConfig = {
    speed: 720,
    fireRateMs: 140,
    maxBullets: 100,
    damage: 10,
  };

  it("初期状態で各武器が独立した最大マナを保持している", () => {
    const manager = new BulletManager(defaultBulletConfig);
    expect(manager.getMana("normal")).toBe(WEAPON_DEFINITIONS.normal.maxMana);
    expect(manager.getMana("spread")).toBe(WEAPON_DEFINITIONS.spread.maxMana);
    expect(manager.getMana("heavy")).toBe(WEAPON_DEFINITIONS.heavy.maxMana);
    expect(manager.getMana("rapid")).toBe(WEAPON_DEFINITIONS.rapid.maxMana);
  });

  it("各武器の発数分割数 (maxMana / manaCost) が正しく計算される", () => {
    const manager = new BulletManager(defaultBulletConfig);
    expect(manager.getManaSegments("normal")).toBe(20); // 100 / 5 = 20
    expect(manager.getManaSegments("spread")).toBe(10); // 100 / 10 = 10
    expect(manager.getManaSegments("heavy")).toBe(7); // 100 / 14.3 ≒ 7
    expect(manager.getManaSegments("rapid")).toBe(40); // 100 / 2.5 = 40
  });

  it("弾を発射した時に現在武器のマナのみが消費され、他武器のマナは減らない", () => {
    const manager = new BulletManager(defaultBulletConfig);
    const mockScene = createMockScene();
    manager.init(mockScene);

    manager.setWeapon("normal");
    const normalInitial = manager.getMana("normal");
    const spreadInitial = manager.getMana("spread");

    const fired = manager.fire(100, 100, 0, 1000);
    expect(fired).toBe(true);

    const cost = WEAPON_DEFINITIONS.normal.manaCost;
    expect(manager.getMana("normal")).toBeCloseTo(normalInitial - cost, 2);
    // 他の武器のマナは減っていない
    expect(manager.getMana("spread")).toBe(spreadInitial);
  });

  it("マナが消費量未満の場合、canFire が false を返し弾が撃てない", () => {
    const manager = new BulletManager(defaultBulletConfig);
    const mockScene = createMockScene();
    manager.init(mockScene);

    manager.setWeapon("heavy");
    // heavy の消費量は 14.3 なので 10 に設定して不足させる
    manager.setMana("heavy", 10);

    expect(manager.canFire(1000)).toBe(false);
    const fired = manager.fire(100, 100, 0, 1000);
    expect(fired).toBe(false);
    // マナは消費されない
    expect(manager.getMana("heavy")).toBe(10);
  });

  it("常時回復で、非装備中の武器も含めて全武器が時間経過で自然回復する", () => {
    const manager = new BulletManager(defaultBulletConfig);
    const mockScene = createMockScene();
    manager.init(mockScene);

    // 全武器のマナを一度減らす
    manager.setMana("normal", 50);
    manager.setMana("spread", 50);
    manager.setMana("heavy", 50);
    manager.setMana("rapid", 50);

    // 現在装備は normal
    manager.setWeapon("normal");

    // 1秒経過 (deltaMs = 1000)
    manager.update(0, 0, 4000, 1000);

    // 各武器の回復量分だけ回復していること
    expect(manager.getMana("normal")).toBeCloseTo(
      50 + WEAPON_DEFINITIONS.normal.manaRecoveryPerSecond,
      1,
    );
    expect(manager.getMana("spread")).toBeCloseTo(
      50 + WEAPON_DEFINITIONS.spread.manaRecoveryPerSecond,
      1,
    );
    expect(manager.getMana("heavy")).toBeCloseTo(
      50 + WEAPON_DEFINITIONS.heavy.manaRecoveryPerSecond,
      1,
    );
    expect(manager.getMana("rapid")).toBeCloseTo(
      50 + WEAPON_DEFINITIONS.rapid.manaRecoveryPerSecond,
      1,
    );
  });

  it("常時回復しても最大マナ (maxMana) を超えない", () => {
    const manager = new BulletManager(defaultBulletConfig);
    const mockScene = createMockScene();
    manager.init(mockScene);

    manager.setMana("normal", 95);
    // 10秒経過 (大幅にオーバー回復)
    manager.update(0, 0, 4000, 10000);

    expect(manager.getMana("normal")).toBe(WEAPON_DEFINITIONS.normal.maxMana);
  });

  it("PlayerStatusHUD の setMp に snap=true を渡すと即座に反映される", () => {
    const hud = new PlayerStatusHUD();
    const mockScene = createMockScene();
    hud.init(mockScene);

    // 初期状態
    hud.setMp(100, 100);

    // 武器切り替えを想定して snap=true で 50/100 に変更
    hud.setMp(50, 100, 10, true);

    const resource = hud.getResource("mp");
    expect(resource.current).toBe(50);
    expect(resource.max).toBe(100);
  });
});
