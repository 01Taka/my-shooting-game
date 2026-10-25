import type Phaser from "phaser";

import { useGameSettings } from "../stores/useGameSettings";

export type SynthSoundType = "laser" | "explosion" | "hit" | "click" | "gameover";

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
  private readonly defaultCooldownMs = 40;

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
    const effectiveVolume = settings.bgmMuted ? 0 : settings.bgmVolume / 100;

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
    const effectiveVolume = muted ? 0 : volume / 100;
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
    if (settings.seMuted || settings.seVolume <= 0) return;

    // クールダウン（同一フレーム・短時間の爆音化防止）判定
    const now = performance.now();
    const lastPlayed = this.seCooldowns.get(key) || 0;
    if (now - lastPlayed < this.defaultCooldownMs) {
      return;
    }
    this.seCooldowns.set(key, now);

    const baseVolume = settings.seVolume / 100;
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
    return ["laser", "explosion", "hit", "click", "gameover"].includes(key);
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
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

        gain.gain.setValueAtTime(volume * 0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case "explosion": {
        // ホワイトノイズ＋ローパスフィルターによる爆発音
        const bufferSize = audioCtx.sampleRate * 0.35;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(60, now + 0.35);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(volume * 0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

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
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

        gain.gain.setValueAtTime(volume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }

      case "click": {
        // ピッという高音UIタップ音
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.setValueAtTime(1400, now + 0.015);

        gain.gain.setValueAtTime(volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      case "gameover": {
        // 哀愁のある下降アルペジオ音
        const freqs = [330, 294, 262, 196];
        freqs.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc.type = "square";
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);

          gain.gain.setValueAtTime(volume * 0.3, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * 0.15);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(now + idx * 0.15);
          osc.stop(now + (idx + 1) * 0.15);
        });
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
