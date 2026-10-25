# ドキュメント体系と運用ガイドライン (`docs/`)

本リポジトリでは、開発を通じて得られた知見を以下の 2 つのディレクトリに明確に分離して記録・運用しています。

```
docs/
├── README.md               # 本ドキュメント（運用ルール・全体インデックス）
├── know-how/               # 【汎用ノウハウ】具体的なエラー・不具合の解決策、汎用技術レシピ
└── dev-note/               # 【設計思想】本プロジェクトの選定理由、思考フレームワーク、設計思想
```

---

## 1. 2つのディレクトリの役割と書き分けルール

| ディレクトリ                                 | 主な対象読者・用途                                   | 記録する内容の基準                                                                                                                                                                                                                     |
| :------------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`docs/know-how/`**<br>(ノウハウ・レシピ集) | **「他のゲーム開発でもそのまま使いたい」とき**       | ・具体的なエラー、不具合の発生メカニズムと解決策<br>・ブラウザの仕様制限（iOS Safariのズーム等）の回避コード<br>・フレームワークの落とし穴や仕様変更の回避ノウハウ<br>・コピペして他のPhaser/Webゲームプロジェクトに流用できる汎用情報 |
| **`docs/dev-note/`**<br>(設計思想・開発録)   | **「なぜこの実装・構成にしたのか」を理解したいとき** | ・技術スタックの選定理由や比較検討の過程<br>・アーキテクチャ設計思想（シーン構成、ハイブリッド設計）<br>・UXやUIレイアウトの意図、思考フレームワーク<br>・本ゲーム固有の意思決定プロセスやトレードオフの記録                           |

---

## 2. 運用ルール（運用の仕方）

新しい知見や変更が発生した際は、以下のフローでドキュメントを追加・更新します。

1. **エラー・バグ解決時 ➔ `know-how/` へ追加**
   - 「どんなエラーメッセージが出たか」「何が原因だったか」「どう修正すべきか（汎用コード）」の3点セットで記述する。
   - プロジェクト固有のファイル名に依存せず、他のプロジェクトでも役立つ形式にする。
2. **設計変更・スタック選定時 ➔ `dev-note/` へ追加**
   - 「なぜその技術を選んだか」「他の選択肢（Canvas自作 vs React等）をなぜ捨てたか」「どんなトレードオフがあったか」の意思決定ログとして記述する。
3. **インデックスの更新**
   - 新しいドキュメントを作成した際は、`docs/know-how/README.md` または `docs/dev-note/README.md` の目次テーブルを更新する。

---

## 3. 全体インデックス

### 📘 [know-how/ (汎用ノウハウ・トラブルシューティング)](./know-how/README.md)

- [01. スマホのタッチ操作制限＆ズーム・選択防止](./know-how/01-mobile-touch-and-zoom-prevention.md)
- [02. フルスクリーンAPIと横画面（Landscape）固定](./know-how/02-fullscreen-and-orientation.md)
- [03. Phaser 4 の Group.children 仕様変更エラー解決法](./know-how/03-phaser4-group-children-error.md)
- [04. Phaser文字がぼやける原因とスーパーサンプリング(SSAA)技法](./know-how/04-phaser-text-blurriness-and-ssaa.md)
- [05. Reactモーダルのタップ突き抜け防止とキャプチャフェーズの罠](./know-how/05-modal-input-pass-through-and-capture-trap.md)
- [06. ツインバーチャルスティックとマルチタッチ制御](./know-how/06-virtual-twin-stick-multi-touch.md)
- [07. タッチ操作とマウス操作の判定とUI出し分け](./know-how/07-detect-touch-vs-mouse-pointer-type.md)
- [08. サウンド管理設計とAutoplay Policy対策](./know-how/08-audio-manager-and-autoplay-policy.md)
- [09. 視線先行(Look-ahead)カメラと広大ワールドの全方位設計](./know-how/09-lookahead-camera-and-world-bounds.md)

### 📙 [dev-note/ (設計思想・思考フレームワーク)](./dev-note/README.md)

- [01. 技術スタック選定理由とハイブリッド設計思想 (Phaser × React × Zustand)](./dev-note/01-tech-stack-and-architecture.md)
- [02. 7シーン構成の理由と静止画面オーバーレイによるUX設計](./dev-note/02-scene-composition-and-overlay-ux.md)
- [03. なぜ設定画面を Phaser ではなく React で構築したのか](./dev-note/03-settings-modal-in-react.md)
- [04. あらゆるゲームに派生できるモジュール設計思想](./dev-note/04-template-extensibility-design.md)
- [05. スマホ横画面ゲームにおける解像度・アスペクト比と操作系UX設計](./dev-note/05-mobile-landscape-game-design.md)
