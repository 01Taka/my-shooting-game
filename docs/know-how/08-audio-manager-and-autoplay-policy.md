# Webゲームにおけるサウンド管理設計とブラウザ自動再生制限（Autoplay Policy）対策

Phaser 3/4 および HTML5 Webゲームにおいて、BGM・効果音（SE）を安全かつ高品質に鳴らすためのサウンド管理設計と、ブラウザの音声制限（Autoplay Policy）を確実に解除するためのノウハウです。

---

## 1. 発生する課題とブラウザの制約

1. **Autoplay Policy（自動再生制限）**:
   - iOS Safari や Google Chrome などのモダンブラウザでは、ユーザーが画面をタップ/クリックする前にスクリプトから音声を再生しようとしても、Web Audio の `AudioContext` が `suspended`（停止）状態になり音が鳴りません。
2. **SEの多重発音・爆音化**:
   - シューティングゲームの連射時や複数の敵が一斉に被弾した際、同一フレームや数ミリ秒の間に同じSEが大量に再生されると、波形が重なり合って「爆音」や「音割れ」が発生します。
3. **外部音声アセット未配置時の無音問題**:
   - 開発中やプロトタイプ時に mp3/wav ファイルが用意できていないと、フィードバックが得られず手触りの検証が遅れます。
4. **UI（React / スライダー）との音量同期**:
   - 設定画面でBGMやSEの音量スライダーを変更した際、現在ループ再生中のBGMや以降のSEに即座に変更が反映される必要があります。

---

## 2. 解決策と設計パターン

### ① AudioContext のアンロック機構（Audio Unlocker）

初回タップ・キー押下（`pointerdown` / `keydown` / `touchend`）のイベントハンドラ内で、`AudioContext.resume()` を確実に実行します。

```typescript
private setupGlobalUnlockListeners(): void {
  const unlockHandler = () => {
    const audioCtx = this.getAudioContext();
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    window.removeEventListener("pointerdown", unlockHandler);
    window.removeEventListener("keydown", unlockHandler);
    window.removeEventListener("touchend", unlockHandler);
  };

  window.addEventListener("pointerdown", unlockHandler, { passive: true });
  window.addEventListener("keydown", unlockHandler, { passive: true });
}
```

### ② SE多重発音のクールダウン制御

同一の音声キー（例: `laser`）に対して最小間隔（クールダウン時間: 40ms 程度）を設け、連射時でも音が割れないように自動でスロットリングします。

```typescript
public playSE(key: string, options?: SoundPlayOptions): void {
  const now = performance.now();
  const lastPlayed = this.seCooldowns.get(key) || 0;
  if (now - lastPlayed < 40) {
    return; // 短時間の多重再生をスキップ
  }
  this.seCooldowns.set(key, now);

  // 実音声を再生
  this.game.sound.play(key, options);
}
```

### ③ Web Audio API によるプロシージャル合成音フォールバック

外部音声ファイルがキャッシュに登録されていない場合でも、Web Audio API の `OscillatorNode` や `BiquadFilterNode`、ホワイトノイズバッファを用いて即座にシンセサイザー音を合成・再生します。

- **レーザー音**: `sawtooth` 波の周波数を急降下（880Hz ➔ 110Hz）。
- **爆発音**: ランダムノイズバッファにローパスフィルターをかけて低音を強調。
- **UIクリック音**: `sine` 波を 1000Hz ➔ 1400Hz で 30ms 鳴らす。

これにより、アセットファイルがゼロの状態でも完全な効果音フィードバックを得られます。

### ④ 状態管理（Zustand）とのリアクティブ同期

設定ストア（`useGameSettings`）の変更を購読し、再生中のBGMインスタンスの音量をリアルタイムに書き換えます。

```typescript
useGameSettings.subscribe((state) => {
  const effectiveVolume = state.bgmMuted ? 0 : state.bgmVolume / 100;
  if (this.currentBgm && "setVolume" in this.currentBgm) {
    (this.currentBgm as Phaser.Sound.WebAudioSound).setVolume(effectiveVolume);
  }
});
```
