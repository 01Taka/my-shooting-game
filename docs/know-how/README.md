# 汎用ノウハウ＆トラブルシューティング集 (`docs/know-how/`)

他の Phaser / Webゲーム開発でもそのまま流用・再利用できる、具体的なエラー解決策や技術レシピ集です。

---

## ドキュメント一覧

| ファイル                                                                                                               | 概要・対象エラー                                                                                                                                           |
| :--------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**01. スマホのタッチ操作制限＆ズーム・選択防止**](./01-mobile-touch-and-zoom-prevention.md)                           | 連打時のピンチズーム・ダブルタップズームを `touch-action: none` と iOS Safari の `gesturestart` 抑止で完全防止するレシピ。テキスト選択バーや青い枠の消去。 |
| [**02. フルスクリーンAPIと横画面（Landscape）固定**](./02-fullscreen-and-orientation.md)                               | ブラウザを全画面化し横向きに固定する API 実装。iOS Safari の制約と PWA 対応、縦画面回転案内 CSS ガード。                                                   |
| [**03. Phaser 4 の Group.children 仕様変更エラー解決法**](./03-phaser4-group-children-error.md)                        | `Uncaught TypeError: this.bullets.children.each is not a function` の原因と、Phaser 4 の `Set<GameObject>` 仕様に対応する `getChildren()` ループの書き方。 |
| [**04. Phaser文字がぼやける原因とスーパーサンプリング(SSAA)技法**](./04-phaser-text-blurriness-and-ssaa.md)            | `Scale.FIT` 拡大や Retina 画面で文字がぼやける根本原因と、フォントを巨大サイズで描画して縮小するスーパーサンプリング技法の実装。                           |
| [**05. Reactモーダルのタップ突き抜け防止とキャプチャフェーズの罠**](./05-modal-input-pass-through-and-capture-trap.md) | Phaser Canvas の上に React モーダルを重ねたときのタップ突き抜け防止法と、最外層で `capture: true` を使うとボタンが押せなくなる落とし穴の解説。             |
| [**06. ツインバーチャルスティックとマルチタッチ制御**](./06-virtual-twin-stick-multi-touch.md)                         | 左右の親指で移動と攻撃を同時に操作するツインスティック設計。ポインターIDバインド、デッドゾーン、角度補正（Rotation）の汎用実装レシピ。                     |
| [**07. タッチ操作とマウス操作の判定とUI出し分け**](./07-detect-touch-vs-mouse-pointer-type.md)                         | `pointerType`（Pointer Events API）によるタッチ/マウス判別と、CSS `hover`/`pointer` メディアクエリによる動的UI切り替え設計パターン。                       |
| [**08. サウンド管理設計とAutoplay Policy対策**](./08-audio-manager-and-autoplay-policy.md)                             | Web Audio の自動再生制限（Autoplay Policy）解除、SE多重発音のクールダウン、プロシージャル合成音フォールバック、React設定連携の汎用設計。                   |
| [**09. 視線先行(Look-ahead)カメラと広大ワールドの全方位設計**](./09-lookahead-camera-and-world-bounds.md)              | 自機中心のカメラ追従と視線先行オフセット（Lerp補間）、カメラ移動時のマウス座標（worldX/worldY）の罠、全方位敵スポーンと追従移動レシピ。                    |
| [**10. シーン終了時のGroupクリアによるchildrenエラー**](./10-scene-shutdown-group-clear-error.md)                      | `Scene.stop()` 時に `group.clear()` で `children is undefined` 例外が発生する原因と安全ガード、`once` による多重登録防止法。                               |

---

## トラブルシューティング逆引き

- **「スマホでマルチタップすると画面が拡大縮小してしまう」** ➔ [01. スマホのタッチ操作制限](./01-mobile-touch-and-zoom-prevention.md)
- **「iPhoneで全画面表示にならない」** ➔ [02. フルスクリーンAPIと横画面固定](./02-fullscreen-and-orientation.md)
- **「`children.each is not a function` というエラーが出る」** ➔ [03. Phaser 4 の Group.children 仕様変更](./03-phaser4-group-children-error.md)
- **「Phaserの文字がぼやけて粗い」** ➔ [04. Phaser文字がぼやける原因とSSAA技法](./04-phaser-text-blurriness-and-ssaa.md)
- **「モーダルを開いているのに後ろのゲームが動く / モーダルの閉じるボタンが押せない」** ➔ [05. Reactモーダルのタップ突き抜け防止](./05-modal-input-pass-through-and-capture-trap.md)
- **「両手でバーチャルスティックを操作すると指が競合する・スティックが戻らない」** ➔ [06. ツインバーチャルスティックとマルチタッチ制御](./06-virtual-twin-stick-multi-touch.md)
- **「指でタップされたかマウスでクリックされたかを判別してUIを切り替えたい / 疑似クリックを防ぎたい」** ➔ [07. タッチ操作とマウス操作の判定とUI出し分け](./07-detect-touch-vs-mouse-pointer-type.md)
- **「スマホで音が鳴らない / 連射時に効果音が割れて爆音になる」** ➔ [08. サウンド管理設計とAutoplay Policy対策](./08-audio-manager-and-autoplay-policy.md)
- **「カメラ追従時にマウスエイムの向きがズレる / 進行方向の視界が狭い」** ➔ [09. 視線先行カメラと広大ワールド設計](./09-lookahead-camera-and-world-bounds.md)
- **「リザルト画面でリトライやタイトルに戻ると `children is undefined` で落ちる」** ➔ [10. シーン終了時のGroupクリアエラー](./10-scene-shutdown-group-clear-error.md)
