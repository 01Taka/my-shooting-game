/**
 * ゲーム全般・物理・ゲームプレイ関連の定数定義
 */

// 画面解像度・背景
export const GAME_WIDTH = 1600;
export const GAME_HEIGHT = 900;
export const GAME_BACKGROUND_COLOR = "#23180f";

// ワールド設定
export const WORLD_SIZE = 4000;
export const WORLD_BORDER_WIDTH = 8;
export const WORLD_BORDER_COLOR = 0x8d5c32;
export const WORLD_BORDER_ALPHA = 0.7;

// レイヤー深度（疑似2.5次元用 Zオーダー）
export const DEPTH_GROUND = 0;
export const DEPTH_SHADOW = 2;
export const DEPTH_TRAP = 3;
export const DEPTH_LOCKON_GROUND = 4;
export const DEPTH_OBJECT = 10;
export const DEPTH_BULLET = 20;
export const DEPTH_EFFECTS = 30;

// 疑似2.5次元・影パラメータ
export const SHADOW_OFFSET_X = 10;
export const SHADOW_OFFSET_Y = 20;
export const SHADOW_ALPHA = 0.45;
export const SHADOW_COLOR = 0x140c06;
export const SHADOW_SCALE_Y = 0.55;

// 自機（プレイヤー）設定
export const PLAYER_INITIAL_HP = 100;
export const PLAYER_SPEED = 360;
export const PLAYER_TEXTURE_SIZE = 64;
export const PLAYER_COLOR = 0x38bdf8;

// ブリンク（短距離テレポート）設定
export const BLINK_DISTANCE = 260;
export const BLINK_METER_MAX = 1.0;
export const BLINK_COST = 0.5; // 1回あたり1/2消費
export const BLINK_RECOVERY_PER_SECOND = 0.2; // 5秒で全快（2.5秒で1回分回復）
export const BLINK_COOLDOWN_MS = 150; // 連打誤動作防止の最小間隔

// 弾丸設定
export const BULLET_SPEED = 720;
export const BULLET_FIRE_RATE_MS = 140;
export const BULLET_MAX_COUNT = 100;
export const BULLET_DAMAGE = 10;
export const BULLET_SPAWN_OFFSET = 32;
export const BULLET_MAX_DISTANCE = 1400;
export const BULLET_BOUNDS_MARGIN = 40;
export const BULLET_DETUNE_RANGE = 30;
export const BULLET_TEXTURE_SIZE = 16;
export const BULLET_TEXTURE_RADIUS = 8;
export const BULLET_COLOR = 0xfacc15;

// 武器プリセット定義
export const WEAPON_DEFINITIONS = {
  spread: {
    type: "spread" as const,
    direction: "up" as const,
    name: "3-WAY",
    shortName: "3-WAY",
    description: "前方3方向に広がる拡散弾",
    damage: 8,
    speed: 680,
    fireRateMs: 200,
    bulletColor: 0x38bdf8,
    bulletScale: 0.95,
    themeColor: 0x38bdf8,
    spreadAngleRad: 0.24, // 約14度
    slowAmount: 30, // 氷結スロウ（約3〜4発で完全凍結）
  },
  normal: {
    type: "normal" as const,
    direction: "right" as const,
    name: "BLASTER",
    shortName: "BLAST",
    description: "バランス型の標準ブラスター",
    damage: 10,
    speed: 720,
    fireRateMs: 140,
    bulletColor: 0xfacc15,
    bulletScale: 1.0,
    themeColor: 0xfacc15,
  },
  heavy: {
    type: "heavy" as const,
    direction: "down" as const,
    name: "CANNON",
    shortName: "HEAVY",
    description: "高威力の重量弾",
    damage: 32,
    speed: 560,
    fireRateMs: 380,
    bulletColor: 0xf43f5e,
    bulletScale: 1.6,
    themeColor: 0xf43f5e,
    stunDurationMs: 900, // 強力な衝撃スタン
  },
  rapid: {
    type: "rapid" as const,
    direction: "left" as const,
    name: "RAPID",
    shortName: "RAPID",
    description: "超高速の連射マシンガン",
    damage: 5,
    speed: 860,
    fireRateMs: 70,
    bulletColor: 0x4ede82,
    bulletScale: 0.75,
    themeColor: 0x4ede82,
  },
};
export type WeaponKey = keyof typeof WEAPON_DEFINITIONS;

