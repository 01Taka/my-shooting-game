import Phaser from "phaser";

import {
  HUD_HP_RATIO_HIGH,
  HUD_HP_RATIO_MID,
  PLAYER_HUD_BAR_RADIUS,
  PLAYER_HUD_BAR_SPACING,
  PLAYER_HUD_BG_ALPHA,
  PLAYER_HUD_BG_COLOR,
  PLAYER_HUD_BLINK_BORDER_READY_COLOR,
  PLAYER_HUD_BLINK_BOTTOM,
  PLAYER_HUD_BLINK_READY_BOTTOM,
  PLAYER_HUD_BLINK_READY_TOP,
  PLAYER_HUD_BLINK_SPACING_X,
  PLAYER_HUD_BLINK_TOP,
  PLAYER_HUD_BLINK_WIDTH,
  PLAYER_HUD_BORDER_ALPHA,
  PLAYER_HUD_BORDER_COLOR,
  PLAYER_HUD_DEPTH,
  PLAYER_HUD_GLOSS_ALPHA,
  PLAYER_HUD_GLOSS_COLOR,
  PLAYER_HUD_HP_BAR_HEIGHT,
  PLAYER_HUD_HP_HIGH_BOTTOM,
  PLAYER_HUD_HP_HIGH_TOP,
  PLAYER_HUD_HP_LOW_BOTTOM,
  PLAYER_HUD_HP_LOW_TOP,
  PLAYER_HUD_HP_MID_BOTTOM,
  PLAYER_HUD_HP_MID_TOP,
  PLAYER_HUD_HP_MP_WIDTH,
  PLAYER_HUD_MP_BAR_HEIGHT,
  PLAYER_HUD_MP_BOTTOM,
  PLAYER_HUD_MP_TOP,
  PLAYER_HUD_OFFSET_Y,
} from "../constants";

/**
 * 2色のRGB値を比率 t (0.0 〜 1.0) で線形補間する関数
 */
function interpolateColor(color1: number, color2: number, t: number): number {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;

  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return (r << 16) | (g << 8) | b;
}

/**
 * リソース（HP, MP, ブリンク等）の共通ステータスインターフェース
 */
export interface ResourceValue {
  current: number;
  max: number;
}

/**
 * サポートするリソース種別
 */
export type ResourceType = "hp" | "mp" | "blink";

/**
 * プレイヤー頭上追従ステータスHUD
 * - HPバー（横長・上段）
 * - MPバー（横長・下段）
 * - ブリンクバー（右隣・短く太い縦型クリスタル柱）
 *
 * 将来のMP・ブリンク機能追加に備え、すべてのリソースを共通形式（current / max）で操作可能なAPIを提供
 */
export class PlayerStatusHUD {
  private container!: Phaser.GameObjects.Container;
  private graphics!: Phaser.GameObjects.Graphics;

  // 各リソースの共通管理テーブル
  private resources: Record<ResourceType, ResourceValue> = {
    hp: { current: 100, max: 100 },
    mp: { current: 100, max: 100 },
    blink: { current: 2, max: 2 },
  };

  // ブリンクの分割数（ストック数、デフォルト2段）
  private blinkSegments = 2;

  // 描画補間用比率（0.0 〜 1.0）
  private displayRatios: Record<ResourceType, number> = {
    hp: 1.0,
    mp: 1.0,
    blink: 1.0,
  };

