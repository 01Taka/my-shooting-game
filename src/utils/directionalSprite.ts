import Phaser from "phaser";

/**
 * スプライトの方向解像度モード
 * - "diagonal4": 右前、右後ろ、左前、左後ろの斜め4方向
 * - "horizontal2": 右、左の左右2方向
 */
export type DirectionalMode = "diagonal4" | "horizontal2";

export type Diagonal4Direction = "front_right" | "front_left" | "back_right" | "back_left";

export type Horizontal2Direction = "right" | "left";

export type CharacterDirection = Diagonal4Direction | Horizontal2Direction;

/**
 * 角度（ラジアン）から斜め4方向（右前、左前、左後ろ、右後ろ）を判定
 * 境界付近でのチラつきを防ぐヒステリシスを考慮
 */
export function resolveDiagonal4Direction(
  angleRad: number,
  currentDirection?: Diagonal4Direction,
  hysteresisRad = 0.12,
): Diagonal4Direction {
  // -PI ~ PI に正規化
  const norm = Phaser.Math.Angle.Wrap(angleRad);

  // 各斜め方向の中心角度
  // front_right: +45° (PI / 4)
  // front_left:  +135° (3 * PI / 4)
  // back_left:   -135° (-3 * PI / 4)
  // back_right:  -45° (-PI / 4)
  let rawDir: Diagonal4Direction;

  if (norm >= 0 && norm < Math.PI / 2) {
    rawDir = "front_right";
  } else if (norm >= Math.PI / 2 && norm <= Math.PI) {
    rawDir = "front_left";
  } else if (norm >= -Math.PI && norm < -Math.PI / 2) {
    rawDir = "back_left";
  } else {
    rawDir = "back_right";
  }

  if (!currentDirection) {
    return rawDir;
  }

  // 現在の方向と判定された方向の境界チェック（ヒステリシスで微振動を抑制）
  const threshold = Math.sin(hysteresisRad);
  const cos = Math.cos(norm);
  const sin = Math.sin(norm);

  // 軸付近（cos ≈ 0 または sin ≈ 0）で拮抗している場合は現在の向きを維持
  if (Math.abs(cos) < threshold || Math.abs(sin) < threshold) {
    return currentDirection;
  }

  return rawDir;
}

/**
 * 角度（ラジアン）から左右2方向（右、左）を判定
 */
export function resolveHorizontal2Direction(
  angleRad: number,
  currentDirection?: Horizontal2Direction,
  hysteresisRad = 0.12,
): Horizontal2Direction {
  const norm = Phaser.Math.Angle.Wrap(angleRad);
  const isRight = norm >= -Math.PI / 2 && norm <= Math.PI / 2;
  const rawDir: Horizontal2Direction = isRight ? "right" : "left";

  if (!currentDirection) {
    return rawDir;
  }

  // 上下軸（norm ≈ ±PI/2）付近でのチラつき防止
  const cos = Math.cos(norm);
  if (Math.abs(cos) < Math.sin(hysteresisRad)) {
    return currentDirection;
  }

  return rawDir;
}

/**
 * 角度とモードから方向を解決
 */
export function resolveCharacterDirection(
  mode: DirectionalMode,
  angleRad: number,
  currentDirection?: CharacterDirection,
): CharacterDirection {
  if (mode === "horizontal2") {
    return resolveHorizontal2Direction(
      angleRad,
      currentDirection as Horizontal2Direction | undefined,
    );
  }
  return resolveDiagonal4Direction(angleRad, currentDirection as Diagonal4Direction | undefined);
}

/**
 * 角度とモードからテクスチャキーと方向を解決
 */
export function getDirectionalTextureInfo(
  baseKey: string,
  mode: DirectionalMode,
  angleRad: number,
  currentDirection?: CharacterDirection,
): { textureKey: string; direction: CharacterDirection } {
  const direction = resolveCharacterDirection(mode, angleRad, currentDirection);

  return {
    textureKey: `${baseKey}_${direction}`,
    direction,
  };
}

/**
 * スプライトに方向別テクスチャを適用する共通ヘルパー
 * @returns 更新後の方向
 */
export function applyDirectionalTexture(
  target: {
    setTexture: (key: string) => void;
    texture: { key: string };
  },
  baseKey: string,
  mode: DirectionalMode,
  angleRad: number,
  currentDirection?: CharacterDirection,
): CharacterDirection {
  const info = getDirectionalTextureInfo(baseKey, mode, angleRad, currentDirection);

  // テクスチャが異なる場合のみ差し替え
  if (target.texture.key !== info.textureKey) {
    target.setTexture(info.textureKey);
  }

  return info.direction;
}
