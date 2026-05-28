import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;

    // 背景
    this.add.rectangle(width/2, height/2, width, height, 0x1a1a2e);

    // 标题
    this.add.text(width/2, height * 0.2, '英语跑酷', {
      fontSize: '64px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#00d4ff',
      strokeThickness: 6
    }).setOrigin(0.5);

    // 输入姓名
    this.add.text(width/2, height * 0.4, '输入你的姓名:', {
      fontSize: '24px',
      color: '#aaaaaa'
    }).setOrigin(0.5);

    // 创建DOM输入框
    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.placeholder = '例如: 小明';
    inputElement.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 300px;
      height: 50px;
      font-size: 20px;
      text-align: center;
      border: 2px solid #00d4ff;
      border-radius: 10px;
      background: rgba(0,0,0,0.5);
      color: white;
    `;
    document.body.appendChild(inputElement);

    // 房间码输入
    const roomInput = document.createElement('input');
    roomInput.type = 'text';
    roomInput.placeholder = '输入房间码 (6位数字)';
    roomInput.maxLength = 6;
    roomInput.style.cssText = `
      position: absolute;
      left: 50%;
      top: 60%;
      transform: translate(-50%, -50%);
      width: 300px;
      height: 50px;
      font-size: 20px;
      text-align: center;
      border: 2px solid #00d4ff;
      border-radius: 10px;
      background: rgba(0,0,0,0.5);
      color: white;
    `;
    document.body.appendChild(roomInput);

    // 加入按钮
    const joinBtn = this.add.rectangle(width/2, height * 0.7, 200, 60, 0x00d4ff)
      .setInteractive()
      .on('pointerdown', () => {
        const name = inputElement.value.trim();
        const code = roomInput.value.trim();

        if (name && code.length === 6) {
          window.network.joinRoom(code, name);
          inputElement.remove();
          roomInput.remove();
          this.scene.start('GameScene');
        }
      });

    this.add.text(width/2, height * 0.7, '加入游戏', {
      fontSize: '28px',
      color: '#1a1a2e',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    // 播放背景音乐
    const bgm = this.sound.add('bgm-menu', { loop: true, volume: 0.3 });
    bgm.play();
  }
}