  /**
   * HUDコンテナおよびグラフィックスの初期化
   */
  init(scene: Phaser.Scene): void {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(PLAYER_HUD_DEPTH);

    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);
  }

  // ==========================================
  // 共通リソース更新 API
  // ==========================================

  /**
   * 任意のリソースの現在値・最大値を更新（共通形式）
   */
  setResource(type: ResourceType, current: number, max: number): void {
    const safeMax = Math.max(1, max);
    const safeCurrent = Math.max(0, Math.min(safeMax, current));

    this.resources[type] = {
      current: safeCurrent,
      max: safeMax,
    };
  }

  /**
   * 現在のリソース情報を取得
   */
  getResource(type: ResourceType): Readonly<ResourceValue> {
    return this.resources[type];
  }

  /**
   * HPの更新（ショートカットAPI）
   */
  setHp(current: number, max: number): void {
    this.setResource("hp", current, max);
  }

  /**
   * MPの更新（ショートカットAPI）
   */
  setMp(current: number, max: number): void {
    this.setResource("mp", current, max);
  }

  /**
   * ブリンクエネルギーの更新（ショートカットAPI）
   * @param current 現在のチャージ量またはストック数
   * @param max 最大チャージ量または最大ストック数
   * @param segments 表示分割数（省略時は max を使用）
   */
  setBlink(current: number, max: number, segments?: number): void {
    this.setResource("blink", current, max);
    if (typeof segments === "number" && segments > 0) {
      this.blinkSegments = segments;
    } else {
      this.blinkSegments = Math.round(max);
    }
  }

  // ==========================================
  // 毎フレームの描画・追従処理
  // ==========================================

  /**
   * 自機への追従とHUD描画の更新
   */
  update(player: Phaser.Physics.Arcade.Image, delta: number): void {
    if (!player.active) {
      this.container.setVisible(false);
      return;
    }

    this.container.setVisible(true);

    // プレイヤーの頭上に配置（自機が旋回してもHUDは常に上側に水平配置）
    this.container.setPosition(player.x, player.y + PLAYER_HUD_OFFSET_Y);

    // 各バーの割合を滑らかに補間
    const lerpFactor = Math.min(1, (delta / 1000) * 12);
    (Object.keys(this.resources) as ResourceType[]).forEach((key) => {
      const targetRatio = this.resources[key].current / this.resources[key].max;
      this.displayRatios[key] = Phaser.Math.Linear(
        this.displayRatios[key],
        targetRatio,
        lerpFactor,
      );
    });

    this.draw();
  }

  /**
   * HUD全体の描画処理
   */
  /**
   * HUD全体の描画処理（立体グラデーション・ガラス光沢・透過背景）
   */
  private draw(): void {
    const g = this.graphics;
    g.clear();

    const hpMpWidth = PLAYER_HUD_HP_MP_WIDTH;
    const hpBarHeight = PLAYER_HUD_HP_BAR_HEIGHT;
    const mpBarHeight = PLAYER_HUD_MP_BAR_HEIGHT;
    const spacingY = PLAYER_HUD_BAR_SPACING;
    const radius = PLAYER_HUD_BAR_RADIUS;
    const blinkWidth = PLAYER_HUD_BLINK_WIDTH;
    const spacingX = PLAYER_HUD_BLINK_SPACING_X;

    // HP/MPバーを中心に対称配置（キャラの中心から左右の長さが等しくなる）
    const startX = -hpMpWidth / 2;
    const totalHeight = hpBarHeight + spacingY + mpBarHeight;
    const startY = -totalHeight / 2;

    // ──────────────────────────────
    // 1. HPバー（上段横長バー・上下グラデーション ＋ 光沢）
    // ──────────────────────────────
    const hpY = startY;
    const hpRatio = this.displayRatios.hp;

    let hpTopColor = PLAYER_HUD_HP_HIGH_TOP;
    let hpBottomColor = PLAYER_HUD_HP_HIGH_BOTTOM;
    if (hpRatio < HUD_HP_RATIO_MID) {
      hpTopColor = PLAYER_HUD_HP_LOW_TOP;
      hpBottomColor = PLAYER_HUD_HP_LOW_BOTTOM;
    } else if (hpRatio < HUD_HP_RATIO_HIGH) {
      hpTopColor = PLAYER_HUD_HP_MID_TOP;
      hpBottomColor = PLAYER_HUD_HP_MID_BOTTOM;
    }

    this.drawHorizontalBar(
      startX,
      hpY,
      hpMpWidth,
      hpBarHeight,
      hpRatio,
      hpTopColor,
      hpBottomColor,
      radius,
    );

    // ──────────────────────────────
    // 2. MPバー（下段横長バー・マナグラデーション ＋ 光沢）
    // ──────────────────────────────
    const mpY = startY + hpBarHeight + spacingY;
    const mpRatio = this.displayRatios.mp;

    this.drawHorizontalBar(
      startX,
      mpY,
      hpMpWidth,
      mpBarHeight,
      mpRatio,
      PLAYER_HUD_MP_TOP,
      PLAYER_HUD_MP_BOTTOM,
      radius,
    );

    // ──────────────────────────────
    // 3. ブリンクバー（右側に少しはみ出る・短く太い縦型クリスタル柱）
    // ──────────────────────────────
    const blinkX = hpMpWidth / 2 + spacingX;
    const blinkY = startY;
    const blinkHeight = totalHeight;

    const isFullyCharged = this.resources.blink.current >= this.resources.blink.max;

    // 背景枠（角丸・透過すりガラスで敵視認性を向上）
    g.fillStyle(PLAYER_HUD_BG_COLOR, PLAYER_HUD_BG_ALPHA);
    g.fillRoundedRect(blinkX, blinkY, blinkWidth, blinkHeight, radius);

    // ブリンクゲージ塗り（下から上に向かって満ちる）
    const blinkRatio = this.displayRatios.blink;
    if (blinkRatio > 0) {
      const fillHeight = Math.max(0, (blinkHeight - 2) * blinkRatio);
      const fillY = blinkY + blinkHeight - 1 - fillHeight;
      const fillW = blinkWidth - 2;

      const topColor = isFullyCharged ? PLAYER_HUD_BLINK_READY_TOP : PLAYER_HUD_BLINK_TOP;
      const bottomColor = isFullyCharged ? PLAYER_HUD_BLINK_READY_BOTTOM : PLAYER_HUD_BLINK_BOTTOM;

      // 1px走査線で「滑らかな縦グラデーション」と「上下角丸」を完全両立
      for (let py = 0; py < fillHeight; py++) {
        const globalPy = blinkHeight - 2 - fillHeight + py;
        const t = blinkHeight - 2 > 1 ? globalPy / (blinkHeight - 3) : 0;
        const color = interpolateColor(topColor, bottomColor, t);

        // 下端および満タン時上端の角丸インセット
        let inset = 0;
        const distFromBottom = fillHeight - 1 - py;
        if (distFromBottom === 0) inset = 2;
        else if (distFromBottom === 1) inset = 1;

        if (isFullyCharged) {
          if (py === 0) inset = Math.max(inset, 2);
          else if (py === 1) inset = Math.max(inset, 1);
        }

        const lineX = blinkX + 1 + inset;
        const lineW = fillW - inset * 2;
        if (lineW > 0) {
          g.fillStyle(color, isFullyCharged ? 0.94 : 0.88);
          g.fillRect(lineX, fillY + py, lineW, 1);
        }
      }

      // 満タン時のクリスタル光沢
      if (isFullyCharged) {
        g.fillStyle(PLAYER_HUD_GLOSS_COLOR, 0.35);
        g.fillRect(blinkX + 3, fillY + 1, Math.max(0, fillW - 4), 1);
      }
    }

    // 枠線（角丸ストロークを前面に重ねて輪郭を引き締める）
    if (isFullyCharged) {
      g.lineStyle(1, PLAYER_HUD_BLINK_BORDER_READY_COLOR, 0.95);
    } else {
      g.lineStyle(1, PLAYER_HUD_BORDER_COLOR, PLAYER_HUD_BORDER_ALPHA);
    }
    g.strokeRoundedRect(blinkX, blinkY, blinkWidth, blinkHeight, radius);

    // セグメント分割スリット（ストック区切り線）
    if (this.blinkSegments > 1) {
      const segHeight = blinkHeight / this.blinkSegments;
      g.lineStyle(1, PLAYER_HUD_BG_COLOR, 0.85);
      for (let i = 1; i < this.blinkSegments; i++) {
        const slitY = blinkY + i * segHeight;
        g.beginPath();
        g.moveTo(blinkX + 1, slitY);
        g.lineTo(blinkX + blinkWidth - 1, slitY);
        g.strokePath();
      }
    }
  }

  /**
   * 横長バーの滑らかなグラデーション＆角丸両立描画
   */
  private drawHorizontalBar(
    x: number,
    y: number,
    width: number,
    height: number,
    ratio: number,
    topColor: number,
    bottomColor: number,
    radius: number,
  ): void {
    const g = this.graphics;

    // 1. 半透明背景枠（すりガラス・敵や弾が透けて見える角丸枠）
    g.fillStyle(PLAYER_HUD_BG_COLOR, PLAYER_HUD_BG_ALPHA);
    g.fillRoundedRect(x, y, width, height, radius);

    if (ratio > 0) {
      const fillW = Math.max(0, (width - 2) * ratio);
      const fillH = height - 2;
      const isFull = ratio >= 0.99;

      // 2. 1px走査線で「完全な角丸」と「滑らかなリニアグラデーション」を両立
      for (let py = 0; py < fillH; py++) {
        const t = fillH > 1 ? py / (fillH - 1) : 0;
        const color = interpolateColor(topColor, bottomColor, t);

        // 上下端の角丸インセット（radius = 3px相当）
        let leftInset = 0;
        if (py === 0 || py === fillH - 1) leftInset = 2;
        else if (py === 1 || py === fillH - 2) leftInset = 1;

        // 右端が満タン時のみ右側の角も丸める（HP減少中の右端はスパッと垂直カット）
        const rightInset = isFull ? leftInset : 0;

        const lineX = x + 1 + leftInset;
        const lineW = fillW - leftInset - rightInset;

        if (lineW > 0) {
          g.fillStyle(color, 0.88);
          g.fillRect(lineX, y + 1 + py, lineW, 1);
        }
      }

      // 3. 上端の繊細なガラス光沢（角丸に沿ったハイライト）
      g.fillStyle(PLAYER_HUD_GLOSS_COLOR, PLAYER_HUD_GLOSS_ALPHA);
      g.fillRect(x + 3, y + 1, Math.max(0, fillW - (isFull ? 6 : 3)), 1);
    }

    // 4. 外枠線（角丸ストロークを前面に重ねて端を美しく整える）
    g.lineStyle(1, PLAYER_HUD_BORDER_COLOR, PLAYER_HUD_BORDER_ALPHA);
    g.strokeRoundedRect(x, y, width, height, radius);
  }

  /**
   * オブジェクトの破棄
   */
  destroy(): void {
    this.container?.destroy();
  }
}