// 敵キャラクター設定
export const ENEMY_SPAWN_INTERVAL_MS = 800;
export const ENEMY_SPEED_MIN = 120;
export const ENEMY_SPEED_MAX = 220;
export const ENEMY_DEFAULT_SPEED = 160;
export const ENEMY_SCORE = 100;
export const ENEMY_DAMAGE = 25;
export const ENEMY_HP = 30;
export const ENEMY_SPAWN_DISTANCE_MIN = 950;
export const ENEMY_SPAWN_DISTANCE_MAX = 1150;
export const ENEMY_BOUNDS_PADDING = 80;
export const ENEMY_DESPAWN_DISTANCE = 2400;
export const ENEMY_FLASH_DURATION_MS = 70;
export const ENEMY_FLASH_COLOR = 0xff5555;
export const ENEMY_TEXTURE_SIZE = 56;
export const ENEMY_TEXTURE_RADIUS = 12;
export const ENEMY_COLOR = 0xf43f5e;

// カメラ追従・シェイク設定
export const CAMERA_LOOK_AHEAD_DISTANCE_X = 60;
export const CAMERA_LOOK_AHEAD_DISTANCE_Y = 240;
export const CAMERA_LOOK_AHEAD_SMOOTH_TIME = 0.14;
export const CAMERA_MAX_LOOK_SPEED_X = 160;
export const CAMERA_MAX_LOOK_SPEED_Y = 420;
export const CAMERA_SHAKE_DURATION_MS = 150;
export const CAMERA_SHAKE_INTENSITY = 0.01;

// スマートロックオン設定
export const LOCKON_SECTOR_ANGLE_DEG = 60;
export const LOCKON_MAX_DISTANCE = 950;
export const LOCKON_CHAIN_RADIUS = 480;
export const LOCKON_BREAK_DISTANCE = 1300;
export const LOCKON_OUT_OF_SCREEN_BREAK_DISTANCE = 1000;
export const LOCKON_FLICK_THRESHOLD_MS = 160;
export const LOCKON_HISTORY_CUTOFF_MS = 160;
export const LOCKON_STABLE_SAMPLE_OFFSET_MS = 70;
export const LOCKON_DEPTH = DEPTH_LOCKON_GROUND;
export const LOCKON_ROTATION_SPEED = 2.5;
export const LOCKON_RETICLE_SIZE = 34;
export const LOCKON_BRACKET_LENGTH = 10;
export const LOCKON_INNER_RADIUS = 16;
export const LOCKON_INNER_OFFSET = 7;
export const LOCKON_PRIMARY_COLOR = 0xf43f5e;
export const LOCKON_PRIMARY_ALPHA = 0.9;
export const LOCKON_SECONDARY_COLOR = 0xfb7185;
export const LOCKON_SECONDARY_ALPHA = 0.6;
export const LOCKON_GUIDE_ALPHA = 0.25;
export const LOCKON_LINE_WIDTH = 2.5;
export const LOCKON_INNER_LINE_WIDTH = 1.5;
export const LOCKON_GUIDE_LINE_WIDTH = 1;

// 土の地面背景設定（シームレス・プロシージャル）
export const GROUND_TEXTURE_SIZE = 512;
export const DIRT_BASE_COLOR = 0x4f3622;
export const DIRT_PATCH_COUNT = 36;
export const DIRT_PEBBLE_COUNT = 90;
export const DIRT_GRAIN_COUNT = 350;
export const DIRT_CRACK_COUNT = 8;
export const DIRT_PATCH_COLORS = [0x422d1b, 0x5a3f2b, 0x3b2615, 0x664933, 0x4b3421];
export const DIRT_PEBBLE_COLORS = [0x28190d, 0x7a5b3f, 0x332012, 0x8f6d4d, 0x1e1208];

// 後方互換用スターフィールド定数
export const STARFIELD_TEXTURE_SIZE = GROUND_TEXTURE_SIZE;
export const STARFIELD_BG_COLOR = DIRT_BASE_COLOR;
export const STARFIELD_STAR_COUNT = 90;
export const STAR_RADIUS_MIN = 0.8;
export const STAR_RADIUS_MAX = 2.2;
export const STAR_ALPHA_MIN = 0.3;
export const STAR_ALPHA_MAX = 0.95;
export const STAR_COLORS = [0xffffff, 0x38bdf8, 0x818cf8, 0xf472b6];
export const STARFIELD_GRID_WIDTH = 1;
export const STARFIELD_GRID_COLOR = 0x3b2818;
export const STARFIELD_GRID_ALPHA = 0.2;
