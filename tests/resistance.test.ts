import { describe, expect, it } from "vitest";

import {
  calcEffectiveStunDuration,
  meterToTimeScale,
  resolveSlowProfile,
} from "../src/game/ai/resistance";

describe("09 CCデバフ・耐性・アイスメーター計算システム (resistance.ts)", () => {
  describe("calcEffectiveStunDuration", () => {
    it("耐性0の場合は100%のスタン時間を返すこと", () => {
      expect(calcEffectiveStunDuration(1000, 0)).toBe(1000);
      expect(calcEffectiveStunDuration(500, 0)).toBe(500);
    });

    it("耐性1〜99の場合は耐性に応じて短縮されたスタン時間を返すこと", () => {
      // 耐性20 -> 1000 * (1 - 0.2) = 800
      expect(calcEffectiveStunDuration(1000, 20)).toBeCloseTo(800);
      // 耐性50 -> 1000 * 0.5 = 500
      expect(calcEffectiveStunDuration(1000, 50)).toBeCloseTo(500);
      // 耐性80 -> 1000 * 0.2 = 200
      expect(calcEffectiveStunDuration(1000, 80)).toBeCloseTo(200);
    });

    it("耐性100の場合は0ms（完全耐性）を返すこと", () => {
      expect(calcEffectiveStunDuration(1000, 100)).toBe(0);
      expect(calcEffectiveStunDuration(5000, 100)).toBe(0);
    });

    it("耐性値が範囲外（負数または100超）のとき適切にクランプされること", () => {
      expect(calcEffectiveStunDuration(1000, -20)).toBe(1000); // 0にクランプ
      expect(calcEffectiveStunDuration(1000, 150)).toBe(0); // 100にクランプ
    });

    it("基礎スタン時間が0以下のときは0を返すこと", () => {
      expect(calcEffectiveStunDuration(0, 0)).toBe(0);
      expect(calcEffectiveStunDuration(-100, 0)).toBe(0);
    });
  });

  describe("resolveSlowProfile", () => {
    it("凍結ボーダー閾値は常に100であること", () => {
      expect(resolveSlowProfile(0).freezeThreshold).toBe(100);
      expect(resolveSlowProfile(50).freezeThreshold).toBe(100);
      expect(resolveSlowProfile(100).freezeThreshold).toBe(100);
    });

    it("耐性0のとき減衰速度は15/s、メーター上限は150であること（完全凍結可能＋超過持続あり）", () => {
      const profile = resolveSlowProfile(0);
      expect(profile.decayPerSec).toBe(15);
      expect(profile.maxIceMeter).toBe(150);
      expect(profile.maxIceMeter).toBeGreaterThanOrEqual(profile.freezeThreshold);
    });

    it("耐性100のとき減衰速度は60/s、メーター上限は50であること（完全凍結しない）", () => {
      const profile = resolveSlowProfile(100);
      expect(profile.decayPerSec).toBe(60);
      expect(profile.maxIceMeter).toBe(50);
      expect(profile.maxIceMeter).toBeLessThan(profile.freezeThreshold);
    });

    it("中間耐性で線形補間されること", () => {
      const profile = resolveSlowProfile(50);
      // Linear(15, 60, 0.5) = 37.5
      expect(profile.decayPerSec).toBeCloseTo(37.5);
      // Linear(150, 50, 0.5) = 100
      expect(profile.maxIceMeter).toBeCloseTo(100);
    });
  });

  describe("meterToTimeScale", () => {
    const threshold = 100;

    it("メーター0以下なら通常速度1.0 (100%)", () => {
      expect(meterToTimeScale(0, threshold)).toBe(1.0);
      expect(meterToTimeScale(-10, threshold)).toBe(1.0);
    });

    it("メーターが閾値以上なら凍結0.0 (0%)", () => {
      expect(meterToTimeScale(100, threshold)).toBe(0.0);
      expect(meterToTimeScale(150, threshold)).toBe(0.0);
    });

    it("0から閾値の間では比率に応じて滑らかに減速すること (1.0 - ratio)", () => {
      expect(meterToTimeScale(25, threshold)).toBeCloseTo(0.75);
      expect(meterToTimeScale(40, threshold)).toBeCloseTo(0.6);
      expect(meterToTimeScale(80, threshold)).toBeCloseTo(0.2);
    });
  });
});
