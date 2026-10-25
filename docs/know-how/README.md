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

---

## トラブルシューティング逆引き

- **「スマホでマルチタップすると画面が拡大縮小してしまう」** ➔ [01. スマホのタッチ操作制限](./01-mobile-touch-and-zoom-prevention.md)
- **「iPhoneで全画面表示にならない」** ➔ [02. フルスクリーンAPIと横画面固定](./02-fullscreen-and-orientation.md)
- **「`children.each is not a function` というエラーが出る」** ➔ [03. Phaser 4 の Group.children 仕様変更](./03-phaser4-group-children-error.md)
- **「Phaserの文字がぼやけて粗い」** ➔ [04. Phaser文字がぼやける原因とSSAA技法](./04-phaser-text-blurriness-and-ssaa.md)
- **「モーダルを開いているのに後ろのゲームが動く / モーダルの閉じるボタンが押せない」** ➔ [05. Reactモーダルのタップ突き抜け防止](./05-modal-input-pass-through-and-capture-trap.md)
- **「両手でバーチャルスティックを操作すると指が競合する・スティックが戻らない」** ➔ [06. ツインバーチャルスティックとマルチタッチ制御](./06-virtual-twin-stick-multi-touch.md)
- **「指でタップされたかマウスでクリックされたかを判別してUIを切り替えたい / 疑似クリックを防ぎたい」** ➔ [07. タッチ操作とマウス操作の判定とUI出し分け](./07-detect-touch-vs-mouse-pointer-type.md)
