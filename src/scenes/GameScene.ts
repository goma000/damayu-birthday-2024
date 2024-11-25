import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private targetX: number | null = null;
  private moveSpeed!: number;
  private items!: Phaser.Physics.Arcade.Group;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;

  private lives: number = 5;
  private lifeImages: Phaser.GameObjects.Image[] = [];

  private isGameOver: boolean = false;

  private overlay!: Phaser.GameObjects.Rectangle;
  private gameOverText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('player', 'assets/player.png');
    this.load.image('scoreItem', 'assets/scoreItem.png');
    this.load.image('heart', 'assets/heart.png');
  }

  create() {
    // 画面サイズを取得
    const { width, height } = this.scale;

    // プレイヤーの移動速度を画面幅に応じて設定
    this.moveSpeed = width * 0.5;

    // プレイヤーキャラクターの作成
    this.player = this.physics.add.sprite(width / 2, height * 0.8, 'player');
    const playerSize = width * 0.2;
    this.player.setDisplaySize(playerSize, playerSize);
    this.player.setCollideWorldBounds(true);

    // タップ入力の処理
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // ターゲット位置を更新
      this.targetX = pointer.x;
    });

    // ライフ（ハート）の表示
    const heartWidth = width * 0.07; // ハートの表示幅（画面幅の5%）
    const heartHeight = heartWidth;
    const heartSpacing = heartWidth + (width * 0.005); // ハート間の間隔（ハートの幅 + 余白）
    const heartY = heartHeight / 2 + height * 0.02; // ハートのY座標

    for (let i = 0; i < this.lives; i++) {
      const heartX = width - (heartSpacing * (this.lives - i)) + (heartWidth / 2);
      const heart = this.add.image(heartX, heartY, 'heart');
      heart.setDisplaySize(heartWidth, heartHeight);
      heart.setScrollFactor(0);
      this.lifeImages.push(heart);
    }

    // アイテムのグループを作成
    this.items = this.physics.add.group();

    // アイテムを生成するタイマーイベントを設定（3秒ごとに生成）
    this.time.addEvent({
      delay: 3000, // ミリ秒
      callback: this.spawnItem,
      callbackScope: this,
      loop: true,
    });

    // プレイヤーとアイテムの衝突判定
    // @ts-ignore
    this.physics.add.overlap(this.player, this.items, this.collectItem, undefined, this);

    // スコア表示の設定
    const fontSize = Math.round(width * 0.07);
    this.scoreText = this.add.text(width * 0.02, height * 0.04, 'スコア: 0', {
      fontSize: `${fontSize}px`,
      color: '#ffffff',
    });
  }

  update(delta: number) {
    if (this.isGameOver) {
      return;
    }

    if (this.targetX !== null) {
      const playerX = this.player.x;
      const distance = this.targetX - playerX;
      const direction = Math.sign(distance);
      const velocity = direction * this.moveSpeed;
      this.player.setVelocityX(velocity);

      if (Math.abs(distance) < Math.abs(velocity * (delta / 1000))) {
        this.player.setX(this.targetX);
        this.player.setVelocityX(0);
        this.targetX = null;
      }
    } else {
      this.player.setVelocityX(0);
    }

    // アイテムが画面外に出たら処理
    this.items.children.each((item) => {
      const itemSprite = item as Phaser.Physics.Arcade.Image;
      if (itemSprite.y > this.scale.height) {
        itemSprite.destroy();
        this.loseLife();
      }
      return null;
    });
  }

  // アイテムを生成する関数
  private spawnItem() {
    const { width } = this.scale;
    const x = Phaser.Math.Between(width * 0.05, width * 0.95);
    const item = this.items.create(x, 0, 'scoreItem') as Phaser.Physics.Arcade.Image;

    const itemSize = width * 0.1;
    item.setDisplaySize(itemSize, itemSize);

    item.setVelocityY(this.scale.height * 0.3); // 下方向に速度を設定
    item.setCollideWorldBounds(false);
  }

  // アイテムを取得したときの処理
  private collectItem(
    // @ts-ignore
    player: Phaser.GameObjects.GameObject,
    item: Phaser.GameObjects.GameObject
  ) {
    item.destroy();
    this.score += 10;
    this.scoreText.setText('スコア: ' + this.score);
  }

  private loseLife() {
    if (this.lives > 0) {
      this.lives--;
      const lostHeart = this.lifeImages.pop();
      if (lostHeart) {
        lostHeart.destroy();
      }
      if (this.lives === 0) {
        this.gameOver();
      }
    }
  }

  private gameOver() {
    this.isGameOver = true;
    this.physics.pause();
    this.time.removeAllEvents();
  
    const { width, height } = this.scale;
  
    // オーバーレイを表示
    this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    this.overlay.setDepth(1);
  
    // ゲームオーバーのテキストを表示
    const fontSize = Math.round(width * 0.08);
    this.gameOverText = this.add.text(width / 2, height / 2 - 50, 'ゲームオーバー', {
      fontSize: `${fontSize}px`,
      color: '#ffffff',
    });
    this.gameOverText.setOrigin(0.5);
    this.gameOverText.setDepth(2);

    // スコアを表示
    const scoreText = this.add.text(width / 2, height / 2, `スコア: ${this.score}`, {
      fontSize: `${Math.round(width * 0.06)}px`,
      color: '#ffffff',
    });
    scoreText.setOrigin(0.5);
    scoreText.setDepth(2);
  
    // リスタートのテキストを追加
    const restartText = this.add.text(width / 2, height / 2 + 50, 'タップしてタイトルへ戻る', {
      fontSize: `${Math.round(width * 0.05)}px`,
      color: '#ffffff',
    });
    restartText.setOrigin(0.5);
    restartText.setDepth(2);
  
    // タップでスタート画面に戻る
    this.input.once('pointerdown', () => {
      this.scene.start('StartScene');
    });
  }
}
