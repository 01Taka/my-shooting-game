# Phaser 3/4 における視線先行（Look-ahead）カメラと広大ワールドの全方位設計

ツインスティックシューターやオープンワールド系アクションゲームにおいて、広大なワールド境界の設定、自機を中心とするカメラ追従、エイム方向への視線先行（Look-ahead）、およびカメラ移動時のマウス座標（Screen座標 vs World座標）の扱い方についての設計レシピです。

---

## 1. 発生しやすい課題と落とし穴

1. **画面端が見えず敵の襲撃に反応できない**:
   - キャラクターを画面の真ん中に固定しただけでは、進行方向やエイム先の視界が狭くなり、敵の弾や接近への対応が困難になる。
2. **カメラ急加速による画面酔い**:
   - プレイヤーが向きを急反転させた際、カメラオフセットを即座に適用すると画面がガタつき、プレイヤーが酔ってしまう。
3. **カメラ移動時のマウスクリック座標ズレ（頻出バグ）**:
   - カメラが移動すると、画面上の座標 `pointer.x` とゲーム世界内の座標が一致しなくなる。`pointer.x` を使ってエイムや弾の角度を計算すると、自機がまったく意図しない方向を向いてしまう。
4. **固定HUDやコントローラーの追従崩れ**:
   - 単一の Scene でカメラを移動させると、HPゲージやバーチャルスティックまでカメラと一緒に世界の中に置き去りにされて画面外へ消えてしまう。

---

## 2. 解決策と実装パターン

### ① 独立オーバーレイシーンによるHUD・UIの保護

HPバー（`UIScene`）やバーチャルパッド（`ControllerScene`）を `GameScene` とは別の独立したシーンとして並行起動（`this.scene.launch()`）します。
各オーバーレイシーンは独自の固定カメラ（原点 0, 0）を持つため、`GameScene` のメインカメラがワールドのどこを駆け巡っても、UIやコントローラーの位置は画面にピタッと固定されます。

### ② 視線先行（Look-ahead）カメラの補間（Lerp）計算

自機の位置から視線方向へオフセットした「見えない注視点（`cameraTarget`）」を用意し、カメラはそのターゲットを滑らかな慣性（Lerp: 0.06〜0.08）で追従させます。

```typescript
// 1. カメラ設定: 自機位置には 1:1 即時同期（遅延ゼロ: lerp=1）
this.cameras.main.setBounds(0, 0, worldSize, worldSize);
this.cameras.main.startFollow(this.cameraTarget, false, 1, 1);

// 2. update() 内での注視点計算（自機位置と視線オフセットの分離）
const currentAngle = this.player.rotation - Math.PI / 2; // 自機の向いている角度

// 上下方向は画面端までが狭いため大きく先行(240px)、左右は余裕があるため1/4程度(60px)に抑える
const lookDistanceY = isShooting || isMoving ? 240 : 60;
const lookDistanceX = isShooting || isMoving ? 60 : 15;

const targetOffsetX = Math.cos(currentAngle) * lookDistanceX;
const targetOffsetY = Math.sin(currentAngle) * lookDistanceY;

// 視線オフセット（相対値）のみを慣性（Lerp 0.06）で滑らかに補間
this.currentLookOffsetX = Phaser.Math.Linear(this.currentLookOffsetX, targetOffsetX, 0.06);
this.currentLookOffsetY = Phaser.Math.Linear(this.currentLookOffsetY, targetOffsetY, 0.06);

// カメラ注視点は「プレイヤー現在位置 ＋ 補間された視線オフセット」へ即時配置
// （これにより自機の移動には遅延ゼロで追従し、視線の変化だけが滑らかに追従する）
this.cameraTarget.x = this.player.x + this.currentLookOffsetX;
this.cameraTarget.y = this.player.y + this.currentLookOffsetY;
```

### ③ マウス座標の罠: `pointer.x` ではなく `pointer.worldX`

カメラがスクロールしている世界でマウスカーソルへのエイムや弾の発射を行う場合、スクリーン上の座標（`pointer.x, pointer.y`）ではなく、**カメラのスクロール量が加算されたワールド座標（`pointer.worldX, pointer.worldY`）** を使用します。

```typescript
// 誤り: カメラが動くとエイム方向がずれる
const angle = Math.atan2(pointer.y - this.player.y, pointer.x - this.player.x);

// 正しい: カメラの現在位置を考慮した世界座標を使う
const angle = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x);
```

### ④ 全方位スポーンとプレイヤー追従

固定画面の上部から降下する方式から、プレイヤーのカメラ視野外（全周囲360度、距離950px〜1150px）からスポーンさせ、`physics.moveToObject()` で自機をホーミング追跡させます。

```typescript
// 視野外のランダム角度へスポーン
const spawnAngle = Phaser.Math.RND.realInRange(0, Math.PI * 2);
const spawnDist = Phaser.Math.Between(950, 1150);
const spawnX = this.player.x + Math.cos(spawnAngle) * spawnDist;
const spawnY = this.player.y + Math.sin(spawnAngle) * spawnDist;

// 毎フレームの敵追従と向き合わせ
this.physics.moveToObject(enemy, this.player, speed);
const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
enemy.setRotation(angle + Math.PI / 2);
```
