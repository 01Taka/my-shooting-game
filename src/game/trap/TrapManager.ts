import type Phaser from "phaser";

import type { DamageZoneManager } from "../damageZone/DamageZoneManager";
import type { TargetContext } from "../damageZone/types";
import { ensureTrapTextures } from "./textures";
import { Trap } from "./Trap";
import type { TrapConfig } from "./types";

/**
 * トラップ管理マネージャー (TrapManager)
 * フィールド上の全トラップ（継続エリア型・感知起爆型）の登録・毎フレーム更新・ライフサイクル管理を担当
 */
export class TrapManager {
  private traps: Trap[] = [];
  private scene?: Phaser.Scene;
  private damageZoneManager?: DamageZoneManager;

  constructor(scene?: Phaser.Scene, damageZoneManager?: DamageZoneManager) {
    if (scene && damageZoneManager) {
      this.init(scene, damageZoneManager);
    }
  }

  /**
   * シーンとダメージゾーンマネージャーの初期化
   */
  public init(scene: Phaser.Scene, damageZoneManager: DamageZoneManager): void {
    this.scene = scene;
    this.damageZoneManager = damageZoneManager;
    ensureTrapTextures(scene);
  }

  /**
   * 新しいトラップを生成して登録する
   */
  public createTrap(config: TrapConfig): Trap {
    if (!this.scene || !this.damageZoneManager) {
      throw new Error("TrapManager must be initialized before creating traps");
    }

    ensureTrapTextures(this.scene);
    const trap = new Trap(this.scene, this.damageZoneManager, config);
    this.traps.push(trap);
    return trap;
  }

  /**
   * 毎フレームのトラップ更新処理
   */
  public update(delta: number, context: TargetContext): void {
    if (this.traps.length === 0) return;

    for (let i = this.traps.length - 1; i >= 0; i--) {
      const trap = this.traps[i];
      if (!trap.update(delta, context)) {
        this.traps.splice(i, 1);
      }
    }
  }

  /**
   * 現在アクティブな全トラップの取得（テストやデバッグ用）
   */
  public getTraps(): readonly Trap[] {
    return this.traps;
  }

  /**
   * トラップのクリアおよびリソース解放
   */
  public destroy(): void {
    for (const trap of this.traps) {
      trap.destroy();
    }
    this.traps = [];
  }
}
