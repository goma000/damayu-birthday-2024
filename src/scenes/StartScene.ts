import Phaser from 'phaser';

export default class StartScene extends Phaser.Scene {
  private startText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'StartScene' });
  }

  preload() {
    // 必要なアセットを読み込みます（背景画像など）
  }

  create() {
    const { width, height } = this.scale;
    window.scrollTo(0, 1);

    // 背景を設定（必要に応じて）
    // this.add.image(width / 2, height / 2, 'background').setDisplaySize(width, height);

    // タイトルテキストを追加
    const titleText = this.add.text(width / 2, height / 2 - 100, 'だまゆ誕生日記念ゲーム', {
      fontSize: `${Math.round(width * 0.08)}px`,
      color: '#ffffff',
    });
    titleText.setOrigin(0.5);

    // ゲームの説明テキストを追加
    const descriptionText = this.add.text(width / 2, height / 2, '今日はだまゆの誕生日！\nだまゆの好きなものをたくさん集めてプレゼントしよう！', {
      fontSize: `${Math.round(width * 0.035)}px`,
      color: '#ffffff',
      // アラインメントを中央揃えに設定
      align: 'center',
    });
    descriptionText.setOrigin(0.5);

    // スタートボタンのテキストを追加
    this.startText = this.add.text(width / 2, height / 2 + 100, 'タップしてスタート', {
      fontSize: `${Math.round(width * 0.05)}px`,
      color: '#ffffff',
    });
    this.startText.setOrigin(0.5);

    // タップ入力の処理
    this.input.on('pointerdown', () => {
      // ゲームシーンに遷移
      this.scene.start('GameScene');
    });

    // 画面サイズ変更時の処理を登録
    this.scale.on('resize', this.resize, this);
  }

  // 画面サイズ変更時の処理
  private resize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width;
    const height = gameSize.height;

    // テキストの位置とサイズを更新
    this.startText.setPosition(width / 2, height / 2 + 50);
    this.startText.setFontSize(Math.round(width * 0.05));

    // タイトルテキストも同様に更新（必要に応じて）
  }
}
