/**
 * ゲーム全般・物理・ゲームプレイ関連の定数定義
 */

// 画面解像度・背景
export const GAME_WIDTH = 1600;
export const GAME_HEIGHT = 900;
export const GAME_BACKGROUND_COLOR = "#0f172a";

// ワールド設定
export const WORLD_SIZE = 4000;
export const WORLD_BORDER_WIDTH = 8;
export const WORLD_BORDER_COLOR = 0x38bdf8;
export const WORLD_BORDER_ALPHA = 0.7;

// 自機（プレイヤー）設定
export const PLAYER_INITIAL_HP = 100;
export const PLAYER_SPEED = 520;
export const PLAYER_TEXTURE_SIZE = 64;
export const PLAYER_COLOR = 0x38bdf8;

// ブリンク（短距離テレポート）設定
export const BLINK_DISTANCE = 260;
export const BLINK_METER_MAX = 1.0;
export const BLINK_COST = 0.5; // 1回あたり1/2消費
export const BLINK_RECOVERY_PER_SECOND = 0.2; // 5秒で全快（2.5秒で1回分回復）
export const BLINK_COOLDOWN_MS = 150; // 連打誤動作防止の最小間隔


// 弾丸設定
export const BULLET_SPEED = 1050;
export const BULLET_FIRE_RATE_MS = 140;
export const BULLET_MAX_COUNT = 60;
export const BULLET_DAMAGE = 10;
export const BULLET_SPAWN_OFFSET = 32;
export const BULLET_MAX_DISTANCE = 1400;
export const BULLET_BOUNDS_MARGIN = 40;
export const BULLET_DETUNE_RANGE = 30;
export const BULLET_TEXTURE_SIZE = 16;
export const BULLET_TEXTURE_RADIUS = 8;
export const BULLET_COLOR = 0xfacc15;

// 敵キャラクター設定
export const ENEMY_SPAWN_INTERVAL_MS = 800;
export const ENEMY_SPEED_MIN = 180;
export const ENEMY_SPEED_MAX = 320;
export const ENEMY_DEFAULT_SPEED = 240;
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
export const LOCKON_DEPTH = 50;
export const LOCKON_ROTATION_SPEED = 2.5;
export const LOCKON_RETICLE_SIZE = 32;
export const LOCKON_BRACKET_LENGTH = 10;
export const LOCKON_INNER_RADIUS = 14;
export const LOCKON_INNER_OFFSET = 6;
export const LOCKON_PRIMARY_COLOR = 0xf43f5e;
export const LOCKON_PRIMARY_ALPHA = 0.9;
export const LOCKON_SECONDARY_COLOR = 0xfb7185;
export const LOCKON_SECONDARY_ALPHA = 0.6;
export const LOCKON_GUIDE_ALPHA = 0.25;
export const LOCKON_LINE_WIDTH = 2.5;
export const LOCKON_INNER_LINE_WIDTH = 1.5;
export const LOCKON_GUIDE_LINE_WIDTH = 1;

// スターフィールド背景設定
export const STARFIELD_TEXTURE_SIZE = 512;
export const STARFIELD_BG_COLOR = 0x090d16;
export const STARFIELD_STAR_COUNT = 90;
export const STAR_RADIUS_MIN = 0.8;
export const STAR_RADIUS_MAX = 2.2;
export const STAR_ALPHA_MIN = 0.3;
export const STAR_ALPHA_MAX = 0.95;
export const STAR_COLORS = [0xffffff, 0x38bdf8, 0x818cf8, 0xf472b6];
export const STARFIELD_GRID_WIDTH = 1;
export const STARFIELD_GRID_COLOR = 0x1e293b;
export const STARFIELD_GRID_ALPHA = 0.4;
