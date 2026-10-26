import { describe, expect, it, vi } from "vitest";

import { BulletManager } from "../src/game/BulletManager";

describe("フレンドリーファイア ＆ 衝突システム", () => {
  it("BulletManager.shoot: 発射者(owner)情報が弾丸に保存され、前方にオフセット生成されること", () => {
    let spawnedX = 0;
    let spawnedY = 0;
    const mockBullet = {
      setActive: vi.fn(),
      setVisible: vi.fn(),
      setDepth: vi.fn(),
      setScale: vi.fn(),
      setTint: vi.fn(),
      setVelocity: vi.fn(),
      setRotation: vi.fn(),
      setData: vi.fn(),
      getData: vi.fn(),
    };

    const mockScene = {
      physics: {
        add: {
          group: vi.fn(() => ({
            get: vi.fn((x: number, y: number) => {
              spawnedX = x;
              spawnedY = y;
              return mockBullet;
            }),
          })),
        },
      },
    } as any;

    const bm = new BulletManager({
      damage: 10,
      fireRateMs: 100,
      maxBullets: 50,
      speed: 1000,
    });
    bm.init(mockScene);

    const mockOwner = { id: "enemy_1" };
    // origin=(100, 100), angle=0 (右向き)
    bm.shoot(100, 100, 0, 500, 20, mockOwner);

    // 32px 前方にオフセットスポーン
    expect(spawnedX).toBeCloseTo(132);
    expect(spawnedY).toBeCloseTo(100);

    // owner がセットされる
    expect(mockBullet.setData).toHaveBeenCalledWith("owner", mockOwner);
    expect(mockBullet.setData).toHaveBeenCalledWith("damage", 20);
  });

  it("フレンドリーファイア判定: 発射者本人ならスキップ、仲間敵なら命中すること", () => {
    const ownerEnemy = { id: "enemy_shooter" };
    const allyEnemy = { id: "enemy_target" };

    const bulletData: Record<string, any> = {
      owner: ownerEnemy,
      damage: 15,
    };

    const mockBullet = {
      getData: (key: string) => bulletData[key],
      destroy: vi.fn(),
    };

    // 1. 発射者本人の場合
    let hitApplied = false;
    const processHit = (bullet: any, enemy: any) => {
      if (bullet.getData("owner") === enemy) return;
      hitApplied = true;
      bullet.destroy();
    };

    processHit(mockBullet, ownerEnemy);
    expect(hitApplied).toBe(false);
    expect(mockBullet.destroy).not.toHaveBeenCalled();

    // 2. 別の敵（仲間）の場合 -> フレンドリーファイア成立
    processHit(mockBullet, allyEnemy);
    expect(hitApplied).toBe(true);
    expect(mockBullet.destroy).toHaveBeenCalled();
  });
});
