import Phaser from "phaser";

/**
 * Phaser（ゲームエンジン）と React（UI画面）の間で
 * イベント（通知やデータ）をやりとりするための共通イベントバス
 */
export const EventBus = new Phaser.Events.EventEmitter();
