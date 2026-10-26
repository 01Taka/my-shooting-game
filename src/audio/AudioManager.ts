import type Phaser from "phaser";

import {
  MAX_VOLUME,
  MIN_VOLUME,
  SE_DEFAULT_COOLDOWN_MS,
  SYNTH_CLICK_DURATION,
  SYNTH_CLICK_FREQ_CHANGE_TIME,
  SYNTH_CLICK_FREQ_MID,
  SYNTH_CLICK_FREQ_START,
  SYNTH_CLICK_VOLUME_SCALE,
  SYNTH_EXPLOSION_DURATION,
  SYNTH_EXPLOSION_FILTER_FREQ_END,
  SYNTH_EXPLOSION_FILTER_FREQ_START,
  SYNTH_EXPLOSION_VOLUME_SCALE,
  SYNTH_GAMEOVER_FREQS,
  SYNTH_GAMEOVER_STEP_INTERVAL,
  SYNTH_GAMEOVER_VOLUME_SCALE,
  SYNTH_HIT_DURATION,
  SYNTH_HIT_FREQ_END,
  SYNTH_HIT_FREQ_START,
  SYNTH_HIT_VOLUME_SCALE,
  SYNTH_LASER_DURATION,
  SYNTH_LASER_FREQ_END,
  SYNTH_LASER_FREQ_START,
  SYNTH_LASER_VOLUME_SCALE,
  SYNTH_RAMP_MIN_GAIN,
  SYNTH_BLINK_DURATION,
  SYNTH_BLINK_FREQ_END,
  SYNTH_BLINK_FREQ_PEAK,
  SYNTH_BLINK_FREQ_START,
  SYNTH_BLINK_VOLUME_SCALE,
} from "../constants";
import { useGameSettings } from "../stores/useGameSettings";

export type SynthSoundType = "laser" | "explosion" | "hit" | "click" | "gameover" | "blink";


export interface SoundPlayOptions {
  volume?: number; // 個別音量倍率 (0.0 - 1.0, デフォルト: 1.0)
  detune?: number; // ピッチの揺らぎ (-1200 - 1200, デフォルト: 0)
  rate?: number; // 再生速度
}

export class AudioManager {
  private static instance: AudioManager;
  private game?: Phaser.Game;
  private currentBgmKey: string | null = null;
  private currentBgm: Phaser.Sound.BaseSound | null = null;
  private unsubscribeSettings?: () => void;

  // SE多重発音を防止するクールダウン管理（キー -> 最終再生時刻ms）
  private seCooldowns: Map<string, number> = new Map();
  private readonly defaultCooldownMs = SE_DEFAULT_COOLDOWN_MS;

  // AudioContextアンロック済みフラグ
  private isUnlocked = false;

  private constructor() {
    this.setupGlobalUnlockListeners();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Phaserゲームインスタンスとの接続 & 設定ストア購読
   */
  public init(game: Phaser.Game): void {
    this.game = game;

    // 設定ストアの音量・ミュート変更をリアルタイム購読
    this.unsubscribeSettings = useGameSettings.subscribe((state) => {
      this.syncBgmVolume(state.bgmVolume, state.bgmMuted);
    });

    // 初期音量の同期
    const state = useGameSettings.getState();
    this.syncBgmVolume(state.bgmVolume, state.bgmMuted);
  }

  /**
   * ブラウザの Autoplay Policy（自動再生制限）を解除するリスナー
   */
  private setupGlobalUnlockListeners(): void {
    if (typeof window === "undefined") return;

    const unlockHandler = () => {
      this.unlockAudioContext();
      window.removeEventListener("pointerdown", unlockHandler);
      window.removeEventListener("keydown", unlockHandler);
      window.removeEventListener("touchend", unlockHandler);
    };

    window.addEventListener("pointerdown", unlockHandler, { passive: true });
    window.addEventListener("keydown", unlockHandler, { passive: true });
    window.addEventListener("touchend", unlockHandler, { passive: true });
  }

  /**
   * AudioContext のアンロック実行
   */
  public unlockAudioContext(): void {
    if (this.isUnlocked) return;

    const audioCtx = this.getAudioContext();
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().then(() => {
        this.isUnlocked = true;
      });
    } else {
      this.isUnlocked = true;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.game) return null;
    const soundManager = this.game.sound;
    if (soundManager && "context" in soundManager) {
      return (soundManager as unknown as { context: AudioContext }).context;
    }
    return null;
  }

