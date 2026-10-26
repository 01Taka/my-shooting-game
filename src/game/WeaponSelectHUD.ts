import type Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import {
  WEAPON_DEFINITIONS,
  WEAPON_HUD_DEPTH,
  WEAPON_HUD_DISTANCE,
  WEAPON_HUD_FADE_OUT_DURATION_MS,
  WEAPON_HUD_ITEM_RADIUS,
  WEAPON_HUD_NORMAL_SCALE,
  WEAPON_HUD_POP_HOLD_MS,
  WEAPON_HUD_POP_SCALE,
  WEAPON_HUD_SELECTED_SCALE,
  WEAPON_HUD_UNSELECTED_FADE_OUT_DURATION_MS,
  WEAPON_HUD_WHEEL_FADE_OUT_DURATION_MS,
  WEAPON_HUD_WHEEL_IDLE_DELAY_MS,
} from "../constants";
import { addCrispText } from "../utils/text";
import type { WeaponDefinition, WeaponDirection, WeaponType } from "./types";

interface HUDItemVisual {
  container: Phaser.GameObjects.Container;
  bgGraphics: Phaser.GameObjects.Graphics;
  nameText: Phaser.GameObjects.Text;
  dirText: Phaser.GameObjects.Text;
  definition: WeaponDefinition;
  direction: WeaponDirection;
  baseX: number;
  baseY: number;
}

/**
 * プレイヤー周囲に展開する十字型武器選択HUD
 * スティック入力に追従して4方向の武器をハイライトし、
 * 指を離した瞬間に選択された武器だけ一瞬残してフェードアウトする
 */
export class WeaponSelectHUD {
  protected scene!: Phaser.Scene;
  protected mainContainer!: Phaser.GameObjects.Container;
  protected items = new Map<WeaponDirection, HUDItemVisual>();
  protected isOpen = false;
  protected isClosing = false;
  protected selectedDirection: WeaponDirection | null = null;
  protected currentEquipped: WeaponType = "normal";
  protected wheelTimer?: Phaser.Time.TimerEvent;

  // 方向と相対座標（自機中心から距離 WEAPON_HUD_DISTANCE）
  protected readonly directionOffsets: Record<
    WeaponDirection,
    { x: number; y: number; dirLabel: string }
  > = {
    up: { x: 0, y: -WEAPON_HUD_DISTANCE, dirLabel: "▲" },
    right: { x: WEAPON_HUD_DISTANCE, y: 0, dirLabel: "▶" },
    down: { x: 0, y: WEAPON_HUD_DISTANCE, dirLabel: "▼" },
    left: { x: -WEAPON_HUD_DISTANCE, y: 0, dirLabel: "◀" },
  };

  /**
   * HUDの生成・初期化
   */
  init(scene: Phaser.Scene): void {
    this.scene = scene;
    this.mainContainer = scene.add.container(0, 0);
    this.mainContainer.setDepth(WEAPON_HUD_DEPTH);
    this.mainContainer.setVisible(false);
    this.mainContainer.setAlpha(0);

    // 4方向のアイテムコンテナを作成
    const entries = Object.values(WEAPON_DEFINITIONS);
    for (const def of entries) {
      const offset = this.directionOffsets[def.direction];
      const itemContainer = scene.add.container(offset.x, offset.y);

      const bgGraphics = scene.add.graphics();
      itemContainer.add(bgGraphics);

      // 方向アイコンテキスト
      const dirText = addCrispText(scene, 0, -13, offset.dirLabel, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#94a3b8",
        fontStyle: "bold",
      }).setOrigin(0.5);
      itemContainer.add(dirText);

      // 武器名テキスト
      const nameText = addCrispText(scene, 0, 7, def.shortName, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
      }).setOrigin(0.5);
      itemContainer.add(nameText);

      this.mainContainer.add(itemContainer);

      const itemVisual: HUDItemVisual = {
        container: itemContainer,
        bgGraphics,
        nameText,
        dirText,
        definition: def,
        direction: def.direction,
        baseX: offset.x,
        baseY: offset.y,
      };

