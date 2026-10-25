# スマホ横画面 Webゲーム開発ノウハウ集 (Phaser 4 × React × TypeScript)

スマートフォン（iOS / Android）の横画面ブラウザで快適に遊べるWebゲームを、Phaser 4 と React 19 を組み合わせて構築する際の設計・実装ベストプラクティスをまとめたドキュメントです。

---

## 目次

1. [スマホ横画面のためのブラウザ制御＆操作制限](#1-スマホ横画面のためのブラウザ制御操作制限)
   - [マルチタップによる画面拡大縮小（ズーム）の防止](#11-マルチタップによる画面拡大縮小ズームの防止)
   - [文字選択・長押しメニュー・青いハイライトの防止](#12-文字選択長押しメニュー青いハイライトの防止)
   - [フルスクリーン化と横画面（Landscape）固定](#13-フルスクリーン化と横画面landscape固定)
   - [縦画面時の「横向き回転」案内オーバーレイ](#14-縦画面時の横向き回転案内オーバーレイ)
2. [小〜中規模ゲームに推奨されるライブラリ選定](#2-小中規模ゲームに推奨されるライブラリ選定)
3. [Phaser 4 シーン構成アーキテクチャ](#3-phaser-4-シーン構成アーキテクチャ)
   - [7シーンの役割と起動タイプ](#31-7シーンの役割と起動タイプ)
   - [メイン画面とオーバーレイ画面の使い分け](#32-メイン画面とオーバーレイ画面の使い分け)
   - [Phaser 4 における Group.children の仕様変更](#33-phaser-4-における-groupchildren-の仕様変更)
4. [React と Phaser の連携＆UIモーダルの入力突き抜け対策](#4-react-と-phaser-の連携uiモーダルの入力突き抜け対策)
   - [責務の分離（ゲーム描画はPhaser、設定UIはReact）](#41-責務の分離ゲーム描画はphaser設定uiはreact)
   - [背後シーンがタップ判定を拾ってしまう問題のメカニズム](#42-背後シーンがタップ判定を拾ってしまう問題のメカニズム)
   - [多重防御による完全遮断（Phaser input制御 ＋ DOMキャプチャ遮断）](#43-多重防御による完全遮断phaser-input制御--domキャプチャ遮断)
5. [あらゆるゲームに派生できるモジュール設計](#5-あらゆるゲームに派生できるモジュール設計)
6. [Phaser の文字（Text）がぼやける理由と高解像度化ノウハウ](#6-phaser-の文字textがぼやける理由と高解像度化ノウハウ)

---

## 1. スマホ横画面のためのブラウザ制御＆操作制限

スマートフォンのブラウザ（特に iOS Safari と Android Chrome）は、通常のWebサイト閲覧を前提としたジェスチャやメニューがデフォルトで有効になっています。アクションゲームや連打を伴う操作で画面が拡大されたり、文字選択バーが出たりするのを完全に抑止する必要があります。

### 1.1 マルチタップによる画面拡大縮小（ズーム）の防止

よく使われる `touch-action: manipulation;` は「ダブルタップズーム」は防ぎますが、**2本指以上のピンチイン・ピンチアウト操作によるズームは許可されてしまいます**。

```css
/* src/index.css */
html,
body,
#root {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100dvh; /* アドレスバーの伸縮に追従 */
  overflow: hidden;
  touch-action: none; /* ← none を指定してピンチズームも完全遮断 */
}
```

```html
<!-- index.html -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
/>
```

#### iOS Safari 対策 (JavaScript)

iOS Safari は CSS や `user-scalable=no` を一部無視して拡大することがあるため、ジェスチャイベントを直接キャンセルします。

```ts
// src/main.tsx
window.addEventListener("gesturestart", (e) => e.preventDefault());
window.addEventListener("gesturechange", (e) => e.preventDefault());
window.addEventListener("gestureend", (e) => e.preventDefault());
```

---

### 1.2 文字選択・長押しメニュー・青いハイライトの防止

ゲーム連打時や長押し時に、テキスト選択やブラウザのコンテキストメニューが出るのを防ぎます。

```css
/* src/index.css */
html,
body,
#root {
  -webkit-user-select: none;
  user-select: none; /* テキスト選択の禁止 */
  -webkit-touch-callout: none; /* iOS長押し時の画像保存・リンクメニュー禁止 */
  -webkit-tap-highlight-color: transparent; /* タップ時の一瞬の青い枠を消す */
}
```

```ts
// src/main.tsx
window.addEventListener("contextmenu", (e) => e.preventDefault());
```

---

### 1.3 フルスクリーン化と横画面（Landscape）固定

ブラウザのセキュリティ制限上、**タップやクリックなどのユーザー操作をトリガー**としてのみ実行可能です。

```ts
export const enterFullscreen = async () => {
  const elem = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };

  // 1. フルスクリーン化
  if (elem.requestFullscreen) {
    await elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) {
    await elem.webkitRequestFullscreen();
  }

  // 2. 横画面に固定（Android Chrome等で動作）
  if (screen.orientation && "lock" in screen.orientation) {
    try {
      await (screen.orientation as any).lock("landscape");
    } catch {
      // 未対応ブラウザは無視
    }
  }
};
```

> **iOS (iPhone Safari) の特性**  
> iPhone Safari は標準の `requestFullscreen` API をサポートしていません。  
> そのため、`index.html` に `<meta name="apple-mobile-web-app-capable" content="yes" />` を付与し、「ホーム画面に追加」して PWA として起動させることでアドレスバーのない完全全画面アプリとして遊ぶことができます。

---

### 1.4 縦画面時の「横向き回転」案内オーバーレイ

CSSメディアクエリの `orientation: portrait`（Tailwind の `portrait:` バリアント）を利用し、スマホを縦に持っている間はゲーム画面を隠して回転を促すオーバーレイを表示します。

```tsx
<div className="fixed inset-0 z-50 hidden flex-col items-center justify-center bg-slate-950/95 p-6 text-center text-white backdrop-blur-sm portrait:flex">
  <RotateDeviceIcon className="h-16 w-16 animate-bounce text-sky-400" />
  <p className="text-lg font-bold">画面を横向きにしてください</p>
  <p className="text-sm text-slate-400">このゲームは横画面プレイ専用です。</p>
</div>
```

---

## 2. 小〜中規模ゲームに推奨されるライブラリ選定

| ライブラリ                    | 役割                   | 採用理由・メリット                                                                                                                                      |
| :---------------------------- | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`zustand`**                 | ゲーム全体の状態管理   | React コンポーネント外（Phaser の Scene コールバック内）からでも `useGameSettings.getState()` で直接ステートの読み書きが可能。Context不要で極めて軽量。 |
| **`zod`**                     | データバリデーション   | LocalStorage に保存するセーブデータやハイスコア、設定項目の安全な型チェック・パース。                                                                   |
| **`lucide-react`**            | UIアイコン             | 全画面切替、音量ON/OFF、閉じるボタンなどの軽量SVGアイコン群。                                                                                           |
| **`canvas-confetti`**         | クリア・祝福エフェクト | ステージクリア時やハイスコア更新時に手軽に紙吹雪を打ち上げる。                                                                                          |
| **`clsx` / `tailwind-merge`** | スタイルユーティリティ | 状態に応じたTailwindクラスの動的結合や競合解消。                                                                                                        |

---

## 3. Phaser 4 シーン構成アーキテクチャ

### 3.1 7シーンの役割と起動タイプ

ゲーム体験を快適にするため、シーンを機能ごとに分離した構成です。

```
PreloadScene (初期読み込み)
    │
    ▼ scene.start
TitleScene (タイトル・スタート)
    │
    ▼ scene.start
GameScene (ゲーム本体・物理演算)
    ├── [並行起動: launch] UIScene (HPバー、スコア、ポーズ)
    ├── [並行起動: launch] ControllerScene (バーチャル十字キー、SHOTボタン ※タッチ時)
    └── [ゲームオーバー時: launch] ResultScene (静止したゲーム画面の上に重ねて表示)
```

| シーン名              | 役割                               | 起動タイプ                        | 呼び出し元                                           |
| :-------------------- | :--------------------------------- | :-------------------------------- | :--------------------------------------------------- |
| **`PreloadScene`**    | アセット読み込み、プログレスバー   | **初期起動**                      | ゲーム起動時に配列先頭で自動起動                     |
| **`TitleScene`**      | タイトル表示、スタート・設定ボタン | **メイン画面** (`scene.start`)    | Preload完了時、または各シーンの「タイトルへ」        |
| **`GameScene`**       | 自機、敵、弾、当たり判定、物理演算 | **メイン画面** (`scene.start`)    | タイトルのスタート、Resultのリトライ                 |
| **`UIScene`**         | HPバー、スコア、ポーズボタン       | **オーバーレイ** (`scene.launch`) | GameScene 作成時に自動並行起動                       |
| **`ControllerScene`** | バーチャル十字キー、ショットボタン | **オーバーレイ** (`scene.launch`) | GameScene 作成時にタッチ端末検知で自動起動           |
| **`ResultScene`**     | クリア／ゲームオーバー演出、スコア | **オーバーレイ** (`scene.launch`) | GameScene でHPゼロ時にゲームを一時停止して重ねて表示 |

---

### 3.2 メイン画面とオーバーレイ画面の使い分け

- **`scene.start("NewScene")`**: 以前のシーンを破棄（または停止）して新しいメイン画面に遷移します。
- **`scene.launch("OverlayScene")`**: 現在のシーンを動かしたまま、その上に別のシーンを並行して重ねて描画します。
  - **ポーズやリザルト画面の極意**: `GameScene` を `this.scene.pause("GameScene")` で停止した上で `ResultScene` を `launch` することで、**背後に静止したプレイ画面を残したまま半透明のダイアログを表示**できます。

---

### 3.3 Phaser 4 における Group.children の仕様変更

> [!IMPORTANT]
> **Phaser 3 と Phaser 4 の重要な違い**  
> Phaser 3 では `group.children.each()` が使えましたが、**Phaser 4 では `Group.children` は JavaScript 標準の `Set<GameObject>`** に変更されました。そのため、`.each()` を呼ぶと `TypeError: this.bullets.children.each is not a function` になります。

```ts
// ❌ Phaser 3 以前の書き方 (Phaser 4 ではエラー)
this.bullets.children.each((bullet) => { ... });

// ⭕ Phaser 4 での安全な書き方
const bullets = this.bullets.getChildren() as Phaser.Physics.Arcade.Image[];
for (const bullet of bullets) {
  if (bullet.active && bullet.y < -10) {
    bullet.destroy();
  }
}
```

---

## 4. React と Phaser の連携＆UIモーダルの入力突き抜け対策

### 4.1 責務の分離（ゲーム描画はPhaser、設定UIはReact）

- **Phaser の得意分野**: 高速な描画ループ、物理演算、パーティクル、スプライトアニメーション
- **React の得意分野**: スライダー、トグルスイッチ、フォーム、レスポンシブなモーダル、アクセシビリティ

設定画面などは Phaser の Canvas 内で図形を描いて自作するよりも、React + Tailwind CSS で構築する方が遥かに開発効率・デザインの美しさに優れます。

```
[TitleScene / UIScene (Phaser)]
       │ EventBus.emit("open-settings")
       ▼
[App.tsx (React)]
       │ useGameSettings.getState().openSettings()
       ▼
[SettingsModal (React / Tailwind)]
  ・画面表示（全画面切替）
  ・BGM / SE 音量スライダー
```

---

### 4.2 背後シーンがタップ判定を拾ってしまう問題のメカニズム

React の設定モーダルを表示した状態でモーダル上をタップすると、**背後の Phaser Canvas のボタンや自機が反応してしまうバグ**が発生します。

#### 原因

1. **React の合成イベントとブラウザのネイティブイベントの違い**:
   React の `onClick={(e) => e.stopPropagation()}` は React ツリー内でのバブリングを止めるだけであり、ブラウザネイティブの `pointerdown` や `touchstart` はすでに Canvas や Window に発火・到達しています。
2. **Phaser の常時入力リッスン**:
   Phaser の InputManager は Canvas や Window に直接イベントリスナーを登録しているため、HTML 要素が重なっていてもタッチ座標を拾ってしまいます。

---

### 4.3 多重防御による完全遮断（Phaser input制御 ＋ DOMキャプチャ遮断）

この問題は、以下の **2つの手法を組み合わせて完全に解決** します。

#### 防御策 1: モーダル開閉に合わせて Phaser の入力を一時停止

```tsx
// src/App.tsx
useEffect(() => {
  const game = phaserRef.current?.game;
  if (!game) return;

  if (isSettingsOpen) {
    // 設定モーダルが開いている間は Phaser の全入力を停止
    game.input.enabled = false;
    // 押しっぱなし状態が残らないようポインターをリセット
    game.input.pointers?.forEach((pointer) => pointer.reset());
  } else {
    // 閉じたら入力を再開
    game.input.enabled = true;
  }
}, [isSettingsOpen]);
```

#### 防御策 2: モーダル最外層でネイティブイベントをキャプチャフェーズで遮断

```tsx
// src/components/SettingsModal.tsx
const overlayRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const el = overlayRef.current;
  if (!el) return;

  const stopNativePropagation = (e: Event) => {
    e.stopPropagation();
  };

  const targetEvents = [
    "pointerdown",
    "pointerup",
    "pointermove",
    "mousedown",
    "mouseup",
    "touchstart",
    "touchend",
    "touchmove",
    "click",
    "contextmenu",
  ];

  targetEvents.forEach((evt) => {
    // capture: true でツリー上部から下りてくる段階で即座に遮断
    el.addEventListener(evt, stopNativePropagation, { capture: true });
  });

  return () => {
    targetEvents.forEach((evt) => {
      el.removeEventListener(evt, stopNativePropagation, { capture: true });
    });
  };
}, []);
```

---

## 5. あらゆるゲームに派生できるモジュール設計

ゲーム本体のシーンにおいて、「ゲーム固有の情報（テキスト、ルール、オブジェクト、コントローラー配列）」を専用メソッドとして切り出しておくことで、基盤構造を保ったまま別のゲームに簡単に派生できます。

### 切り出しの設計例 (`GameScene.ts`)

```ts
export class GameScene extends Phaser.Scene {
  // ==========================================
  // ゲーム特有の設定・ルール・パラメータ
  // （派生ゲーム作成時はここをオーバーライドまたは編集）
  // ==========================================
  protected getGameParameters() {
    return {
      initialHp: 100,
      playerSpeed: 250,
      enemyScore: 100,
    };
  }

  protected initGameObjects(width: number, height: number) {
    // 自機や敵グループの生成
  }

  protected setupCollisions() {
    // 当たり判定ルールの定義
  }

  protected handlePlayerInputAndActions(time: number) {
    // 入力に応じたプレイヤーの挙動
  }

  // ==========================================
  // 共通ライフサイクル（変更不要な基盤）
  // ==========================================
  create() {
    this.scene.launch("UIScene");
    if (this.sys.game.device.input.touch) {
      this.scene.launch("ControllerScene");
    }
    this.initGameObjects(this.scale.width, this.scale.height);
    this.setupCollisions();
  }
}
```

この構成にしておくことで、例えば `ActionGameScene` や `PuzzleGameScene` を作成する場合、クラスを継承して `getGameParameters()` や `setupCollisions()` だけをオーバーライドすれば、スマホ横画面制御やUIオーバーレイ、タッチ操作の仕組みをそのまま再利用できます。

---

## 6. Phaser の文字（Text）がぼやける理由と高解像度化ノウハウ

### ぼやける原因

1. **DPI = 1（基準解像度）でのラスタライズ**:  
   Phaser の `this.add.text()` は内部の非表示 `<canvas>` で文字を描いてテクスチャ化しますが、デフォルトでは `resolution: 1` で生成されます。
2. **`Scale.FIT` による拡大表示**:  
   基準解像度（800x450）からRetinaディスプレイや超高精細スマホ画面（幅2000px超）に拡大されるため、1倍解像度で作られた文字画像が引き伸ばされてボケてしまいます。

### 解決策: 高精細テキスト生成ヘルパー `addCrispText`

```ts
// src/utils/text.ts
export const getDeviceResolution = (): number => {
  if (typeof window === "undefined") return 2;
  // 端末の DPR に応じて最低2倍〜最大4倍の高密度テクスチャを生成
  return Math.min(Math.max(window.devicePixelRatio || 1, 2), 4);
};

export function addCrispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    resolution: getDeviceResolution(), // 高解像度キャンバスでラスタライズ
    padding: { x: 4, y: 4 }, // 文字端の欠け防止
    ...style,
  });
}
```

### レンダラー設定の追加 (`PhaserGame.tsx`)

```ts
render: {
  antialias: true,      // WebGLテクスチャのスムージング有効化
  antialiasGL: true,    // コンテキスト自体のアンチエイリアス有効化
  roundPixels: true,    // サブピクセル配置による文字のにじみ防止
}
```

これにより、800x450 の論理座標系を維持したまま、スマホ画面いっぱいに拡大しても**クッキリ鮮明で美しいテキスト描画**が実現します。