  // ==========================================
  // BGM 管理
  // ==========================================

  /**
   * BGMの再生（すでに同じ曲が流れている場合は何もしない）
   */
  public playBGM(key: string, loop = true): void {
    if (!this.game || this.currentBgmKey === key) return;

    // 前のBGMを停止
    this.stopBGM();

    const settings = useGameSettings.getState();
    const effectiveVolume = settings.bgmMuted ? 0 : settings.bgmVolume / MAX_VOLUME;

    // アセットが存在する場合に再生
    if (this.game.cache.audio.has(key)) {
      this.currentBgm = this.game.sound.add(key, {
        loop,
        volume: effectiveVolume,
      });
      this.currentBgm.play();
      this.currentBgmKey = key;
    } else {
      this.currentBgmKey = key;
    }
  }

  /**
   * BGMの停止
   */
  public stopBGM(): void {
    if (this.currentBgm) {
      this.currentBgm.stop();
      this.currentBgm.destroy();
      this.currentBgm = null;
    }
    this.currentBgmKey = null;
  }

  /**
   * BGMのポーズ / 再開
   */
  public pauseBGM(): void {
    if (this.currentBgm && this.currentBgm.isPlaying) {
      this.currentBgm.pause();
    }
  }

  public resumeBGM(): void {
    if (this.currentBgm && this.currentBgm.isPaused) {
      this.currentBgm.resume();
    }
  }

  /**
   * 再生中のBGM音量を設定ストアと同期
   */
  private syncBgmVolume(volume: number, muted: boolean): void {
    const effectiveVolume = muted ? 0 : volume / MAX_VOLUME;
    if (this.currentBgm && "setVolume" in this.currentBgm) {
      (this.currentBgm as Phaser.Sound.WebAudioSound).setVolume(effectiveVolume);
    }
  }

  // ==========================================
  // 効果音（SE）管理
  // ==========================================

  /**
   * SEの再生（アセットがあればPhaserで再生、無ければWeb Audioシンセ音で自動フォールバック）
   */
  public playSE(key: string, options?: SoundPlayOptions): void {
    const settings = useGameSettings.getState();
    if (settings.seMuted || settings.seVolume <= MIN_VOLUME) return;

    // クールダウン（同一フレーム・短時間の爆音化防止）判定
    const now = performance.now();
    const lastPlayed = this.seCooldowns.get(key) || 0;
    if (now - lastPlayed < this.defaultCooldownMs) {
      return;
    }
    this.seCooldowns.set(key, now);

    const baseVolume = settings.seVolume / MAX_VOLUME;
    const finalVolume = Math.max(0, Math.min(1.0, baseVolume * (options?.volume ?? 1.0)));

    // 1. Phaser のキャッシュに実音声ファイルが存在する場合
    if (this.game && this.game.cache.audio.has(key)) {
      this.game.sound.play(key, {
        volume: finalVolume,
        detune: options?.detune ?? 0,
        rate: options?.rate ?? 1.0,
      });
      return;
    }

    // 2. 実音声アセットが無い場合、シンセ音で自動フォールバック
    if (this.isSynthSoundType(key)) {
      this.playSynthSE(key, finalVolume);
    }
  }

  private isSynthSoundType(key: string): key is SynthSoundType {
    return ["laser", "explosion", "hit", "click", "gameover", "blink"].includes(key);
  }

  // ==========================================
  // プロシージャル合成音（Web Audio API シンセサイザー）
  // ==========================================

