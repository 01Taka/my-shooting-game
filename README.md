# Phaser 4 + React ゲーム開発テンプレート 🎮

大学のサークル活動やプログラミング学習、ゲームジャムですぐに使える、**Phaser 4 + React + TypeScript + Vite + Tailwind CSS** の本格ゲーム開発スターターテンプレートです。

スマホ（ツインバーチャルスティック・タッチ操作・横画面固定）とPC（キーボード・マウス）の**クロスプラットフォーム対応**、**Web Audioサウンド管理**、**React設定モーダル（音量・フルスクリーン切替）** など、Webゲームで必要な基盤がすべて最初から組み込まれています。外部画像や音源を一切用意しなくても、クローンしてすぐに動かせます。

---

## 🏁 テンプレートの使い方（はじめの一歩）

### 1. GitHub 上で自分のゲーム用リポジトリを作成

1. このページ右上にある緑色の **「Use this template」**（このテンプレートを使用）ボタンをクリックします。
2. **「Create a new repository」** を選択します。
3. **Repository name** に好きなゲーム名（例: `my-action-game`）を入力します。
4. **「Create repository」** をクリックすると、あなた専用のリポジトリが作成されます。

### 2. パソコンにクローン（ダウンロード）

作成されたリポジトリページで、緑色の **「Code」** ボタンをクリックしてURLをコピーし、ターミナルで以下を実行します：

```bash
git clone <コピーしたURL>
cd <作ったリポジトリ名>
```

※ VS Code をお使いの場合は、メニューの **「ファイル」→「フォルダを開く」** でクローンしたフォルダを開いてください。

---

## 🚀 クイックスタート（起動手順）

### 1. 依存ライブラリのインストール

```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ターミナルに表示されたURL（通常は `http://localhost:5173/`）がブラウザで開き、シューティングゲームが即座に遊べます。  
コードを編集して保存すると、ブラウザが自動更新（ホットリロード）されて変更が反映されます。

---

## 📁 フォルダ構成と役割

```text
├── docs/                       # 設計思想・ノウハウ・トラブルシューティング集
│   ├── dev-note/               # 設計思想・技術スタック選定理由・シーン設計
│   └── know-how/               # スマホ操作・ブラウザ仕様・Phaser tips集
│
├── public/                     # 画像・BGM・効果音などの静的アセット置き場
│   └── favicon.svg             # ファビコン
│
└── src/
    ├── scenes/                 # Phaserの各画面（シーン）
    │   ├── PreloadScene.ts     # アセットの読み込み ＆ ダミー図形生成
    │   ├── TitleScene.ts       # タイトル画面（開始ボタン、設定ダイアログ呼び出し）
    │   ├── GameScene.ts        # ★最重要！ゲーム本編（自機・敵・弾・衝突・スコア）
    │   ├── UIScene.ts          # ゲーム中HUD（スコア/HP表示、ポーズメニュー）
    │   ├── ControllerScene.ts  # スマホ用ツインバーチャルスティック操作
    │   ├── ResultScene.ts      # リザルト画面（ゲームオーバー/クリア、紙吹雪演出）
    │   └── index.ts            # シーンのエクスポート集約
    │
    ├── audio/
    │   └── AudioManager.ts     # BGM / SE再生・Autoplay Policy対策・音量管理
    ├── components/
    │   └── SettingsModal.tsx   # React製 設定モーダル（音量スライダー、フルスクリーン）
    ├── stores/                 # Zustandによる状態管理
    │   ├── useGameSettings.ts  # 音量設定・全画面状態・モーダル開閉
    │   └── useInputMode.ts     # タッチ/マウス操作モード判定
    ├── App.tsx                 # 画面全体のReactレイアウト（横画面案内・モーダル制御）
    ├── PhaserGame.tsx          # Phaserの初期化（1600x900 / 16:9比率）・リサイズ設定
    ├── EventBus.ts             # Phaser ⇄ React 間を繋ぐイベント通信バス
    └── main.tsx                # アプリケーションのエントリーポイント
```

---

## 🎮 ゲームのカスタマイズ（どこをいじるか？）

本テンプレートは **Template Method パターン** に基づいて設計されており、共通基盤を壊さずにゲームルールだけを安全に変更・拡張できます。

### 1. パラメータやルールを調整したいとき

👉 [`src/scenes/GameScene.ts`](src/scenes/GameScene.ts) の `getGameParameters()` を書き換えます。

```ts
protected getGameParameters() {
  return {
    initialHp: 100,            // 初期HP
    playerSpeed: 500,          // 自機の移動速度
    fireRateMs: 160,           // 弾の連射間隔（ミリ秒）
    bulletSpeed: 900,          // 弾の飛翔速度
    enemySpawnIntervalMs: 1000,// 敵の出現頻度
    enemySpeedMin: 200,        // 敵の最低速度
    enemySpeedMax: 360,        // 敵の最高速度
    enemyScore: 100,           // 撃破スコア
    enemyDamage: 25,           // 被弾ダメージ
  };
}
```

### 2. キャラクターやゲームオブジェクトを変えたいとき

👉 [`src/scenes/GameScene.ts`](src/scenes/GameScene.ts) の以下のメソッドを編集・オーバーライドします：

- `initGameObjects()`: プレイヤー・弾・敵などの生成
- `setupCollisions()`: 当たり判定と衝突時の処理
- `update()`: 毎フレームの更新ロジック

### 3. タイトル画面やリザルト画面の文字・ボタンを変えたいとき

