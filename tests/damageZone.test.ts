import { describe, expect, it } from "vitest";

import {
  CircleShape,
  ConeShape,
  DamageZone,
  DamageZoneManager,
  OrientedBoxShape,
  type ShapeContext,
} from "../src/game/damageZone";

describe("ダメージゾーンシステム (DamageZone)", () => {
  describe("形状判定: CircleShape", () => {
    it("点および円との内外判定が正しく行われること", () => {
      const circle = new CircleShape();
      const ctx: ShapeContext = {
        x: 100,
        y: 100,
        angleRad: 0,
        size: 50, // 半径 50
        elapsedMs: 0,
      };

      // 中心点 (100, 100) -> 含まれる
      expect(circle.containsPoint({ x: 100, y: 100 }, ctx)).toBe(true);
      // 距離 30 (130, 100) -> 含まれる
      expect(circle.containsPoint({ x: 130, y: 100 }, ctx)).toBe(true);
      // 距離 60 (160, 100) -> 含まれない
      expect(circle.containsPoint({ x: 160, y: 100 }, ctx)).toBe(false);

      // 半径20の円 (160, 100): 100+50=150, 160-20=140 なので交差する
      expect(circle.intersectsCircle({ x: 160, y: 100 }, 20, ctx)).toBe(true);
      // 半径10の円 (180, 100): 180-10=170 > 150 なので交差しない
      expect(circle.intersectsCircle({ x: 180, y: 100 }, 10, ctx)).toBe(false);
    });

    it("radiusGrowthPerSec により時間経過で影響範囲が拡大すること", () => {
      const circle = new CircleShape({ radiusGrowthPerSec: 100 });
      const ctx: ShapeContext = {
        x: 0,
        y: 0,
        angleRad: 0,
        size: 50,
        elapsedMs: 1000, // 1秒経過 -> 半径 50 + 100 = 150
      };

      expect(circle.getEffectiveRadius(ctx)).toBe(150);
      expect(circle.containsPoint({ x: 120, y: 0 }, ctx)).toBe(true);
    });
  });

  describe("形状判定: ConeShape (扇形)", () => {
    it("扇形の角度内かつ半径内の判定が正しく行われること", () => {
      // 右向き (0 rad)、開き角 90度 (Math.PI / 2)
      const cone = new ConeShape({ arcAngleRad: Math.PI / 2 });
      const ctx: ShapeContext = {
        x: 0,
        y: 0,
        angleRad: 0,
        size: 100,
        elapsedMs: 0,
      };

      // 前方 50px (50, 0) -> 含まれる
      expect(cone.containsPoint({ x: 50, y: 0 }, ctx)).toBe(true);
      // 斜め前方 30度 (angle = 30° < 45°) -> 含まれる
      expect(cone.containsPoint({ x: 40, y: 20 }, ctx)).toBe(true);
      // 後方 (-50, 0) -> 角度外なので含まれない
      expect(cone.containsPoint({ x: -50, y: 0 }, ctx)).toBe(false);
      // 90度真上 (0, 50) -> 角度 90° > 45° なので含まれない
      expect(cone.containsPoint({ x: 0, y: 50 }, ctx)).toBe(false);
      // 距離 150px -> 半径外なので含まれない
      expect(cone.containsPoint({ x: 150, y: 0 }, ctx)).toBe(false);
    });
  });

  describe("形状判定: OrientedBoxShape (回転矩形)", () => {
    it("向きを持った矩形の内外および円交差判定が正しく行われること", () => {
      // 進行方向長さ 100 (halfLength = 50), 幅 40 (halfWidth = 20)
      const box = new OrientedBoxShape({ lengthRatio: 1.0, widthRatio: 0.4 });
      const ctx: ShapeContext = {
        x: 0,
        y: 0,
        angleRad: 0, // 右向き
        size: 100,
        elapsedMs: 0,
      };

      // 内部点 (30, 10)
      expect(box.containsPoint({ x: 30, y: 10 }, ctx)).toBe(true);
      // 幅外 (30, 25 > 20)
      expect(box.containsPoint({ x: 30, y: 25 }, ctx)).toBe(false);
      // 長さ外 (60 > 50, 0)
      expect(box.containsPoint({ x: 60, y: 0 }, ctx)).toBe(false);

      // 円との交差 (60, 0, radius = 15): 60-15=45 < 50 なので交差
      expect(box.intersectsCircle({ x: 60, y: 0 }, 15, ctx)).toBe(true);
      // 円との非交差 (80, 0, radius = 10): 80-10=70 > 50
      expect(box.intersectsCircle({ x: 80, y: 0 }, 10, ctx)).toBe(false);
    });
  });

  describe("DamageZone ヒット制限・間隔・寿命・追従", () => {
    it("maxHitsPerTarget: 1 の場合、1回ヒットすると次回以降はヒット不可になること", () => {
      const zone = new DamageZone({
        shape: new CircleShape(),
        faction: "enemy",
        maxHitsPerTarget: 1,
        effect: { damage: 10 },
      });

      const target = { id: "player" };
      expect(zone.canHit(target, 1000)).toBe(true);

      zone.recordHit(target, 1000);
      expect(zone.canHit(target, 1000)).toBe(false);
      expect(zone.canHit(target, 2000)).toBe(false);
    });

    it("damageIntervalMs: 設定された間隔が経過するまで再ヒット不可であること", () => {
      const zone = new DamageZone({
        shape: new CircleShape(),
        faction: "enemy",
        maxHitsPerTarget: -1, // 無制限
        damageIntervalMs: 500, // 500ms間隔
        effect: { damage: 5 },
      });

      const target = { id: "player" };
      // 1回目 (時刻 1000)
      expect(zone.canHit(target, 1000)).toBe(true);
      zone.recordHit(target, 1000);

      // 時刻 1200 (200ms経過 < 500ms): 不可
      expect(zone.canHit(target, 1200)).toBe(false);

      // 時刻 1500 (500ms経過): 再び可能
      expect(zone.canHit(target, 1500)).toBe(true);
      zone.recordHit(target, 1500);

      // 時刻 1600 (100ms経過): 不可
      expect(zone.canHit(target, 1600)).toBe(false);
    });

    it("durationMs: 持続時間を超えると update で自動破棄されること", () => {
      const zone = new DamageZone({
        shape: new CircleShape(),
        faction: "enemy",
        durationMs: 300,
        effect: { damage: 10 },
      });

      expect(zone.isActive).toBe(true);

      // 200ms 経過
      const alive1 = zone.update(200);
      expect(alive1).toBe(true);
      expect(zone.isActive).toBe(true);

      // さらに 150ms 経過 (計 350ms >= 300ms)
      const alive2 = zone.update(150);
      expect(alive2).toBe(false);
      expect(zone.isActive).toBe(false);
    });

    it("attachTo: 追従元オブジェクトの座標・向きが毎フレーム自動同期されること", () => {
      const host = { x: 100, y: 200, rotation: Math.PI / 4 };
      const zone = new DamageZone({
        shape: new CircleShape(),
        faction: "enemy",
        attachTo: host,
        effect: { damage: 10 },
      });

      expect(zone.x).toBe(100);
      expect(zone.y).toBe(200);
      expect(zone.angleRad).toBeCloseTo(Math.PI / 4);

      // 宿主が移動
      host.x = 250;
      host.y = 400;
      host.rotation = Math.PI;

      zone.update(16);
      expect(zone.x).toBe(250);
      expect(zone.y).toBe(400);
      expect(zone.angleRad).toBeCloseTo(Math.PI);
    });
  });

  describe("DamageZoneManager 総合判定＆効果伝達", () => {
    it("敵陣営ゾーンがプレイヤーにヒットし、ダメージ適用コールバックが呼ばれること", () => {
      const manager = new DamageZoneManager();
      let damagedAmount = 0;

      // (50, 50) に半径 40 の敵ゾーン
      manager.createZone({
        shape: new CircleShape(),
        faction: "enemy",
        x: 50,
        y: 50,
        size: 40,
        effect: { damage: 25, slowAmount: 30, stunDurationMs: 500 },
      });

      const player = { x: 60, y: 50, radius: 20 }; // 重なる位置

      manager.update(
        16,
        {
          player,
          onDamagePlayer: (amount) => {
            damagedAmount += amount;
          },
        },
        1000,
      );

      expect(damagedAmount).toBe(25);
    });

    it("敵陣営ゾーンが敵自身を攻撃しないこと（デフォルトの敵対フィルタ）", () => {
      const manager = new DamageZoneManager();
      let enemyDamaged = false;

      manager.createZone({
        shape: new CircleShape(),
        faction: "enemy",
        x: 100,
        y: 100,
        size: 50,
        effect: { damage: 20 },
      });

      const enemy = { x: 100, y: 100, active: true, radius: 20 };

      manager.update(
        16,
        {
          enemies: [enemy],
          onDamageEnemy: () => {
            enemyDamaged = true;
          },
        },
        1000,
      );

      // デフォルトでは enemy ゾーンは player のみを対象とするため、enemy には当たらない
      expect(enemyDamaged).toBe(false);
    });

    it("targetFilter: 'all' を指定すると、敵も巻き込むトラップゾーンになること", () => {
      const manager = new DamageZoneManager();
      let enemyDamagedAmount = 0;

      manager.createZone({
        shape: new CircleShape(),
        faction: "neutral",
        targetFilter: "all",
        x: 100,
        y: 100,
        size: 50,
        effect: { damage: 50 },
      });

      const enemy = { x: 100, y: 100, active: true, radius: 20 };

      manager.update(
        16,
        {
          enemies: [enemy],
          onDamageEnemy: (_e, amount) => {
            enemyDamagedAmount += amount;
          },
        },
        1000,
      );

      expect(enemyDamagedAmount).toBe(50);
    });
  });
});