  /**
   * 外部アセット不要のWeb Audio APIプロシージャル効果音生成
   */
  public playSynthSE(type: SynthSoundType, volume = 0.8): void {
    const audioCtx = this.getAudioContext() || this.createStandaloneContext();
    if (!audioCtx) return;

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    switch (type) {
      case "laser": {
        // ピューンと下降するレトロレーザー音
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(SYNTH_LASER_FREQ_START, now);
        osc.frequency.exponentialRampToValueAtTime(
          SYNTH_LASER_FREQ_END,
          now + SYNTH_LASER_DURATION,
        );

        gain.gain.setValueAtTime(volume * SYNTH_LASER_VOLUME_SCALE, now);
        gain.gain.exponentialRampToValueAtTime(SYNTH_RAMP_MIN_GAIN, now + SYNTH_LASER_DURATION);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + SYNTH_LASER_DURATION);
        break;
      }

      case "explosion": {
        // ホワイトノイズ＋ローパスフィルターによる爆発音
        const bufferSize = audioCtx.sampleRate * SYNTH_EXPLOSION_DURATION;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(SYNTH_EXPLOSION_FILTER_FREQ_START, now);
        filter.frequency.exponentialRampToValueAtTime(
          SYNTH_EXPLOSION_FILTER_FREQ_END,
          now + SYNTH_EXPLOSION_DURATION,
        );

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(volume * SYNTH_EXPLOSION_VOLUME_SCALE, now);
        gain.gain.exponentialRampToValueAtTime(SYNTH_RAMP_MIN_GAIN, now + SYNTH_EXPLOSION_DURATION);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        whiteNoise.start(now);
        break;
      }

      case "hit": {
        // 短く鈍い衝撃音
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(SYNTH_HIT_FREQ_START, now);
        osc.frequency.exponentialRampToValueAtTime(SYNTH_HIT_FREQ_END, now + SYNTH_HIT_DURATION);

        gain.gain.setValueAtTime(volume * SYNTH_HIT_VOLUME_SCALE, now);
        gain.gain.exponentialRampToValueAtTime(SYNTH_RAMP_MIN_GAIN, now + SYNTH_HIT_DURATION);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + SYNTH_HIT_DURATION);
        break;
      }

      case "click": {
        // ピッという高音UIタップ音
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(SYNTH_CLICK_FREQ_START, now);
        osc.frequency.setValueAtTime(SYNTH_CLICK_FREQ_MID, now + SYNTH_CLICK_FREQ_CHANGE_TIME);

        gain.gain.setValueAtTime(volume * SYNTH_CLICK_VOLUME_SCALE, now);
        gain.gain.exponentialRampToValueAtTime(SYNTH_RAMP_MIN_GAIN, now + SYNTH_CLICK_DURATION);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + SYNTH_CLICK_DURATION);
        break;
      }

      case "gameover": {
        // 哀愁のある下降アルペジオ音
        SYNTH_GAMEOVER_FREQS.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc.type = "square";
          osc.frequency.setValueAtTime(freq, now + idx * SYNTH_GAMEOVER_STEP_INTERVAL);

          gain.gain.setValueAtTime(
            volume * SYNTH_GAMEOVER_VOLUME_SCALE,
            now + idx * SYNTH_GAMEOVER_STEP_INTERVAL,
          );
          gain.gain.exponentialRampToValueAtTime(
            SYNTH_RAMP_MIN_GAIN,
            now + (idx + 1) * SYNTH_GAMEOVER_STEP_INTERVAL,
          );

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(now + idx * SYNTH_GAMEOVER_STEP_INTERVAL);
          osc.stop(now + (idx + 1) * SYNTH_GAMEOVER_STEP_INTERVAL);
        });
        break;
      }

      case "blink": {
        // 急上昇して下降する近未来的なワープ・テレポート音
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(SYNTH_BLINK_FREQ_START, now);
        osc.frequency.linearRampToValueAtTime(
          SYNTH_BLINK_FREQ_PEAK,
          now + SYNTH_BLINK_DURATION * 0.4,
        );
        osc.frequency.exponentialRampToValueAtTime(
          SYNTH_BLINK_FREQ_END,
          now + SYNTH_BLINK_DURATION,
        );

        gain.gain.setValueAtTime(volume * SYNTH_BLINK_VOLUME_SCALE, now);
        gain.gain.exponentialRampToValueAtTime(SYNTH_RAMP_MIN_GAIN, now + SYNTH_BLINK_DURATION);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + SYNTH_BLINK_DURATION);
        break;
      }
    }
  }

  private fallbackCtx: AudioContext | null = null;
  private createStandaloneContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.fallbackCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.fallbackCtx = new AudioContextClass();
      }
    }
    return this.fallbackCtx;
  }

  public destroy(): void {
    if (this.unsubscribeSettings) {
      this.unsubscribeSettings();
      this.unsubscribeSettings = undefined;
    }
    this.stopBGM();
    this.seCooldowns.clear();
  }
}
