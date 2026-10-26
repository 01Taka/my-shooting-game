/** 画面上のメートル換算ピクセル単位（1m = 50px） */
export const PX_PER_METER = 50;

/** メートルからピクセルへ変換 */
export const m = (meters: number): number => meters * PX_PER_METER;
