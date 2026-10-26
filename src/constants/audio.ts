/**
 * オーディオ・音量・効果音（SE）関連の定数定義
 */

// 音量設定
export const DEFAULT_BGM_VOLUME = 80;
export const DEFAULT_SE_VOLUME = 80;
export const MIN_VOLUME = 0;
export const MAX_VOLUME = 100;

// SE多重再生防止クールダウン
export const SE_DEFAULT_COOLDOWN_MS = 40;

// シンセサイザーSE設定
// 共通
export const SYNTH_RAMP_MIN_GAIN = 0.001;

// レーザー
export const SYNTH_LASER_FREQ_START = 880;
export const SYNTH_LASER_FREQ_END = 110;
export const SYNTH_LASER_DURATION = 0.12;
export const SYNTH_LASER_VOLUME_SCALE = 0.1;

// 爆発
export const SYNTH_EXPLOSION_DURATION = 0.35;
export const SYNTH_EXPLOSION_FILTER_FREQ_START = 600;
export const SYNTH_EXPLOSION_FILTER_FREQ_END = 60;
export const SYNTH_EXPLOSION_VOLUME_SCALE = 0.7;

// ヒット
export const SYNTH_HIT_FREQ_START = 220;
export const SYNTH_HIT_FREQ_END = 50;
export const SYNTH_HIT_DURATION = 0.08;
export const SYNTH_HIT_VOLUME_SCALE = 0.6;

// クリック
export const SYNTH_CLICK_FREQ_START = 1000;
export const SYNTH_CLICK_FREQ_MID = 1400;
export const SYNTH_CLICK_FREQ_CHANGE_TIME = 0.015;
export const SYNTH_CLICK_DURATION = 0.04;
export const SYNTH_CLICK_VOLUME_SCALE = 0.3;

// ゲームオーバー
export const SYNTH_GAMEOVER_FREQS = [330, 294, 262, 196];
export const SYNTH_GAMEOVER_STEP_INTERVAL = 0.15;
export const SYNTH_GAMEOVER_VOLUME_SCALE = 0.3;

// ブリンク（テレポート）
export const SYNTH_BLINK_FREQ_START = 320;
export const SYNTH_BLINK_FREQ_PEAK = 960;
export const SYNTH_BLINK_FREQ_END = 480;
export const SYNTH_BLINK_DURATION = 0.14;
export const SYNTH_BLINK_VOLUME_SCALE = 0.45;
