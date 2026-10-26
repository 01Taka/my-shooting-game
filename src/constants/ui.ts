/**
 * UI・HUD・シーン制御関連の定数定義
 */

// プレイヤー頭上追従HUD（HP / MP / ブリンク）
export const PLAYER_HUD_OFFSET_Y = -52;
export const PLAYER_HUD_HP_MP_WIDTH = 100;
export const PLAYER_HUD_HP_BAR_HEIGHT = 20;
export const PLAYER_HUD_MP_BAR_HEIGHT = 10;
export const PLAYER_HUD_BAR_SPACING = 4;
export const PLAYER_HUD_BAR_RADIUS = 3;
export const PLAYER_HUD_BLINK_WIDTH = 15;
export const PLAYER_HUD_BLINK_SPACING_X = 5;
export const PLAYER_HUD_DEPTH = 25;

export const PLAYER_HUD_BG_COLOR = 0x0f172a;
export const PLAYER_HUD_BG_ALPHA = 0.35;
export const PLAYER_HUD_BORDER_COLOR = 0x475569;
export const PLAYER_HUD_BORDER_ALPHA = 0.55;

// ガラス光沢ハイライト
export const PLAYER_HUD_GLOSS_COLOR = 0xffffff;
export const PLAYER_HUD_GLOSS_ALPHA = 0.28;

// HPグラデーション（上部Light / 下部Deep）
export const PLAYER_HUD_HP_HIGH_TOP = 0x4ede82;
export const PLAYER_HUD_HP_HIGH_BOTTOM = 0x15803d;
export const PLAYER_HUD_HP_MID_TOP = 0xfde047;
export const PLAYER_HUD_HP_MID_BOTTOM = 0xb45309;
export const PLAYER_HUD_HP_LOW_TOP = 0xf87171;
export const PLAYER_HUD_HP_LOW_BOTTOM = 0x991b1b;

// MPグラデーション
export const PLAYER_HUD_MP_TOP = 0x7c6ee6;
export const PLAYER_HUD_MP_BOTTOM = 0x4338ca;

// ブリンクグラデーション（縦型クリスタル）
export const PLAYER_HUD_BLINK_TOP = 0xf838c8;
export const PLAYER_HUD_BLINK_BOTTOM = 0x9d174d;
export const PLAYER_HUD_BLINK_READY_TOP = 0xffe4fc;
export const PLAYER_HUD_BLINK_READY_BOTTOM = 0xf43f5e;
export const PLAYER_HUD_BLINK_BORDER_READY_COLOR = 0xfacc15;

// HUD（ヘッズアップディスプレイ）
export const HUD_HP_LABEL_X = 30;
export const HUD_HP_LABEL_Y = 26;
export const HUD_HP_BAR_X = 80;
export const HUD_HP_BAR_Y = 26;
export const HUD_HP_BAR_WIDTH = 240;
export const HUD_HP_BAR_HEIGHT = 28;
export const HUD_HP_BAR_RADIUS = 6;
export const HUD_HP_BAR_BG_COLOR = 0x334155;
export const HUD_HP_BAR_BG_ALPHA = 0.8;
export const HUD_HP_TEXT_X = 335;
export const HUD_HP_TEXT_Y = 26;

export const HUD_HP_RATIO_HIGH = 0.5;
export const HUD_HP_RATIO_MID = 0.25;
export const HUD_HP_COLOR_HIGH = 0x22c55e;
export const HUD_HP_COLOR_MID = 0xfacc15;
export const HUD_HP_COLOR_LOW = 0xef4444;

export const HUD_SCORE_Y = 40;
export const HUD_SCORE_DIGITS = 5;

export const HUD_PAUSE_BUTTON_MARGIN_LEFT = 30;
export const HUD_PAUSE_BUTTON_MARGIN_RIGHT = 30;
export const HUD_PAUSE_BUTTON_Y = 40;
export const HUD_PAUSE_BUTTON_PADDING_X = 18;
export const HUD_PAUSE_BUTTON_PADDING_Y = 10;

