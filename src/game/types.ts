export interface CameraConfig {
  lookAheadDistanceX: number;
  lookAheadDistanceY: number;
  lookAheadSmoothTime: number;
  maxLookSpeedX: number;
  maxLookSpeedY: number;
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

export interface GameParameters {
  player: PlayerConfig;
  bullet: BulletConfig;
  enemy: EnemyConfig;
  camera: CameraConfig;
  lockOn: LockOnConfig;
}
