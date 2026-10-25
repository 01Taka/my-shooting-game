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
}

export interface EnemyConfig {
  spawnIntervalMs: number;
  speedMin: number;
  speedMax: number;
  damage: number;
  score: number;
}

export interface PlayerConfig {
  speed: number;
  initialHp: number;
}

export interface GameParameters {
  player: PlayerConfig;
  bullet: BulletConfig;
  enemy: EnemyConfig;
  camera: CameraConfig;
}