// ポーズメニュー
export const PAUSE_MENU_BACKDROP_COLOR = 0x020617;
export const PAUSE_MENU_BACKDROP_ALPHA = 0.75;
export const PAUSE_MENU_MODAL_WIDTH = 540;
export const PAUSE_MENU_MODAL_HEIGHT = 460;
export const PAUSE_MENU_MODAL_RADIUS = 20;
export const PAUSE_MENU_MODAL_BG_COLOR = 0x1e293b;
export const PAUSE_MENU_MODAL_BORDER_WIDTH = 3;
export const PAUSE_MENU_MODAL_BORDER_COLOR = 0x475569;

export const PAUSE_MENU_TITLE_Y_OFFSET = 150;
export const PAUSE_MENU_BUTTON_START_Y_OFFSET = -40;
export const PAUSE_MENU_BUTTON_SPACING_Y = 95;
export const PAUSE_MENU_BUTTON_WIDTH = 360;
export const PAUSE_MENU_BUTTON_HEIGHT = 64;
export const PAUSE_MENU_BUTTON_RADIUS = 12;

export const PAUSE_MENU_RESUME_COLOR = 0x0284c7;
export const PAUSE_MENU_SETTINGS_COLOR = 0x475569;
export const PAUSE_MENU_TITLE_COLOR = 0xd97706;

// バーチャルスティック・タッチコントローラー
export const CONTROLLER_MAX_POINTERS = 4;
export const ATTACK_PAD_RADIUS = 240;
export const ATTACK_PAD_DEPTH = 40;
export const ATTACK_PAD_LABEL_OFFSET = 90;
export const ATTACK_PAD_COLOR = 0xf43f5e;
export const ATTACK_PAD_INNER_RING_RATIO = 0.55;

export const BLINK_PAD_RADIUS = 240;
export const BLINK_PAD_DEPTH = 40;
export const BLINK_PAD_LABEL_OFFSET = 90;
export const BLINK_PAD_COLOR = 0xd946ef;
export const BLINK_PAD_DISABLED_COLOR = 0x64748b;
export const BLINK_PAD_INNER_RING_RATIO = 0.55;

export const STICK_CONTAINER_DEPTH = 100;
export const STICK_LABEL_OFFSET_Y = 14;

export const MOVE_STICK_X_OFFSET = 200;
export const MOVE_STICK_Y_OFFSET = 200;
export const MOVE_STICK_BASE_RADIUS = 90;
export const MOVE_STICK_KNOB_RADIUS = 42;
export const MOVE_STICK_DEAD_ZONE = 12;
export const MOVE_STICK_MAX_RADIUS = 80;
export const MOVE_STICK_BASE_COLOR = 0x0f172a;
export const MOVE_STICK_BORDER_COLOR = 0x38bdf8;
export const MOVE_STICK_KNOB_COLOR = 0x0284c7;

export const LOCKON_STICK_X_OFFSET = 460;
export const LOCKON_STICK_Y_OFFSET = 260;
export const LOCKON_STICK_BASE_RADIUS = 90;
export const LOCKON_STICK_KNOB_RADIUS = 42;
export const LOCKON_STICK_DEAD_ZONE = 14;
export const LOCKON_STICK_MAX_RADIUS = 80;
export const LOCKON_STICK_BASE_COLOR = 0x0f172a;
export const LOCKON_STICK_BORDER_COLOR = 0xf43f5e;
export const LOCKON_STICK_KNOB_COLOR = 0xe11d48;

export const PC_STICK_KNOB_RADIUS = 26;
export const PC_STICK_CENTER_DOT_RADIUS = 5;
export const STICK_CENTER_DOT_RADIUS = 7;

// 武器選択スティック
export const WEAPON_STICK_X_OFFSET = 120; // 画面右端からの距離
export const WEAPON_STICK_SPACING_FROM_FIRE_RADIUS = 75; // Fireの半径に加える固定スペース
export const WEAPON_STICK_BASE_RADIUS = 54;
export const WEAPON_STICK_KNOB_RADIUS = 25;
export const WEAPON_STICK_MAX_RADIUS = 44;
export const WEAPON_STICK_DEAD_ZONE = 12;
export const WEAPON_STICK_BASE_COLOR = 0x0f172a;
export const WEAPON_STICK_BORDER_COLOR = 0xf59e0b;
export const WEAPON_STICK_KNOB_COLOR = 0xd97706;

