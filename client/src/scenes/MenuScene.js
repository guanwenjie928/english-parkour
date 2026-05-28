import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.soundGenerator = SoundGenerator.get();

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // 标题
    this.add.text(width / 2, height * 0.15, '英语跑酷', {
      fontSize: '72px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#00d4ff',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.28, 'English Parkour Classroom', {
      fontSize: '20px',
      color: '#888888',
    }).setOrigin(0.5);

    // 输入表单容器
    this.createForm();

    // 检查多标签页冲突
    this.checkDuplicateTab();

    // 播放背景音乐
    this.soundGenerator.playBGM('menu');
  }

  createForm() {
    const { width, height } = this.scale;

    // 学生姓名输入
    this.createInputField({
      x: width / 2,
      y: height * 0.45,
      label: '你的名字',
      placeholder: '例如：小明',
      id: 'nameInput',
      maxLength: 12,
    });

    // 房间码输入
    this.createInputField({
      x: width / 2,
      y: height * 0.58,
      label: '房间号（6位数字）',
      placeholder: '123456',
      id: 'roomInput',
      maxLength: 6,
      numeric: true,
    });

    // 加入按钮
    const joinBtn = this.add.rectangle(width / 2, height * 0.72, 260, 70, 0x00d4ff)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height * 0.72, '加入游戏', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#1a1a2e',
    }).setOrigin(0.5);

    joinBtn.on('pointerdown', () => this.handleJoin());
    joinBtn.on('pointerover', () => joinBtn.setScale(1.05));
    joinBtn.on('pointerout', () => joinBtn.setScale(1));

    // 老师模式入口
    const teacherBtn = this.add.rectangle(width / 2, height * 0.85, 200, 50, 0x3a3a5e)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height * 0.85, '👨‍🏫 老师模式', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    teacherBtn.on('pointerdown', () => this.handleTeacherMode());
  }

  createInputField({ x, y, label, placeholder, id, maxLength, numeric }) {
    this.add.text(x, y - 35, label, {
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    const input = document.createElement('input');
    input.type = numeric ? 'text' : 'text';
    input.placeholder = placeholder;
    input.maxLength = maxLength;
    input.id = id;
    input.style.cssText = `
      position: absolute;
      left: 50%;
      top: ${y}px;
      transform: translate(-50%, -50%);
      width: 300px;
      height: 55px;
      font-size: 22px;
      text-align: center;
      border: 3px solid #00d4ff;
      border-radius: 12px;
      background: rgba(0,0,0,0.5);
      color: white;
      outline: none;
    `;

    if (numeric) {
      input.inputMode = 'numeric';
      input.pattern = '[0-9]*';
    }

    document.body.appendChild(input);
  }

  handleJoin() {
    const nameInput = document.getElementById('nameInput');
    const roomInput = document.getElementById('roomInput');
    const name = nameInput?.value?.trim();
    const code = roomInput?.value?.trim();

    if (!name || name.length < 2) {
      this.showError('请输入你的名字');
      return;
    }
    if (!code || code.length !== 6) {
      this.showError('请输入6位房间号');
      return;
    }

    this.soundGenerator.play('click');
    this.clearInputs();

    // 加入房间
    window.network.joinRoom(code, name, false);

    // 跳转到大厅
    this.scene.start('LobbyScene', { code, name, isTeacher: false });
  }

  handleTeacherMode() {
    const nameInput = document.getElementById('nameInput');
    const roomInput = document.getElementById('roomInput');
    const name = nameInput?.value?.trim() || '老师';
    const code = roomInput?.value?.trim();

    if (!code || code.length !== 6) {
      this.showError('请输入房间号');
      return;
    }

    this.soundGenerator.play('click');
    this.clearInputs();

    window.network.joinRoom(code, name, true);

    // 老师直接进大屏
    this.scene.start('TeacherScene', { code });
  }

  async checkDuplicateTab() {
    const result = await window.checkDuplicateSession();
    if (result.duplicate) {
      this.showError('你已在另一个标签页打开游戏，请关闭后再试');
    }
  }

  showError(msg) {
    this.soundGenerator.play('wrong');
    // 简单的错误提示
    const { width, height } = this.scale;
    const errorText = this.add.text(width / 2, height * 0.95, msg, {
      fontSize: '16px',
      color: '#ff4444',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: errorText,
      alpha: 0,
      duration: 2000,
      onComplete: () => errorText.destroy(),
    });
  }

  clearInputs() {
    const nameInput = document.getElementById('nameInput');
    const roomInput = document.getElementById('roomInput');
    nameInput?.remove();
    roomInput?.remove();
  }

  shutdown() {
    this.clearInputs();
  }
}