      this.items.set(def.direction, itemVisual);
      this.drawItemGraphics(itemVisual, false, def.type === this.currentEquipped);
    }
  }

  /**
   * アイテムグラフィックスの描画
   */
  protected drawItemGraphics(item: HUDItemVisual, isSelected: boolean, isEquipped: boolean): void {
    const g = item.bgGraphics;
    g.clear();

    const r = WEAPON_HUD_ITEM_RADIUS;
    const themeColor = item.definition.themeColor;

    if (isSelected) {
      // 選択中ハイライト: 明るいグラデーション感・二重発光ボーダー
      g.fillStyle(0x0f172a, 0.9);
      g.fillCircle(0, 0, r);

      // 外周グロー枠
      g.lineStyle(4, themeColor, 0.95);
      g.strokeCircle(0, 0, r + 2);

      // 内周アクセント枠
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeCircle(0, 0, r - 3);

      item.nameText.setColor("#ffffff");
      item.dirText.setColor("#facc15");
    } else {
      // 通常時
      g.fillStyle(0x090d16, 0.7);
      g.fillCircle(0, 0, r);

      if (isEquipped) {
        // 現在装備中の武器にはカラー枠
        g.lineStyle(2.5, themeColor, 0.85);
        g.strokeCircle(0, 0, r);
        item.nameText.setColor("#ffffff");
        item.dirText.setColor("#38bdf8");
      } else {
        // 未装備武器
        g.lineStyle(1.5, 0x475569, 0.7);
        g.strokeCircle(0, 0, r);
        item.nameText.setColor("#94a3b8");
        item.dirText.setColor("#64748b");
      }
    }
  }

  /**
   * スティックを触り始めたときにHUDを展開
   */
  open(currentWeapon: WeaponType, playerX: number, playerY: number): void {
    this.wheelTimer?.remove(false);
    this.wheelTimer = undefined;

    if (this.isClosing) {
      this.scene.tweens.killTweensOf(this.mainContainer);
      for (const item of this.items.values()) {
        this.scene.tweens.killTweensOf(item.container);
      }
      this.isClosing = false;
    }

    this.currentEquipped = currentWeapon;
    this.selectedDirection = null;
    this.isOpen = true;
    this.mainContainer.setPosition(playerX, playerY);
    this.mainContainer.setVisible(true);

    // 各アイテムを初期状態にリセット
    for (const item of this.items.values()) {
      item.container.setScale(WEAPON_HUD_NORMAL_SCALE);
      item.container.setAlpha(1);
      this.drawItemGraphics(item, false, item.definition.type === currentWeapon);
    }

    // スムーズな出現アニメーション（フェードイン＋わずかなスケールアップ）
    this.mainContainer.setScale(0.85);
    this.mainContainer.setAlpha(0);

    this.scene.tweens.add({
      targets: this.mainContainer,
      scale: 1.0,
      alpha: 1.0,
      duration: 120,
      ease: "Cubic.Out",
    });
  }

  /**
   * スティックの傾きに応じた選択更新
   */
  updateStickInput(angle: number, force: number, isDeadZone: boolean): void {
    if (!this.isOpen || this.isClosing) return;

    let targetDir: WeaponDirection | null = null;

    if (!isDeadZone && force >= 0.25) {
      // 角度から4方向（上下左右）を判定
      // 上 (UP)
      // 右 (RIGHT)
      // 下 (DOWN)
      // 左 (LEFT)
      const pi = Math.PI;
      if (angle >= -0.75 * pi && angle < -0.25 * pi) {
        targetDir = "up";
      } else if (angle >= -0.25 * pi && angle < 0.25 * pi) {
        targetDir = "right";
      } else if (angle >= 0.25 * pi && angle < 0.75 * pi) {
        targetDir = "down";
      } else {
        targetDir = "left";
      }
    }

    if (this.selectedDirection !== targetDir) {
      const prevDir = this.selectedDirection;
      this.selectedDirection = targetDir;

      // 前に選択されていたアイテムを通常状態に戻す
      if (prevDir) {
        const prevItem = this.items.get(prevDir);
        if (prevItem) {
          this.drawItemGraphics(prevItem, false, prevItem.definition.type === this.currentEquipped);
          this.scene.tweens.add({
            targets: prevItem.container,
            scale: WEAPON_HUD_NORMAL_SCALE,
            duration: 90,
            ease: "Quad.Out",
          });
        }
      }

      // 新たに選択されたアイテムをハイライト＆拡大
      if (targetDir) {
        const newItem = this.items.get(targetDir);
        if (newItem) {
          this.drawItemGraphics(newItem, true, newItem.definition.type === this.currentEquipped);
          this.scene.tweens.add({
            targets: newItem.container,
            scale: WEAPON_HUD_SELECTED_SCALE,
            duration: 110,
            ease: "Back.Out",
          });
          AudioManager.getInstance().playSE("laser", { detune: 600 });
        }
      }
    }
  }

  /**
   * スティックを離したときの武器確定＆終了アニメーション
   * 選択された武器のHUDだけ一瞬残して素早くフェードアウトする
   */
  closeAndSelect(): WeaponType | null {
    if (!this.isOpen || this.isClosing) return null;

    this.isOpen = false;
    this.isClosing = true;

    const chosenDir = this.selectedDirection;

    if (chosenDir) {
      const chosenItem = this.items.get(chosenDir);
      if (chosenItem) {
        const newWeapon = chosenItem.definition.type;
        this.currentEquipped = newWeapon;

        // 1. 選択されなかった他のアイテムを素早くフェードアウト
        for (const [dir, item] of this.items.entries()) {
          if (dir !== chosenDir) {
            this.scene.tweens.add({
              targets: item.container,
              alpha: 0,
              scale: 0.75,
              duration: WEAPON_HUD_UNSELECTED_FADE_OUT_DURATION_MS,
              ease: "Quad.In",
            });
          }
        }

        // 2. 選択された武器だけ一瞬残すポップ演出（拡大→ホールド→素早くフェードアウト）
        this.scene.tweens.add({
          targets: chosenItem.container,
          scale: WEAPON_HUD_POP_SCALE,
          duration: 90,
          ease: "Back.Out",
          onComplete: () => {
            // ホールド後に素早くフェードアウト
            this.scene.time.delayedCall(WEAPON_HUD_POP_HOLD_MS, () => {
              this.scene.tweens.add({
                targets: chosenItem.container,
                alpha: 0,
                scale: 1.1,
                duration: WEAPON_HUD_FADE_OUT_DURATION_MS,
                ease: "Cubic.In",
                onComplete: () => {
                  this.finishClosing();
                },
              });
            });
          },
        });

        // 決定SE
        AudioManager.getInstance().playSE("laser", { detune: 900 });
        return newWeapon;
      }
    }

    // デッドゾーンのまま離した（キャンセル時）: 全体を素早くフェードアウト
    this.scene.tweens.add({
      targets: this.mainContainer,
      alpha: 0,
      scale: 0.9,
      duration: 100,
      ease: "Quad.In",
      onComplete: () => {
        this.finishClosing();
      },
    });

    return null;
  }

  /**
   * 即時切り替え（PCのキーボード入力等で使用、一瞬選択アニメーションを表示）
   */
  showQuickSwitchFeedback(weapon: WeaponType, playerX: number, playerY: number): void {
    if (this.isClosing) {
      this.scene.tweens.killTweensOf(this.mainContainer);
      for (const item of this.items.values()) {
        this.scene.tweens.killTweensOf(item.container);
      }
    }

    const targetDef = WEAPON_DEFINITIONS[weapon];
    const targetItem = this.items.get(targetDef.direction);
    if (!targetItem) return;

    this.currentEquipped = weapon;
    this.isOpen = false;
    this.isClosing = true;
    this.mainContainer.setPosition(playerX, playerY);
    this.mainContainer.setVisible(true);
    this.mainContainer.setAlpha(1);
    this.mainContainer.setScale(1);

    // 対象以外の全アイテムを非表示
    for (const [dir, item] of this.items.entries()) {
      if (dir === targetDef.direction) {
        item.container.setVisible(true);
        item.container.setAlpha(1);
        item.container.setScale(WEAPON_HUD_NORMAL_SCALE);
        this.drawItemGraphics(item, true, true);
      } else {
        item.container.setVisible(false);
      }
    }

    // ポップして素早くフェードアウト
    this.scene.tweens.add({
      targets: targetItem.container,
      scale: WEAPON_HUD_POP_SCALE,
      duration: 80,
      ease: "Back.Out",
      onComplete: () => {
        this.scene.time.delayedCall(WEAPON_HUD_POP_HOLD_MS, () => {
          this.scene.tweens.add({
            targets: targetItem.container,
            alpha: 0,
            scale: 1.1,
            duration: WEAPON_HUD_FADE_OUT_DURATION_MS,
            ease: "Cubic.In",
            onComplete: () => {
              this.finishClosing();
            },
          });
        });
      },
    });

    AudioManager.getInstance().playSE("laser", { detune: 850 });
  }

  /**
   * マウスホイールまたはキーボード操作による武器切り替えHUD表示
   * - すべての選択肢を同時に表示（選択中の武器をハイライト）
   * - ホイール停止後、一定時間経過したらシンプルに全体を同時にフェードアウト
   */
  showWheelSwitch(weapon: WeaponType, playerX: number, playerY: number): void {
    // 既存の待機タイマーをリセット
    this.wheelTimer?.remove(false);
    this.wheelTimer = undefined;

    // 進行中のフェードアウトTweensを強制終了
    this.scene.tweens.killTweensOf(this.mainContainer);

    const targetDef = WEAPON_DEFINITIONS[weapon];
    this.currentEquipped = weapon;
    this.selectedDirection = targetDef.direction;
    this.isOpen = true;
    this.isClosing = false;

    this.mainContainer.setPosition(playerX, playerY);
    this.mainContainer.setVisible(true);
    this.mainContainer.setAlpha(1);
    this.mainContainer.setScale(1);

    // すべての選択肢を同時に表示し、選択中の武器をハイライト
    for (const [dir, item] of this.items.entries()) {
      item.container.setVisible(true);
      item.container.setAlpha(1);

      if (dir === targetDef.direction) {
        item.container.setScale(WEAPON_HUD_SELECTED_SCALE);
        this.drawItemGraphics(item, true, true);
      } else {
        item.container.setScale(WEAPON_HUD_NORMAL_SCALE);
        this.drawItemGraphics(item, false, false);
      }
    }

    // ホイール停止後、シンプルに全体を同時にフェードアウト
    this.wheelTimer = this.scene.time.delayedCall(WEAPON_HUD_WHEEL_IDLE_DELAY_MS, () => {
      this.isClosing = true;
      this.scene.tweens.add({
        targets: this.mainContainer,
        alpha: 0,
        duration: WEAPON_HUD_WHEEL_FADE_OUT_DURATION_MS,
        ease: "Quad.In",
        onComplete: () => {
          this.finishClosing();
        },
      });
    });
  }

  /**
   * 毎フレームプレイヤー位置へHUDを追従
   */
  updatePosition(playerX: number, playerY: number): void {
    if (this.isOpen || this.isClosing) {
      this.mainContainer.setPosition(playerX, playerY);
    }
  }

  /**
   * 終了時のクリーンアップ
   */
  protected finishClosing(): void {
    this.isClosing = false;
    this.isOpen = false;
    this.selectedDirection = null;
    this.mainContainer.setVisible(false);
    this.mainContainer.setAlpha(0);
    this.mainContainer.setScale(1);

    for (const item of this.items.values()) {
      item.container.setVisible(true);
      item.container.setAlpha(1);
      item.container.setScale(WEAPON_HUD_NORMAL_SCALE);
      this.drawItemGraphics(item, false, item.definition.type === this.currentEquipped);
    }
  }

  /**
   * 破棄処理
   */
  destroy(): void {
    this.wheelTimer?.remove(false);
    this.wheelTimer = undefined;

    if (this.scene) {
      this.scene.tweens.killTweensOf(this.mainContainer);
      for (const item of this.items.values()) {
        this.scene.tweens.killTweensOf(item.container);
      }
    }
    this.mainContainer.destroy(true);
  }
}
