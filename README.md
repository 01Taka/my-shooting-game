# Phaser 4 + React ゲーム開発テンプレート 🎮

大学のプログラミング学習やゲーム制作にすぐ使える、**Phaser + React + TypeScript + Vite** のスターターテンプレートです。

---

## 🏁 テンプレートの使い方（はじめの一歩）

### 1. GitHub 上で自分のゲーム用リポジトリを作成
1. このページ右上にある緑色の **「Use this template」**（このテンプレートを使用）ボタンをクリックします。
2. **「Create a new repository」** を選択します。
3. **Repository name** に好きなゲーム名（例: `my-action-game`）を入力します。
4. **「Create repository」** をクリックすると、あなた専用のリポジトリが作成されます。

### 2. 自分のパソコンにクローン（ダウンロード）
作成された自分用のリポジトリページで、緑色の **「Code」** ボタンをクリックしてURLをコピーし、ターミナルで以下を実行します：

```bash
git clone <コピーしたURL>
cd <作ったリポジトリ名>
```

※ VS Code をお使いの場合は、メニューの **「ファイル」→「フォルダを開く」** でクローンしたフォルダを開いてください。

---

## 🚀 クイックスタート（起動手順）

### 1. 依存ライブラリのインストール
ターミナルを開いて、以下のコマンドを実行します：
```bash
npm install
```

### 2. 開発サーバーの起動
```bash
npm run dev
```
ターミナルに表示されたURL（例: `http://localhost:5173/`）が自動でブラウザで開き、ゲーム画面が表示されます。  
コードを編集して保存すると、ブラウザが自動でリロードされて変更が即座に反映されます。

---

## 📁 フォルダ構成と「どこをいじるか」

```text
├── public/                 # 画像・BGM・効果音などのアセットを置く場所
│   └── favicon.svg         # タブアイコン
│
└── src/
    ├── scenes/
    │   └── MainScene.ts    # ★一番よく触る！ゲーム本体のコード（キャラ移動やルール）
    │
    ├── App.tsx             # 画面全体のレイアウト・スコアやボタン等のReact UI
    ├── PhaserGame.tsx      # ゲーム画面のサイズ（幅・高さ）や背景色の設定
    ├── EventBus.ts         # ゲーム（Phaser）と画面（React）の間でデータを渡す連絡係
    ├── index.css           # スタイルシート（Tailwind CSS）
    └── main.tsx            # エントリーポイント
```

### 主な編集ポイント

- **ゲームの処理を作りたい・変えたいとき**  
  👉 [`src/scenes/MainScene.ts`](src/scenes/MainScene.ts) を編集します。  
  - `preload()`: 画像や音の読み込み
  - `create()`: キャラの初期配置やキーボード入力の設定
  - `update()`: 毎フレームの移動や当たり判定

- **ゲームの解像度（画面の大きさ）を変えたいとき**  
  👉 [`src/PhaserGame.tsx`](src/PhaserGame.tsx) の `width` / `height` / `backgroundColor` を調整します。

- **スコア表示やゲームオーバー画面などを作りたいとき**  
  👉 [`src/App.tsx`](src/App.tsx) にReactのボタンやテキストを追加します。

---

## 🎨 画像を追加して表示する手順（例）

1. 表示したい画像（例: `player.png`）を `public/` フォルダに入れます。
2. [`src/scenes/MainScene.ts`](src/scenes/MainScene.ts) で読み込んで表示します：

```ts
preload() {
  // 1. 画像の読み込み（public/player.png を 'player' という名前で登録）
  this.load.image('player', '/player.png');
}

create() {
  // 2. 画面の中央に配置
  const { width, height } = this.scale;
  this.add.image(width / 2, height / 2, 'player');
}
```

---

## 🛠️ コマンド一覧

| コマンド | 説明 |
| :--- | :--- |
| `npm run dev` | 開発サーバーを起動（作成中のゲームをブラウザで確認） |
| `npm run build` | 公開用ファイルのビルド（エラーチェックと最適化） |
| `npm run preview` | ビルドした完成品をローカルでプレビュー確認 |
| `npm run lint` | コードの構文チェック |

---

## ❓ よくある質問・困ったときは

- **画面が真っ白になった / 動かなくなった**
  - ブラウザの「デベロッパーツール（F12 または 右クリック → 検証）」を開き、「Console（コンソール）」タブに赤いエラーメッセージが出ていないか確認してください。
- **VS Codeでエラーの赤波線がたくさん出る**
  - `npm install` が完了しているか確認してください。
  - 改善しない場合は、VS Codeのコマンドパレット（`Ctrl+Shift+P` / `Cmd+Shift+P`）から `TypeScript: Restart TS Server`（TSサーバーの再起動）を実行してみてください。