- タイトル画面: [`src/scenes/TitleScene.ts`](src/scenes/TitleScene.ts) の `getTitleConfig()` や `getMenuButtons()`
- リザルト画面: [`src/scenes/ResultScene.ts`](src/scenes/ResultScene.ts) の `getResultConfig()` や `getActionButtons()`

### 4. 画面解像度を変えたいとき

👉 [`src/PhaserGame.tsx`](src/PhaserGame.tsx) の `width` / `height` / `backgroundColor` を調整します。（デフォルトは Retina・高解像度ディスプレイでクッキリ表示できる **1600 × 900** に設定されています）

---

## 🎨 画像・音声アセットの追加手順

初期状態では [`src/scenes/PreloadScene.ts`](src/scenes/PreloadScene.ts) 内でプログラム的に図形スプライトを自動生成しているため、外部ファイルなしで動作しています。オリジナルの画像や音声に差し替える場合は以下の手順で行います：

1. **アセットファイルを配置**  
   画像や音声を `public/` フォルダ（例: `public/assets/player.png`）に入れます。
2. **`PreloadScene.ts` でロード**  
   [`src/scenes/PreloadScene.ts`](src/scenes/PreloadScene.ts) の `loadCustomAssets()` に追加します：
   ```ts
   protected loadCustomAssets() {
     // 画像の読み込み
     this.load.image("player", "/assets/player.png");
     this.load.image("enemy", "/assets/enemy.png");

     // 音声の読み込み
     this.load.audio("laser", "/assets/laser.mp3");
     this.load.audio("bgm", "/assets/bgm.mp3");
   }
   ```
3. **ゲーム内で使用**
   - スプライト表示: `this.physics.add.image(x, y, 'player')`
   - 効果音再生: `AudioManager.getInstance().playSe('laser')`
   - BGM再生: `AudioManager.getInstance().playBgm('bgm')`

---

## 🕹️ 操作方法

| デバイス                     | 移動操作                         | 攻撃 / アクション                                  | 設定・ポーズ                 |
| :--------------------------- | :------------------------------- | :------------------------------------------------- | :--------------------------- |
| **PC (キーボード & マウス)** | `W, A, S, D` または `↑, ←, ↓, →` | `Space` キー または マウスクリック                 | 画面右上歯車アイコン / `ESC` |
| **スマホ / タブレット**      | 画面左側のバーチャルスティック   | 画面右側のバーチャルスティック（倒した方向へ発射） | 画面右上歯車アイコン         |

※ スマホで縦持ちした場合は、自動的に「横向き推奨メッセージ」が表示されます。

---

## 🛠️ コマンド一覧

| コマンド          | 説明                                                         |
| :---------------- | :----------------------------------------------------------- |
| `npm run dev`     | ローカル開発サーバーを起動（変更が即時反映）                 |
| `npm run build`   | TypeScriptチェック・フォーマット・Lintを経て本番ビルドを実行 |
| `npm run preview` | ビルド成果物（`dist/`）をローカルでプレビュー確認            |
| `npm run lint`    | ESLintによるコードの構文・ルールチェック                     |
| `npm run format`  | Prettierによるコード自動整形                                 |

---

## 📚 ドキュメント＆ノウハウ集 (`docs/`)

本テンプレートには、Webゲーム制作のノウハウをまとめた詳細なドキュメントが付属しています。サークル内の勉強会や、ゲームの機能拡張時の参考にしてください。

- **[設計思想・アーキテクチャ (docs/dev-note/)](docs/dev-note/README.md)**
  - [技術スタック選定理由とハイブリッド設計 (Phaser × React × Zustand)](docs/dev-note/01-tech-stack-and-architecture.md)
  - [7シーン構成の理由と静止画面オーバーレイによるUX設計](docs/dev-note/02-scene-composition-and-overlay-ux.md)
  - [あらゆるゲームに派生できるモジュール設計思想](docs/dev-note/04-template-extensibility-design.md)
  - [スマホ横画面ゲームにおける解像度・アスペクト比と操作系UX設計](docs/dev-note/05-mobile-landscape-game-design.md)
- **[汎用ノウハウ・トラブルシューティング (docs/know-how/)](docs/know-how/README.md)**
  - [スマホのタッチ操作制限＆ズーム・選択防止](docs/know-how/01-mobile-touch-and-zoom-prevention.md)
  - [フルスクリーンAPIと横画面（Landscape）固定](docs/know-how/02-fullscreen-and-orientation.md)
  - [Phaser文字がぼやける原因とスーパーサンプリング(SSAA)技法](docs/know-how/04-phaser-text-blurriness-and-ssaa.md)
  - [ツインバーチャルスティックとマルチタッチ制御](docs/know-how/06-virtual-twin-stick-multi-touch.md)
  - [サウンド管理設計とAutoplay Policy対策](docs/know-how/08-audio-manager-and-autoplay-policy.md)

---

## ❓ 困ったときは（FAQ）

- **Q. 画面が真っ白になって動かない**
  - ブラウザの開発者ツール（`F12` キー または 右クリック → 「検証」）を開き、「Console」タブにエラーが出ていないか確認してください。
- **Q. 音が鳴らない**
  - 最近のブラウザのセキュリティ仕様（Autoplay Policy）により、画面を1回以上タップ/クリックするまで音声を再生できません。画面をタップしてから動作をお確かめください。
- **Q. VS Code でコード全体に赤波線が出る**
  - ターミナルで `npm install` が完了しているか確認してください。
  - コマンドパレット（`Ctrl+Shift+P` / `Cmd+Shift+P`）から `TypeScript: Restart TS Server` を実行すると解決する場合があります。
