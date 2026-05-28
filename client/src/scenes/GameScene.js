import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.players = new Map();
    this.myTrack = 1;
    this.items = [];
    this.wordChallenge = null;
  }

  create() {
    const { width, height } = this.scale;

    // 视差背景
    this.bgFar = this.add.tileSprite(width/2, height/2, width, height, 'bg-city-far');
    this.bgMid = this.add.tileSprite(width/2, height/2, width, height, 'bg-city-mid');
    this.bgNear = this.add.tileSprite(width/2, height/2, width, height, 'bg-city-near');

    // 跑道
    this.tracks = [];
    const trackHeight = height / 8;
    for (let i = 0; i < 8; i++) {
      const y = trackHeight * i + trackHeight / 2;

      // 跑道背景
      this.add.rectangle(width/2, y, width, trackHeight - 4, i % 2 === 0 ? 0x2a2a4e : 0x252545);

      // 跑道边框
      this.add.rectangle(width/2, y - trackHeight/2 + 2, width, 2, 0x00d4ff);
      this.add.rectangle(width/2, y + trackHeight/2 - 2, width, 2, 0x00d4ff);

      // 跑道编号
      this.add.text(30, y, `${i+1}`, {
        fontSize: '20px',
        color: '#00d4ff',
        fontFamily: 'Arial Black'
      }).setOrigin(0.5);

      this.tracks.push({ y, height: trackHeight });
    }

    // 创建玩家角色
    this.createPlayer(1, '小明', 'red', 1);

    // 虚拟键盘（竖屏模式）
    this.createVirtualKeyboard();

    // 道具栏
    this.createItemPanel();

    // 倒计时
    this.timerText = this.add.text(width - 100, 30, '90', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Arial Black',
      stroke: '#ff0000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // 监听网络事件
    this.setupNetworkListeners();

    // 游戏循环
    this.time.addEvent({
      delay: 50,
      callback: this.gameLoop,
      callbackScope: this,
      loop: true
    });
  }

  createPlayer(id, name, color, track) {
    const trackData = this.tracks[track - 1];
    const sprite = this.add.sprite(100, trackData.y, 'run_1')
      .setScale(0.8)
      .play('run');

    const nameText = this.add.text(100, trackData.y - 40, name, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#00000080'
    }).setOrigin(0.5);

    this.players.set(id, {
      sprite,
      nameText,
      track,
      progress: 0,
      speed: 1,
      status: 'running'
    });
  }

  createVirtualKeyboard() {
    const { width, height } = this.scale;
    const keys = [
      ['Q','W','E','R','T','Y','U','I','O','P'],
      ['A','S','D','F','G','H','J','K','L'],
      ['Z','X','C','V','B','N','M']
    ];

    const keySize = 72;
    const gap = 12;
    const startX = (width - (10 * (keySize + gap))) / 2;
    const startY = height * 0.65;

    this.keyboardContainer = this.add.container(0, 0);
    this.keyboardContainer.setVisible(false);

    // 背景遮罩
    const mask = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.7);
    this.keyboardContainer.add(mask);

    // 题目显示
    this.wordText = this.add.text(width/2, startY - 100, '', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    this.keyboardContainer.add(this.wordText);

    // 输入显示
    this.inputText = this.add.text(width/2, startY - 50, '', {
      fontSize: '36px',
      color: '#00d4ff',
      fontFamily: 'Arial Black',
      letterSpacing: 8
    }).setOrigin(0.5);
    this.keyboardContainer.add(this.inputText);

    // 倒计时
    this.answerTimer = this.add.text(width/2, startY - 150, '10', {
      fontSize: '48px',
      color: '#ff0000',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    this.keyboardContainer.add(this.answerTimer);

    // 按键
    keys.forEach((row, rowIndex) => {
      const rowWidth = row.length * (keySize + gap) - gap;
      const x = (width - rowWidth) / 2;

      row.forEach((key, colIndex) => {
        const btn = this.add.rectangle(
          x + colIndex * (keySize + gap) + keySize/2,
          startY + rowIndex * (keySize + gap),
          keySize, keySize,
          0x3a3a5e
        ).setInteractive();

        const label = this.add.text(btn.x, btn.y, key, {
          fontSize: '28px',
          color: '#ffffff',
          fontFamily: 'Arial Black'
        }).setOrigin(0.5);

        btn.on('pointerdown', () => {
          btn.setFillStyle(0x00d4ff);
          this.handleKeyInput(key);
          this.time.delayedCall(100, () => btn.setFillStyle(0x3a3a5e));
        });

        this.keyboardContainer.add([btn, label]);
      });
    });

    // 提交按钮
    const submitBtn = this.add.rectangle(width/2, startY + 3 * (keySize + gap), 200, 60, 0x00ff00)
      .setInteractive()
      .on('pointerdown', () => this.submitAnswer());

    const submitLabel = this.add.text(submitBtn.x, submitBtn.y, '提交', {
      fontSize: '28px',
      color: '#1a1a2e',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    this.keyboardContainer.add([submitBtn, submitLabel]);
  }

  createItemPanel() {
    const { width, height } = this.scale;

    this.itemSlots = [];
    for (let i = 0; i < 2; i++) {
      const slot = this.add.rectangle(
        width - 80 - i * 90,
        height - 80,
        70, 70,
        0x3a3a5e
      ).setStrokeStyle(2, 0x00d4ff);

      this.itemSlots.push({
        rect: slot,
        item: null,
        icon: null
      });
    }
  }

  setupNetworkListeners() {
    window.network.socket.on('word_challenge', (data) => {
      this.showWordChallenge(data);
    });

    window.network.socket.on('answer_result', (data) => {
      this.handleAnswerResult(data);
    });

    window.network.socket.on('item_effect', (data) => {
      this.handleItemEffect(data);
    });
  }

  showWordChallenge(data) {
    this.wordChallenge = data;
    this.currentInput = '';
    this.inputText.setText('');
    this.wordText.setText(data.display || data.meaning);
    this.keyboardContainer.setVisible(true);

    // 10秒倒计时
    let timeLeft = 10;
    this.answerTimer.setText(timeLeft);

    if (this.timerEvent) this.timerEvent.remove();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        timeLeft--;
        this.answerTimer.setText(timeLeft);
        if (timeLeft <= 0) {
          this.submitAnswer();
        }
      },
      repeat: 9
    });
  }

  handleKeyInput(key) {
    if (this.currentInput.length < 20) {
      this.currentInput += key.toLowerCase();
      this.inputText.setText(this.currentInput);
    }
  }

  submitAnswer() {
    if (this.timerEvent) this.timerEvent.remove();

    window.network.submitAnswer(
      this.wordChallenge.word_id,
      this.currentInput,
      (10 - parseInt(this.answerTimer.text)) * 1000
    );

    this.keyboardContainer.setVisible(false);
    this.wordChallenge = null;
  }

  handleAnswerResult(data) {
    const player = this.players.get(data.player_id);
    if (!player) return;

    if (data.is_correct) {
      player.speed = data.new_speed;
      this.sound.play('sfx-correct', { volume: 0.6 });

      // 发光效果
      this.tweens.add({
        targets: player.sprite,
        alpha: 0.5,
        duration: 100,
        yoyo: true,
        repeat: 2
      });
    } else {
      player.speed = data.new_speed;
      this.sound.play('sfx-wrong', { volume: 0.6 });
    }
  }

  handleItemEffect(data) {
    const from = this.players.get(data.from_player);
    const to = this.players.get(data.to_player);

    if (data.item_type === 'electric') {
      // 闪电特效
      this.createLightningEffect(from.sprite, to.sprite);
      to.status = 'stunned';
    } else if (data.item_type === 'rocket') {
      // 火箭加速
      this.createRocketEffect(from.sprite);
    }
  }

  createLightningEffect(from, to) {
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0xffff00);
    graphics.lineBetween(from.x, from.y, to.x, to.y);

    this.time.delayedCall(500, () => graphics.destroy());
  }

  createRocketEffect(sprite) {
    const particles = this.add.particles(sprite.x, sprite.y, 'item-rocket', {
      speed: { min: 100, max: 300 },
      scale: { start: 0.5, end: 0 },
      lifespan: 500,
      quantity: 10
    });

    this.time.delayedCall(5000, () => particles.destroy());
  }

  gameLoop() {
    // 更新背景视差
    this.bgFar.tilePositionX += 0.3;
    this.bgMid.tilePositionX += 0.6;
    this.bgNear.tilePositionX += 1.0;

    // 更新玩家位置
    this.players.forEach((player, id) => {
      if (player.status === 'stunned') return;

      player.progress += player.speed * 0.1;
      player.sprite.x = 100 + player.progress * 10;
      player.nameText.x = player.sprite.x;

      // 边界检查
      if (player.sprite.x > this.scale.width - 50) {
        player.sprite.x = this.scale.width - 50;
      }
    });
  }

  update() {
    // 每帧更新
  }
}
