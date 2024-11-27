import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerSize!: number;
  private targetX: number | null = null;
  private moveSpeed!: number;
  private baseMoveSpeed!: number; // 元の移動速度
  private items!: Phaser.Physics.Arcade.Group;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private modeText!: Phaser.GameObjects.Text;
  private modeTextBackground!: Phaser.GameObjects.Graphics;
  private missHeight!: number; // アイテムが画面外に出たと判定する

  private itemSpawnDelay: number = 850; // アイテム生成の遅延（ミリ秒）
  private baseItemSpawnDelay: number = 850; // 元のアイテム生成の遅延
  private itemFallSpeed!: number; // アイテムの落下速度
  private baseItemFallSpeed!: number; // 元のアイテムの落下速度

  private scoreItemTimer?: Phaser.Time.TimerEvent;
  private speedItemTimer?: Phaser.Time.TimerEvent;
  private helpItemTimer?: Phaser.Time.TimerEvent;

  private lives: number = 5;
  private lifeImages: Phaser.GameObjects.Image[] = [];

  private isGameOver: boolean = false;

  private overlay!: Phaser.GameObjects.Rectangle;
  private gameOverText!: Phaser.GameObjects.Text;

  private speedBoostActive: boolean = false;
  private speedBoostTimer?: Phaser.Time.TimerEvent;

  private helpModeActive: boolean = false;
  private isHelpModeFirstTime: boolean = true;
  private helpModeTimer?: Phaser.Time.TimerEvent;
  private currentTargetItem: Phaser.Physics.Arcade.Image | null = null; // 現在のターゲットアイテム
  private scoreItemQueue: number[] = []; // ScoreItemのx座標を記録するキュー

  private predSpeedItem: number = 70; // SpeedItemを生成する確率（%）
  private predHelpItem: number = 30; // HelpItemを生成する確率（%）



  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('background', 'assets/background.png');
    this.load.image('background2', 'assets/background2.png');
    this.load.image('player', 'assets/player.png');
    this.load.image('player_right1', 'assets/player_right1.png');
    this.load.image('player_right2', 'assets/player_right2.png');
    this.load.image('player_right3', 'assets/player_right3.png');
    this.load.image('player_right4', 'assets/player_right4.png');
    this.load.image('player_left1', 'assets/player_left1.png');
    this.load.image('player_left2', 'assets/player_left2.png');
    this.load.image('player_left3', 'assets/player_left3.png');
    this.load.image('player_left4', 'assets/player_left4.png');
    this.load.image('heart', 'assets/heart.png');
    this.load.image('heart_less', 'assets/heart_less.png');
    this.load.image('scoreItem1', 'assets/scoreItem.png');
    this.load.image('scoreItem2', 'assets/scoreItem2.png');
    this.load.image('scoreItem3', 'assets/scoreItem3.png');
    this.load.image('speedItem', 'assets/speedItem.png');
    this.load.image('helpItem', 'assets/helpItem.png');
    this.load.image('player_help_left', 'assets/player_help_left.png');
    this.load.image('player_help_right', 'assets/player_help_right.png');
  }

  create() {
    // プロパティのリセット
    this.score = 0;
    this.lives = 5;
    this.isGameOver = false;
    this.lifeImages = [];
    this.speedBoostActive = false;
    this.helpModeActive = false;
    this.scoreItemQueue = [];
    this.targetX = null;
    this.currentTargetItem = null;

    // 画面サイズを取得
    const { width, height } = this.scale;

    // 背景の表示
    const background = this.add.image(width / 2, height / 2, 'background');
    background.setDisplaySize(width, height);

    // 背景要素の追加
    const background2 = this.add.image(width *0.95, height * 0.6, 'background2');
    background2.setDisplaySize(height * 0.7, height * 0.7);
    // アイテムが画面外に出たと判定する高さ（playerの足元）
    this.missHeight = height * 0.82;

    // プレイヤーの移動速度を画面幅に応じて設定
    this.baseMoveSpeed = width * 0.8;
    this.moveSpeed = this.baseMoveSpeed;

    // プレイヤーキャラクターの作成
    this.player = this.physics.add.sprite(width / 2, height * 0.8, 'player');
    this.playerSize = width * 0.25;
    this.player.setDisplaySize(this.playerSize, this.playerSize);
    this.player.setCollideWorldBounds(true);

    // 右向き走行アニメーション
    this.anims.create({
      key: 'run_right',
      frames: [
        { key: 'player_right1' },
        { key: 'player_right2' },
        { key: 'player_right3' },
        { key: 'player_right4' },
        { key: 'player_right3' },
        { key: 'player_right2' }
      ],
      frameRate: 10,
      repeat: -1
    });

    // 左向き走行アニメーション
    this.anims.create({
      key: 'run_left',
      frames: [
        { key: 'player_left1' },
        { key: 'player_left2' },
        { key: 'player_left3' },
        { key: 'player_left4' },
        { key: 'player_left3' },
        { key: 'player_left2' }
      ],
      frameRate: 10,
      repeat: -1
    });

    // タップ入力の処理
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // ターゲット位置を更新
      this.targetX = pointer.x;
    });

    // ライフ（ハート）の表示
    const heartWidth = width * 0.07; // ハートの表示幅（画面幅の5%）
    const heartHeight = heartWidth;
    const heartSpacing = heartWidth + (width * 0.005); // ハート間の間隔（ハートの幅 + 余白）
    const heartY = heartHeight / 2 + height * 0.04; // ハートのY座標

    for (let i = 0; i < this.lives; i++) {
      const heartX = width - (heartSpacing * (this.lives - i)) + (heartWidth / 2);
      const heart = this.add.image(heartX, heartY, 'heart');
      heart.setDisplaySize(heartWidth, heartHeight);
      heart.setScrollFactor(0);
      this.lifeImages.push(heart);
    }

    // アイテムの落下速度を設定
    this.baseItemFallSpeed = this.scale.height * 0.3;
    this.itemFallSpeed = this.baseItemFallSpeed;

    // アイテムのグループを作成
    this.items = this.physics.add.group();

    // ScoreItemを生成するタイマーイベントを設定（3秒ごとに生成）
    this.scoreItemTimer = this.time.addEvent({
      delay: this.baseItemSpawnDelay, // ミリ秒
      callback: this.spawnScoreItem,
      callbackScope: this,
      loop: true,
    });

    // SpeedItemの生成を試みるタイマーイベントを設定（3.2秒ごとに判定）
    this.speedItemTimer = this.time.addEvent({
      delay: this.baseItemSpawnDelay * 3 + 200, // ミリ秒
      callback: this.trySpawnSpeedItem,
      callbackScope: this,
      loop: true,
    });

    // ヘルプアイテムの生成を試みるタイマーイベントを設定（10秒ごとに判定）
    this.helpItemTimer = this.time.addEvent({
      delay: this.baseItemSpawnDelay * 9 + 200, // ミリ秒
      callback: this.trySpawnHelpItem,
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

    // モード表示の背景を作成
    const modeTextBackgroundHeight = Math.round(height * 0.075);
    const modeTextBackgroundWidth = width * 0.8;
    const modeTextBackgroundX = width / 2 - modeTextBackgroundWidth / 2;
    const modeTextBackgroundY = height * 0.2 - modeTextBackgroundHeight / 2; // スコアの下あたり

    // 背景のGraphics作成
    this.modeTextBackground = this.add.graphics();

    // 背景の枠線
    this.modeTextBackground.lineStyle(5, 0xffffff, 1);
    this.modeTextBackground.strokeRoundedRect(
        modeTextBackgroundX,
        modeTextBackgroundY,
        modeTextBackgroundWidth,
        modeTextBackgroundHeight,
        5 // 角丸
    );
    // 背景の塗りつぶし
    this.modeTextBackground.fillStyle(0x30d5c8, 1);
    this.modeTextBackground.fillRoundedRect(
        modeTextBackgroundX,
        modeTextBackgroundY,
        modeTextBackgroundWidth,
        modeTextBackgroundHeight,
        5 // 角丸
    );
    this.modeTextBackground.setDepth(0); // テキストの後ろに配置

    // 背景は初期状態で非表示
    this.modeTextBackground.setVisible(false);

    // モード表示の設定
    const modeFontSize = Math.round(width * 0.05);
    this.modeText = this.add.text(
      width / 2,
      height * 0.2,
      '', // 初期は空文字列
      {
        fontSize: `${modeFontSize}px`,
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      }
    );
    this.modeText.setOrigin(0.5, 0.5);
    this.updateModeText();
  }

  update(
    // @ts-ignore
    time: number,
    delta: number
  ) {
    if (this.isGameOver) {
      return;
    }

    if (this.helpModeActive) {
      // 次に落ちるアイテムに自動で移動
      this.moveToNextItem(delta);
    } else if (this.targetX !== null) {
      const playerX = this.player.x;
      const distance = this.targetX - playerX;
      const direction = Math.sign(distance);
      const velocity = direction * this.moveSpeed;
      this.player.setVelocityX(velocity);

      // アニメーションの再生
      if (direction > 0) {
        this.player.anims.play('run_right', true);
      } else if (direction < 0) {
        this.player.anims.play('run_left', true);
      }

      if (Math.abs(distance) < Math.abs(velocity * (delta / 1000))) {
        this.player.setX(this.targetX);
        this.player.setVelocityX(0);
        this.targetX = null;
        this.player.anims.stop();
        this.player.setTexture('player');
      }
    } else {
      this.player.setVelocityX(0);
      this.player.anims.stop();
      this.player.setTexture('player');
    }

    // アイテムが画面外に出たら処理
    this.items.children.each((item) => {
      const itemSprite = item as Phaser.Physics.Arcade.Image;
      if (itemSprite.y > this.missHeight) {
        if (itemSprite.getData('type') === 'ScoreItem') {
          this.loseLife();
          // スコアアイテムのx座標をキューから削除
          const x = itemSprite.x;
          const index = this.scoreItemQueue.indexOf(x);
          if (index !== -1) {
            this.scoreItemQueue.splice(index, 1);
          }
          // 消滅エフェクトを追加
          this.showItemEffect('MISS', x, this.scale.height * 0.8, 0.8,'#ff0000');
        }
        itemSprite.destroy();
      }
      return null;
    });
  }

  private spawnScoreItem() {
    const { width } = this.scale;
    const x = Phaser.Math.Between(width * 0.05, width * 0.95);
  
    // 確率に応じてアイテムの種類を決定
    const randomValue = Phaser.Math.Between(1, 100);
    let itemKey = 'scoreItem1'; // デフォルトは scoreItem1

    if (randomValue <= 40) {
        itemKey = 'scoreItem1'; // 40%の確率
    } else if (randomValue <= 70) {
        itemKey = 'scoreItem2'; // 次の30% (40% + 30%)
    } else {
        itemKey = 'scoreItem3'; // 最後の30% (70% + 30%)
    }

    // アイテムを生成
    const item = this.items.create(x, 0, itemKey) as Phaser.Physics.Arcade.Image;
  
    const itemSize = width * 0.2;
    item.setDisplaySize(itemSize, itemSize);
  
    item.setVelocityY(this.itemFallSpeed); // 下方向に速度を設定
    item.setCollideWorldBounds(false);
  
    // アイテムの種類をデータとして保存
    item.setData('type', 'ScoreItem');

    // スコアアイテムのx座標をキューに追加
    this.scoreItemQueue.push(x);
  }
  

  private trySpawnSpeedItem() {
    if (!this.speedBoostActive && !this.helpModeActive) {
      // 70%の確率でSpeedItemを生成
      if (Phaser.Math.Between(1, 100) <= this.predSpeedItem) {
        this.spawnSpeedItem();
      }
    }
  }

  private spawnSpeedItem() {
    const { width } = this.scale;
    const x = Phaser.Math.Between(width * 0.05, width * 0.95);
  
    const item = this.items.create(x, 0, 'speedItem') as Phaser.Physics.Arcade.Image;
  
    const itemSize = width * 0.2;
    item.setDisplaySize(itemSize, itemSize);
  
    item.setVelocityY(this.scale.height * 0.3); // 下方向に速度を設定
    item.setCollideWorldBounds(false);
  
    // アイテムの種類をデータとして保存
    item.setData('type', 'SpeedItem');
  }

  private trySpawnHelpItem() {
    if (!this.helpModeActive) {
      // 30%の確率でヘルプアイテムを生成
      if (Phaser.Math.Between(1, 100) <= this.predHelpItem) {
        this.spawnHelpItem();
      }
    }
  }

  private spawnHelpItem() {
    const { width } = this.scale;
    const x = Phaser.Math.Between(width * 0.05, width * 0.95);
  
    const item = this.items.create(x, 0, 'helpItem') as Phaser.Physics.Arcade.Image;
  
    const itemSize = width * 0.2;
    item.setDisplaySize(itemSize, itemSize);
  
    item.setVelocityY(this.itemFallSpeed); // 下方向に速度を設定
    item.setCollideWorldBounds(false);
  
    // アイテムの種類をデータとして保存
    item.setData('type', 'HelpItem');
  }
  

  private collectItem(
    player: Phaser.GameObjects.GameObject,
    item: Phaser.GameObjects.GameObject
  ) {
    const itemSprite = item as Phaser.Physics.Arcade.Image;
    const itemType = itemSprite.getData('type');
    const item_x = itemSprite.x;
    const item_y = itemSprite.y;
  
    if (itemType === 'ScoreItem') {
      // スコアを加算
      this.score += 10;
      this.scoreText.setText('スコア: ' + this.score);

      // スコアに応じて速度を調整
      this.updateSpeeds();

      // スコアエフェクト
      this.showItemEffect('+10', item_x, item_y);

      // スコアアイテムのx座標をキューから削除
      const x = itemSprite.x;
      const index = this.scoreItemQueue.indexOf(x);
      if (index !== -1) {
        this.scoreItemQueue.splice(index, 1);
      }
    } else if (itemType === 'SpeedItem') {
      // 速度アップを適用
      this.activateSpeedBoost();
      // スコアエフェクト
      this.showItemEffect('移動速度UP!', item_x, item_y, 1.0, '#00B16B');
    } else if (itemType === 'HelpItem') {
      // ヘルプモードを適用
      this.activateHelpMode();
    }
  
    item.destroy();
  }
  

  // 移動速度を上げる
  private activateSpeedBoost() {
    if (this.speedBoostActive) {
      // 既に速度アップ中の場合、タイマーをリセット
      this.speedBoostTimer?.remove();
    } else {
      // 移動速度を2倍に
      this.moveSpeed =  this.baseMoveSpeed * 2;
      this.speedBoostActive = true;
      // モードテキストを更新
      this.updateModeText();
    }

    // 15秒後に速度を元に戻すタイマーを設定
    this.speedBoostTimer = this.time.delayedCall(15000, this.deactivateSpeedBoost, [], this);

    // 速度アップ中のエフェクトやUIの更新があればここに追加
  }

  // 移動速度を元に戻す
  private deactivateSpeedBoost() {
    this.moveSpeed = this.baseMoveSpeed;
    this.speedBoostActive = false;
    // モードテキストを更新
    this.updateModeText();
  }

    // ヘルプモードの有効化
    private activateHelpMode() {
      if (this.helpModeActive) {
        this.helpModeTimer?.remove();
      } else {
        if (this.speedBoostActive) this.deactivateSpeedBoost();
        // ヘルプモードエフェクトを表示
        this.showHelpModeEffect(() => {
          this.helpModeActive = true;
          // エフェクトが完了したら動作を再開
          this.player.setTexture('player_help');

          // アイテムの生成スピードと落下スピードを1.5倍に
          this.itemSpawnDelay = this.baseItemSpawnDelay / 2;
          this.itemFallSpeed = this.baseItemFallSpeed * 2;

          // 既存のタイマーイベントを更新
          this.updateItemSpawnTimers();

          // 既存アイテムの速度を更新
          this.items.children.each((item) => {
            const itemSprite = item as Phaser.Physics.Arcade.Image;
            itemSprite.setVelocityY(this.itemFallSpeed);
            return null;
          });

          // タップ入力を無効化
          this.input.enabled = false;

          // モードテキストを更新
          this.updateModeText();

          // アイテム増加を終了するタイマー
          this.itemSpawnDelay = this.baseItemSpawnDelay;
          this.helpModeTimer = this.time.delayedCall(
            7000,
            () => {
              this.updateItemSpawnTimers();
              // さらに3秒後にヘルプモード終了
              this.time.delayedCall(
                3000,
                this.deactivateHelpMode,
                [],
                this
              );
            },
            [],
            this
          );
      });
    }
  }
  

  // ヘルプモードの終了
  private deactivateHelpMode() {
    this.helpModeActive = false;
    if (this.isHelpModeFirstTime) this.isHelpModeFirstTime = false;
    this.player.setTexture('player');
    this.player.setDisplaySize(this.playerSize, this.playerSize);

    // アイテムの生成スピードと落下スピードを元に戻す
    this.itemSpawnDelay = this.baseItemSpawnDelay;
    this.itemFallSpeed = this.baseItemFallSpeed;

    // タイマーイベントを更新する
    this.updateItemSpawnTimers();

    // 既存アイテムの速度を更新
    this.items.children.each((item) => {
      const itemSprite = item as Phaser.Physics.Arcade.Image;
      itemSprite.setVelocityY(this.itemFallSpeed);
      return null;
    });

    // モードテキストを更新
    this.updateModeText();

    // タップ入力を有効化
    this.input.enabled = true;

    this.moveSpeed = this.baseMoveSpeed;
    // 自動移動を停止
    this.player.setVelocityX(0);
    this.targetX = null;
  }

  // アイテム生成のタイマーを更新
  private updateItemSpawnTimers() {
    // 既存のアイテム生成タイマーイベントを削除
    this.scoreItemTimer?.remove();
    this.speedItemTimer?.remove();
    this.helpItemTimer?.remove();

    // ScoreItemを生成するタイマーイベントを再設定
    this.scoreItemTimer = this.time.addEvent({
      delay: this.itemSpawnDelay,
      callback: this.spawnScoreItem,
      callbackScope: this,
      loop: true,
    });

    // SpeedItemの生成を試みるタイマーイベントを再設定
    this.speedItemTimer = this.time.addEvent({
      delay: this.itemSpawnDelay * 3 + 200,
      callback: this.trySpawnSpeedItem,
      callbackScope: this,
      loop: true,
    });

    // ヘルプアイテムの生成を試みるタイマーイベントを再設定
    this.helpItemTimer = this.time.addEvent({
      delay: this.itemSpawnDelay * 9 + 700,
      callback: this.trySpawnHelpItem,
      callbackScope: this,
      loop: true,
    });
  }

  // モードテキストを更新
  private updateModeText() {
    if (this.helpModeActive) {
      this.modeText.setText('ショベルカーおたすけ中');
      this.modeTextBackground.setVisible(true);
    } else if (this.speedBoostActive) {
      this.modeText.setText('移動速度UP中');
      this.modeTextBackground.setVisible(true);
    } else {
      this.modeText.setText('');
      this.modeTextBackground.setVisible(false);
    }
  }  

  // ヘルプモード中のプレイヤー移動
  private moveToNextItem(delta: number) {
    if (!this.currentTargetItem || !this.items.contains(this.currentTargetItem)) {
      if (this.scoreItemQueue.length > 0) {
        const targetX = this.scoreItemQueue[0];
        this.currentTargetItem = this.items.getChildren().find(
          (item) =>
            (item as Phaser.Physics.Arcade.Image).x === targetX &&
            item.active
        ) as Phaser.Physics.Arcade.Image | null;
  
        if (!this.currentTargetItem) {
          this.scoreItemQueue.shift();
        }
      }
    }
  
    if (this.currentTargetItem) {
      const targetX = this.currentTargetItem.x;
      const playerX = this.player.x;
      const distanceToTarget = targetX - playerX;
      const direction = Math.sign(distanceToTarget);

      // 右向きと左向きのプレイヤー画像を切り替え
      if (direction > 0) {
        this.player.setTexture('player_help_right');
      } else {
        this.player.setTexture('player_help_left');
      }

      this.player.setDisplaySize(this.playerSize * 1.2, this.playerSize *1.2);
  
      // 距離とアイテムの落下速度に基づいて移動速度を調整
      const timeToReach = (this.scale.height - (this.currentTargetItem.y + 20)) / this.itemFallSpeed;
      const requiredSpeed = Math.abs(distanceToTarget) / timeToReach;
      const adjustedSpeed = requiredSpeed * 1.8;
  
      const velocity = direction * adjustedSpeed;
  
      if (Math.abs(distanceToTarget) < Math.abs(velocity * (delta / 1000))) {
        // 目標地点に到達
        this.player.setX(targetX);
        this.player.setVelocityX(0);
      } else {
        // 目標地点に向けて移動
        this.player.setVelocityX(velocity);
      }
    } else {
      this.player.setVelocityX(0);
    }
  }
  
  // スコアに基づいて速度を更新
  private updateSpeeds() {
    // スコアが上がるにつれて速くなるように速度を調整
    // 50で1.01, 100で1.02, 150で1.03, ...
    const speedMultiplier = 1 + this.score / 1000; // スコア100ごとに速度が1倍増加

    // 基本移動速度を更新
    this.baseMoveSpeed = this.scale.width * 0.5 * speedMultiplier;
    this.moveSpeed = this.speedBoostActive ? this.baseMoveSpeed * 2 : this.baseMoveSpeed;

    // アイテム生成速度を更新
    this.baseItemSpawnDelay = 1000 / speedMultiplier;
    this.itemSpawnDelay = this.baseItemSpawnDelay;

    // アイテム落下速度を更新
    this.baseItemFallSpeed = this.scale.height * 0.3 * speedMultiplier;
    this.itemFallSpeed = this.baseItemFallSpeed;

    // 既存のアイテムの速度を更新
    this.items.children.each((item) => {
      const itemSprite = item as Phaser.Physics.Arcade.Image;
      itemSprite.setVelocityY(this.itemFallSpeed);
      return null;
    });
  }


  private loseLife() {
    if (this.lives > 0) {
      this.lives--;
      const lostHeart = this.lifeImages.pop();
      if (lostHeart) {
        lostHeart.setTexture('heart_less');
      }
      if (this.lives === 0) {
        this.gameOver();
      }
    }
  }

  // スコアエフェクトを表示する関数
  private showItemEffect(text: string, x: number, y: number, fadeSec: number = 0.8, color: string = '#ffffff') {
    const effect = this.add.text(x, y, text, {
        fontSize: '24px',
        color: color,
        fontStyle: 'bold',
    });
    effect.setOrigin(0.5);
    effect.setDepth(10);

    // フェードアウトと上昇アニメーション
    this.tweens.add({
        targets: effect,
        y: y - 50,
        alpha: 0,
        duration: fadeSec * 1000,
        ease: 'Power1',
        onComplete: () => {
            effect.destroy();
        },
    });
  }

  private showHelpModeEffect(onComplete: () => void) {
    const { width, height } = this.scale;

    if (this.isHelpModeFirstTime) {
      // プレイヤーやアイテムを一時停止
      this.physics.pause();
      this.player.setVelocity(0);
      this.pauseItemSpawning();
      // 背景用の矩形を作成
      // 背景用の矩形を作成（枠線を含む背景）
      const borderSize = 5; // 枠線の太さ
      const backgroundWithBorder = this.add.rectangle(
          width + width / 2, // 初期位置は画面の右外
          height / 2,
          width, // 枠線分を拡張
          height * 0.4 + borderSize * 2, // 枠線分を拡張
          0xffffff // 枠線の色（白）
      );
      backgroundWithBorder.setOrigin(0.5, 0.5);
      backgroundWithBorder.setDepth(10);
      const background = this.add.rectangle(
          width + width / 2, // 初期位置は画面の右外
          height / 2,
          width,
          height * 0.4,
          0xffd700 // ゴールドカラー
      );
      background.setOrigin(0.5, 0.5);
      background.setDepth(11);

      // テキストを作成
      const helpText = this.add.text(width + width / 2, height / 2, '油圧の力で何処までも！\nショベルカーおたすけモード', {
          fontSize: `${Math.round(width * 0.075)}px`,
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'center',
      });
      helpText.setOrigin(0.5);
      helpText.setDepth(11);

      // アニメーション: 右から中央へ移動
      this.tweens.add({
          targets: [backgroundWithBorder, background, helpText],
          x: width / 2, // 中央
          duration: 1000, // 1秒
          ease: 'Power2',
          onComplete: () => {
              // 3秒間停止後、左へ抜けるアニメーションを開始
              this.time.delayedCall(1500, () => {
                  this.tweens.add({
                      targets: [backgroundWithBorder, background, helpText],
                      x: -width / 2, // 左外
                      duration: 1000, // 1秒
                      ease: 'Power2',
                      onComplete: () => {
                          // 背景とテキストを削除
                          background.destroy();
                          helpText.destroy();
                          // プレイヤーやアイテムの動作を再開
                          this.physics.resume();
                          this.resumeItemSpawning();
                          onComplete(); // 完了時のコールバックを実行
                      },
                  });
              });
          },
      });
    } else {
      onComplete();
    }
  }

  // アイテム生成を一時停止する関数
  private pauseItemSpawning() {
    if (this.scoreItemTimer) this.scoreItemTimer.paused = true;
    if (this.speedItemTimer) this.speedItemTimer.paused = true;
    if (this.helpItemTimer) this.helpItemTimer.paused = true;
  }

  // アイテム生成を再開する関数
  private resumeItemSpawning() {
    if (this.scoreItemTimer) this.scoreItemTimer.paused = false;
    if (this.speedItemTimer) this.speedItemTimer.paused = false;
    if (this.helpItemTimer) this.helpItemTimer.paused = false;
  }

  private gameOver() {
    this.isGameOver = true;
    this.physics.pause();
    this.player.anims.stop();
    this.player.setTexture('player');
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
    const restartText = this.add.text(width / 2, height / 2 + 50, 'タイトルへ戻る', {
      fontSize: `${Math.round(width * 0.05)}px`,
      color: '#ffffff',
    });
    restartText.setOrigin(0.5);
    restartText.setDepth(2);
  
    // テキストをタップでスタート画面に戻る
    restartText.setInteractive({ useHandCursor: true });
    restartText.on('pointerdown', () => {
      this.scene.start('StartScene');
    });
  }

//   private gameOver() {
//     this.isGameOver = true;
//     this.physics.pause();
//     this.player.anims.stop();
//     this.player.setTexture('player');
//     this.time.removeAllEvents();

//     const { width, height } = this.scale;

//     // オーバーレイを表示
//     this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
//     this.overlay.setDepth(1);

//     // ゲームオーバーのテキストを表示
//     const fontSize = Math.round(width * 0.08);
//     this.gameOverText = this.add.text(width / 2, height / 2 - 50, 'ゲームオーバー', {
//         fontSize: `${fontSize}px`,
//         color: '#ffffff',
//     });
//     this.gameOverText.setOrigin(0.5);
//     this.gameOverText.setDepth(2);

//     // スコアを表示
//     const scoreText = this.add.text(width / 2, height / 2, `スコア: ${this.score}`, {
//         fontSize: `${Math.round(width * 0.06)}px`,
//         color: '#ffffff',
//     });
//     scoreText.setOrigin(0.5);
//     scoreText.setDepth(2);

//     // Twitter共有ボタンを追加
//     const twitterShareHtml = `
//         <a href="https://twitter.com/share?ref_src=twsrc%5Etfw" 
//            class="twitter-share-button"
//            data-text="【だまゆ Happy Birthday】\n私のスコアは${this.score}点でした！挑戦してみてください！\n\n#だまゆ誕生祭2024"
//            data-url="https://goma000.github.io/damayu-birthday-2024/"
//            data-show-count="false">Tweet</a>
//         <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
//     `;
//     const twitterButton = this.add.dom(width / 2, height / 2 + 100).createFromHTML(twitterShareHtml);
//     twitterButton.setDepth(3);

//     // Xボタンを追加
//     const closeButton = this.add.text(width - 50, 50, 'X', {
//         fontSize: `${Math.round(width * 0.05)}px`,
//         color: '#ffffff',
//         backgroundColor: '#FF0000',
//         padding: { x: 10, y: 5 },
//         align: 'center',
//     });
//     closeButton.setOrigin(0.5);
//     closeButton.setDepth(3);
//     closeButton.setInteractive({ useHandCursor: true });
//     closeButton.on('pointerdown', () => {
//         this.hideShareScreen(twitterButton, closeButton, scoreText);
//     });
// }

// // 共有画面を閉じる処理
//   private hideShareScreen(
//       twitterButton: Phaser.GameObjects.DOMElement,
//       closeButton: Phaser.GameObjects.Text,
//       scoreText: Phaser.GameObjects.Text
//   ) {
//       // 共有画面とXボタン、スコアテキストを非表示にする
//       twitterButton.setVisible(false);
//       closeButton.setVisible(false);
//       scoreText.setVisible(false);
//     }
}
