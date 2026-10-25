# Phaser 3/4 におけるツインバーチャルスティックとマルチタッチ制御

スマホ・タブレット向けアクション/シューティングゲームで、左右両手による「ツインバーチャルスティック（移動スティック＋攻撃/エイムスティック）」をPhaserで堅牢に実装するためのノウハウと設計パターンです。

---

## 1. 発生しやすい課題・不具合

1. **マルチタッチの競合・取りこぼし**:
   - `this.input.addPointer()` の設定が不足していると、左手で移動しながら右手でショットした際に2本目の指が認識されない。
   - `pointerdown` や `pointermove` で「どちらの指がどちらのスティックを操作しているか」を追跡できない。
2. **ノブの硬直・戻り忘れ**:
   - 画面外やスティック外で指を離した際（`pointerupoutside`）のイベントを拾えないと、指を離してもスティックが倒れっぱなしになり暴走する。
3. **デッドゾーン未設定による誤操作**:
   - 微細なタッチのブレで意図しない方向に射撃や移動が発生する。

---

## 2. 解決策と設計パターン

### ① マルチタッチポインターの有効化

Phaserのデフォルトではアクティブなポインター数が少なめに設定されているため、シーン初期化時に必ずポインターを追加します。

```typescript
// ControllerScene の create()
this.input.addPointer(3); // 左右の親指 + 予備
```

### ② ポインターIDによる1対1バインド

画面の左半分（`x < width / 2`）と右半分（`x >= width / 2`）で `pointerdown` を検知し、ポインターの一意な `id`（`pointer.id`）をスティックオブジェクトに紐付けます。

```typescript
protected handlePointerDown(pointer: Phaser.Input.Pointer) {
  const { width } = this.scale;

  // 左半分: 移動スティックに未割り当てならバインド
  if (pointer.x < width / 2 && this.moveStick.pointerId === null) {
    this.moveStick.pointerId = pointer.id;
    this.updateStickPosition(this.moveStick, pointer.x, pointer.y);
  }
  // 右半分: 攻撃スティックに未割り当てならバインド
  else if (pointer.x >= width / 2 && this.shootStick.pointerId === null) {
    this.shootStick.pointerId = pointer.id;
    this.updateStickPosition(this.shootStick, pointer.x, pointer.y);
  }
}
```

### ③ デッドゾーンとベクトル正規化

スティック中心からの変位 `(dx, dy)` を計算し、最大半径でクランプしつつ、デッドゾーン未満の場合は入力をゼロクリアします。

```typescript
const distance = Math.hypot(dx, dy);
const angle = Math.atan2(dy, dx);

// 最大半径でクランプ
const clampedDist = Math.min(distance, stick.maxRadius);
stick.knob.setPosition(Math.cos(angle) * clampedDist, Math.sin(angle) * clampedDist);

if (distance > stick.deadZone) {
  const force = Math.min(distance / stick.maxRadius, 1.0);
  stick.state.x = Math.cos(angle) * force; // -1.0 〜 1.0
  stick.state.y = Math.sin(angle) * force; // -1.0 〜 1.0
  stick.state.active = true;
  stick.state.angle = angle;
  stick.state.force = force;
} else {
  stick.state.x = 0;
  stick.state.y = 0;
  stick.state.active = false;
}
```

### ④ `pointerup` と `pointerupoutside` の両方を購読

画面外で指を離したり、急激なフリック操作で指がスティック外に出た場合も確実にリセットします。
また、ノブを中心に戻す際は Tween を挟むと操作のフィードバックが滑らかになります。

```typescript
this.input.on("pointerup", this.handlePointerUp, this);
this.input.on("pointerupoutside", this.handlePointerUp, this);

protected releaseStick(stick: StickVisuals) {
  stick.pointerId = null;
  stick.state.active = false;
  stick.state.x = 0;
  stick.state.y = 0;

  this.tweens.killTweensOf(stick.knob);
  this.tweens.add({
    targets: stick.knob,
    x: 0,
    y: 0,
    duration: 100,
    ease: Phaser.Math.Easing.Sine.Out,
  });
}
```

### ⑤ Full Dynamic Joystick（指追従スティック）の幾何計算

モバイルアクションゲームで「指が画面端まで大きくスライドした際にスティックから指が外れてしまう問題」を解決するため、最大半径（`maxRadius`）を超えた分だけ**ベース円の中心座標ごと指に引っ張られて移動するアルゴリズム**を採用します。

```typescript
// 指が最大半径を超えてスライドしたとき、中心座標をスライド移動させる
if (distance > stick.maxRadius) {
  const excess = distance - stick.maxRadius;
  stick.baseX += Math.cos(angle) * excess;
  stick.baseY += Math.sin(angle) * excess;
  stick.container.setPosition(stick.baseX, stick.baseY);

  // 追従後の相対変位を再計算
  dx = pointerX - stick.baseX;
  dy = pointerY - stick.baseY;
  distance = Math.hypot(dx, dy);
  angle = Math.atan2(dy, dx);
}
```

指を離した際（`pointerup`）は、Tween を使ってベース円を画面隅のデフォルト位置（`originX`, `originY`）へ滑らかに戻します。

```typescript
this.tweens.add({
  targets: stick.container,
  x: stick.originX,
  y: stick.originY,
  alpha: 0.6,
  duration: 200,
  ease: Phaser.Math.Easing.Sine.Out,
});
```

````

---

## 3. シューティングにおける角度（Rotation）の補正ノウハウ

Phaserの幾何計算（`Math.atan2`）では **「0度は右方向（X軸正の向き）」** です。
しかし、上向きに描かれた自機スプライトや縦スクロール弾の場合、以下のように `+ Math.PI / 2`（90度）の補正を加える必要があります。

```typescript
// 自機画像が上向きを基準に作成されている場合
this.player.setRotation(shootAngle + Math.PI / 2);
bullet.setRotation(shootAngle + Math.PI / 2);
````

これにより、スティックを倒した方向に正確に自機が向き、弾が飛ぶようになります。
