import { describe, expect, it, vi } from "vitest";

import { PLAYER_SPEED } from "../src/constants";
import { PlayerController } from "../src/game/PlayerController";

describe("PlayerController 移動速度（スティック傾きに関わらず最高速）", () => {
  function createMockPlayer(): any {
    return {
      x: 100,
      y: 100,
      setVelocity: vi.fn(),
      setRotation: vi.fn(),
      setTexture: vi.fn(),
      setScale: vi.fn(),
      texture: { key: "player_right" },
      active: true,
    };
  }

  function createMockScene(): any {
    return {
      input: {
        keyboard: null,
        activePointer: { isDown: false, worldX: 0, worldY: 0 },
      },
    };
  }

  it("スティックの傾きが小さくても (x=0.2, y=0)、常に最高速度 (PLAYER_SPEED) で移動する", () => {
    const controller = new PlayerController({ speed: PLAYER_SPEED });
    const mockScene = createMockScene();
    controller.init(mockScene);

    controller.setVirtualInput({
      move: { x: 0.2, y: 0, active: true, angle: 0, force: 0.2 },
      lockOn: { x: 0, y: 0, active: false, angle: 0, force: 0 },
      attack: false,
    });

    const player = createMockPlayer();
    controller.update(mockScene, player, null, vi.fn());

    expect(player.setVelocity).toHaveBeenCalledWith(PLAYER_SPEED, 0);
  });

  it("斜め入力時も単位ベクトルに正規化され、合成速度が PLAYER_SPEED と等しくなる", () => {
    const controller = new PlayerController({ speed: PLAYER_SPEED });
    const mockScene = createMockScene();
    controller.init(mockScene);

    // 斜め45度方向
    controller.setVirtualInput({
      move: { x: 0.5, y: 0.5, active: true, angle: Math.PI / 4, force: 0.707 },
      lockOn: { x: 0, y: 0, active: false, angle: 0, force: 0 },
      attack: false,
    });

    const player = createMockPlayer();
    controller.update(mockScene, player, null, vi.fn());

    const expectedSpeed = PLAYER_SPEED * Math.SQRT1_2;
    expect(player.setVelocity).toHaveBeenCalledWith(
      expect.closeTo(expectedSpeed, 2),
      expect.closeTo(expectedSpeed, 2),
    );
  });

  it("攻撃（ロックオン）スティックの操作中・傾きに関わらず、移動は最高速度を維持する", () => {
    const controller = new PlayerController({ speed: PLAYER_SPEED });
    const mockScene = createMockScene();
    controller.init(mockScene);

    // 移動スティックは左上、攻撃スティックは右下に入力
    controller.setVirtualInput({
      move: { x: -0.1, y: 0, active: true, angle: Math.PI, force: 0.1 },
      lockOn: { x: 0.9, y: 0.9, active: true, angle: Math.PI / 4, force: 1.0 },
      attack: true,
    });

    const player = createMockPlayer();
    controller.update(mockScene, player, null, vi.fn());

    // 攻撃スティックの傾きに関わらず、左への最高速度 -PLAYER_SPEED
    expect(player.setVelocity).toHaveBeenCalledWith(-PLAYER_SPEED, 0);
  });
});
