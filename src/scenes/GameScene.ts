import Phaser from "phaser";

import { EventBus } from "../EventBus";

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private score = 0;
  private hp = 100;
  private maxHp = 100;
  private lastFired = 0;
  private enemyTimer!: Phaser.Time.TimerEvent;

  // バーチャルコントローラー等からの入力フラグ
  private virtualInput = {
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
  };

  constructor() {
    super("GameScene");
  }

  create() {
    const { width, height } = this.scale;

    this.score = 0;
    this.hp = 100;
    EventBus.emit("current-scene-ready", this);
    EventBus.emit("game-started");

    // 1. UI Scene をオーバーレイ起動
    this.scene.launch("UIScene", { hp: this.hp, maxHp: this.maxHp, score: this.score });

    // 2. タッチ端末、またはモバイル環境なら ControllerScene を起動
    // デスクトップでも確認できるようにタッチ可能判定または常時/クエリで判定
    const isTouchDevice =
      this.sys.game.device.input.touch || "ontouchstart" in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
      this.scene.launch("ControllerScene");
    }

    // 物理境界
    this.physics.world.setBounds(0, 0, width, height);

    // プレイヤー作成
    this.player = this.physics.add.image(width / 2, height - 60, "player");
    this.player.setCollideWorldBounds(true);

    // 弾グループ
    this.bullets = this.physics.add.group({
      defaultKey: "bullet",
      maxSize: 30,
    });

    // 敵グループ
    this.enemies = this.physics.add.group();

    // 敵出現タイマー
    this.enemyTimer = this.time.addEvent({
      delay: 1000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });

    // 弾と敵の衝突
    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      (bulletObj, enemyObj) => {
        bulletObj.destroy();
        enemyObj.destroy();
        this.addScore(100);
      },
      undefined,
      this,
    );

    // プレイヤーと敵の衝突
    this.physics.add.overlap(
      this.player,
      this.enemies,
      (_playerObj, enemyObj) => {
        enemyObj.destroy();
        this.damage(25);
      },
      undefined,
      this,
    );

    // キーボード入力初期化
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // ControllerScene からのイベントを受信
    this.events.on("controller-input", (input: typeof this.virtualInput) => {
      this.virtualInput = input;
    });

    // シーン破棄時のクリーンアップ
    this.events.on("shutdown", () => {
      this.enemyTimer.remove();
      this.events.off("controller-input");
    });
  }

  private spawnEnemy() {
    const { width } = this.scale;
    const x = Phaser.Math.Between(40, width - 40);
    const enemy = this.enemies.create(x, -20, "enemy") as Phaser.Physics.Arcade.Image;
    if (enemy) {
      enemy.setVelocityY(Phaser.Math.Between(100, 180));
    }
  }

  private addScore(points: number) {
    this.score += points;
    EventBus.emit("score-updated", this.score);
  }

  private damage(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
    EventBus.emit("hp-updated", this.hp);

    // 画面フラッシュ演出
    this.cameras.main.shake(150, 0.01);

    if (this.hp <= 0) {
      this.gameOver();
    }
  }

  private gameOver() {
    this.enemyTimer.paused = true;
    this.physics.pause();

    // ゲーム画面を停止させたまま ResultScene をオーバーレイ表示
    this.scene.pause("GameScene");
    this.scene.launch("ResultScene", {
      result: "gameover",
      score: this.score,
    });
  }

  update(time: number) {
    if (this.hp <= 0) return;

    const speed = 250;
    let vx = 0;
    let vy = 0;

    // キーボード入力またはバーチャルコントローラー入力
    const isLeft = (this.cursors && this.cursors.left.isDown) || this.virtualInput.left;
    const isRight = (this.cursors && this.cursors.right.isDown) || this.virtualInput.right;
    const isUp = (this.cursors && this.cursors.up.isDown) || this.virtualInput.up;
    const isDown = (this.cursors && this.cursors.down.isDown) || this.virtualInput.down;
    const isShoot = (this.cursors && this.cursors.space.isDown) || this.virtualInput.shoot;

    if (isLeft) vx -= speed;
    if (isRight) vx += speed;
    if (isUp) vy -= speed;
    if (isDown) vy += speed;

    this.player.setVelocity(vx, vy);

    // ショット発射（連射制限）
    if (isShoot && time > this.lastFired) {
      const bullet = this.bullets.get(
        this.player.x,
        this.player.y - 16,
      ) as Phaser.Physics.Arcade.Image | null;

      if (bullet) {
        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.setVelocityY(-400);
        this.lastFired = time + 180;
      }
    }

    // 画面外の弾・敵を消去
    this.bullets.children.each((b) => {
      const bullet = b as Phaser.Physics.Arcade.Image;
      if (bullet.active && bullet.y < -10) {
        bullet.destroy();
      }
      return null;
    });

    const { height } = this.scale;
    this.enemies.children.each((e) => {
      const enemy = e as Phaser.Physics.Arcade.Image;
      if (enemy.active && enemy.y > height + 20) {
        enemy.destroy();
      }
      return null;
    });
  }
}
