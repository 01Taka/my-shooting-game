export interface CameraConfig {
  lookAheadDistanceX: number;
  lookAheadDistanceY: number;
  lookAheadSmoothTime: number;
  maxLookSpeedX: number;
  maxLookSpeedY: number;
}

export type WeaponDirection = "up" | "right" | "down" | "left";
export type WeaponType = "spread" | "normal" | "heavy" | "rapid";

export interface WeaponDefinition {
  type: WeaponType;
  direction: WeaponDirection;
  name: string;
  shortName: string;
  description: string;
  damage: number;
  speed: number;
  fireRateMs: number;
  bulletColor: number;
  bulletScale: number;
  themeColor: number;
  spreadAngleRad?: number;
}

export interface BulletConfig {
  speed: number;
  fireRateMs: number;
  maxBullets: number;
  damage: number;
}

export interface EnemyConfig {
  spawnIntervalMs: number;
  speedMin: number;
  speedMax: number;
  damage: number;
  score: number;
  hp: number; // 敵の耐久HP（例: 30 = 3発分）
}

export interface PlayerConfig {
  speed: number;
  initialHp: number;
}

export interface LockOnConfig {
  sectorAngleDeg: number; // 索敵扇形角度（例: 60度）
  maxDistance: number; // 最大索敵距離（画面内判定基準、例: 950px）
  chainRadius: number; // 撃破連鎖半径（例: 480px）
  breakDistance: number; // ロック解除距離（例: 1300px）
}

export interface BlinkConfig {
  distance: number;
  maxMeter: number;
  cost: number;
  recoveryPerSecond: number;
  cooldownMs: number;
}

export interface GameParameters {
  player: PlayerConfig;
  bullet: BulletConfig;
  enemy: EnemyConfig;
  camera: CameraConfig;
  lockOn: LockOnConfig;
  blink: BlinkConfig;
}