// 武器選択HUD（自機周囲）
export const WEAPON_HUD_DISTANCE = 115; // プレイヤー中心からの距離
export const WEAPON_HUD_ITEM_RADIUS = 30; // 各武器サークルの半径
export const WEAPON_HUD_DEPTH = 35; // プレイヤー・弾より手前
export const WEAPON_HUD_NORMAL_SCALE = 1.0;
export const WEAPON_HUD_SELECTED_SCALE = 1.28;
export const WEAPON_HUD_POP_SCALE = 1.42;
export const WEAPON_HUD_POP_HOLD_MS = 130; // 選択武器のポップ強調維持時間
export const WEAPON_HUD_FADE_OUT_DURATION_MS = 180; // 選択武器のフェードアウト速度
export const WEAPON_HUD_UNSELECTED_FADE_OUT_DURATION_MS = 70; // 非選択HUDの高速フェードアウト速度

export const AIM_ARROW_TIP_OFFSET = 22;
export const AIM_ARROW_BASE_OFFSET = 6;
export const AIM_ARROW_ANGLE_OFFSET = 0.35;

export const STICK_TAP_MAX_DURATION_MS = 350;
export const STICK_KNOB_RESET_DURATION_MS = 100;
export const STICK_CONTAINER_FADE_DURATION_MS = 200;

// タイトル画面
export const TITLE_TEXT_Y_OFFSET = 200;
export const TITLE_SUBTITLE_Y_OFFSET = 100;
export const TITLE_START_BUTTON_Y_OFFSET = 60;
export const TITLE_SETTINGS_BUTTON_Y_OFFSET = 190;
export const TITLE_START_BUTTON_COLOR = 0x0284c7;
export const TITLE_SETTINGS_BUTTON_COLOR = 0x475569;
export const TITLE_BUTTON_WIDTH = 440;
export const TITLE_BUTTON_HEIGHT = 90;
export const TITLE_BUTTON_RADIUS = 18;

// ボタン共通スケールアニメーション
export const BUTTON_HOVER_SCALE = 1.05;
export const BUTTON_NORMAL_SCALE = 1.0;
export const BUTTON_PRESSED_SCALE = 0.95;

// リザルト画面
export const RESULT_BACKDROP_COLOR = 0x020617;
export const RESULT_BACKDROP_ALPHA = 0.8;
export const CONFETTI_PARTICLE_COUNT = 120;
export const CONFETTI_SPREAD = 80;
export const CONFETTI_ORIGIN_Y = 0.6;
export const RESULT_TITLE_Y_OFFSET = 160;
export const RESULT_SCORE_Y_OFFSET = 40;
export const RESULT_REPLAY_BUTTON_Y_OFFSET = 80;
export const RESULT_TITLE_BUTTON_Y_OFFSET = 200;
export const RESULT_REPLAY_BUTTON_COLOR = 0x0284c7;
export const RESULT_TITLE_BUTTON_COLOR = 0x475569;
export const RESULT_BUTTON_WIDTH = 400;
export const RESULT_BUTTON_HEIGHT = 80;
export const RESULT_BUTTON_RADIUS = 16;
export const RESULT_BUTTON_HOVER_SCALE = 1.04;
export const RESULT_BUTTON_PRESSED_SCALE = 0.96;

// プリロード画面
export const PRELOAD_LOADING_TEXT_Y_OFFSET = 80;
export const PRELOAD_PERCENT_TEXT_Y_OFFSET = 70;
export const PRELOAD_BOX_WIDTH = 600;
export const PRELOAD_BOX_HEIGHT = 40;
export const PRELOAD_BOX_RADIUS = 12;
export const PRELOAD_BOX_COLOR = 0x334155;
export const PRELOAD_BOX_ALPHA = 0.8;
export const PRELOAD_BAR_WIDTH = 588;
export const PRELOAD_BAR_HEIGHT = 28;
export const PRELOAD_BAR_RADIUS = 8;
export const PRELOAD_BAR_COLOR = 0x38bdf8;

// テキスト描画設定
export const TEXT_DEFAULT_RESOLUTION = 2;
export const TEXT_MIN_RESOLUTION = 2;
export const TEXT_MAX_RESOLUTION = 2;
export const TEXT_PADDING_X = 4;
export const TEXT_PADDING_Y = 4;
