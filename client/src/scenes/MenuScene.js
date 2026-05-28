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
    this.createBackground();

    // Logo
    this.createLogo();

    // 装饰角色
    this.createDecorations();

    // 面板 + 表单
    this.createPanel();

    // 按钮
    this.createButtons();

    // 多标签页检测
    this.checkDuplicateTab();

    // 播放 BGM（暂时禁用，排查错误）
    // this.soundGenerator.playBGM('menu');
  }

  createBackground() {
    const { width, height } = this.scale;

    // 检查是否有菜单背景图，否则用渐变填充
    if (this.textures.exists('menu-bg')) {
      const bg = this.add.image(width / 2, height / 2, 'menu-bg');
      bg.setDisplaySize(width, height);
    } else {
      // 用渐变图形代替
      const graphics = this.add.graphics();
      // 深蓝到紫色渐变
      for (let y = 0; y < height; y++) {
        const ratio = y / height;
        const r = Math.floor(26 + (75 - 26) * ratio);
        const g = Math.floor(26 + (0 - 26) * ratio);
        const b = Math.floor(46 + (130 - 46) * ratio);
        graphics.fillStyle((r << 16) | (g << 8) | b, 1);
        graphics.fillRect(0, y, width, 1);
      }
      // 网格线
      graphics.lineStyle(1, 0x00d4ff, 0.1);
      for (let x = 0; x < width; x += 50) {
        graphics.lineBetween(x, 0, x, height);
      }
      for (let y = 0; y < height; y += 50) {
        graphics.lineBetween(0, y, width, y);
      }
    }
  }

  createLogo() {
    const { width } = this.scale;

    if (this.textures.exists('menu-logo')) {
      // Logo 图片
      const logo = this.add.image(width / 2, 120, 'menu-logo');
      logo.setScale(0.8);

      // 入场动画（暂时禁用）
      // this.tweens.add({
      //   targets: logo,
      //   scale: { from: 0, to: 0.8 },
      //   alpha: { from: 0, to: 1 },
      //   duration: 800,
      //   ease: 'Back.out',
      // });

      // 呼吸动画（暂时禁用）
      // this.tweens.add({
      //   targets: logo,
      //   scale: 0.85,
      //   duration: 2000,
      //   yoyo: true,
      //   repeat: -1,
      //   ease: 'Sine.inOut',
      // });
    } else {
      // 文字 Logo
      const title = this.add.text(width / 2, 100, '英语跑酷', {
        fontSize: '72px',
        fontFamily: 'Arial Black',
        color: '#00d4ff',
        stroke: '#ffffff',
        strokeThickness: 6,
      }).setOrigin(0.5);

      const subtitle = this.add.text(width / 2, 160, 'English Parkour', {
        fontSize: '20px',
        color: '#888888',
      }).setOrigin(0.5);

      // 入场动画（暂时禁用）
      // this.tweens.add({
      //   targets: [title, subtitle],
      //   alpha: { from: 0, to: 1 },
      //   y: '+=20',
      //   duration: 600,
      //   ease: 'Power2',
      // });

      // 标题呼吸动画（暂时禁用）
      // this.tweens.add({
      //   targets: title,
      //   scaleX: 1.05,
      //   scaleY: 1.05,
      //   duration: 2000,
      //   yoyo: true,
      //   repeat: -1,
      //   ease: 'Sine.inOut',
      // });
    }
  }

  createDecorations() {
    const { width, height } = this.scale;

    if (this.textures.exists('menu-character')) {
      // 左侧角色
      const leftChar = this.add.image(100, height - 150, 'menu-character');
      leftChar.setScale(0.8);
      leftChar.setFlipX(true);

      // 右侧角色
      const rightChar = this.add.image(width - 100, height - 150, 'menu-character');
      rightChar.setScale(0.8);

      // 浮动动画（暂时禁用）
      // this.tweens.add({
      //   targets: [leftChar, rightChar],
      //   y: '+=20',
      //   duration: 1500,
      //   yoyo: true,
      //   repeat: -1,
      //   ease: 'Sine.inOut',
      // });
    }
  }

  createPanel() {
    const { width, height } = this.scale;
    const panelWidth = 450;
    const panelHeight = 320;
    const panelX = width / 2;
    const panelY = height * 0.55;

    // 面板背景（半透明 + 发光边框）
    this.panelBg = this.add.graphics();
    this.drawPanel(panelX, panelY, panelWidth, panelHeight);

    // 输入区域
    this.createInputs(panelX, panelY, panelWidth);
  }

  drawPanel(x, y, w, h) {
    this.panelBg.clear();

    // 背景
    this.panelBg.fillStyle(0x1a1a3e, 0.9);
    this.panelBg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 20);

    // 边框发光
    this.panelBg.lineStyle(3, 0x00d4ff, 0.8);
    this.panelBg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 20);

    // 内部装饰线
    this.panelBg.lineStyle(1, 0x00d4ff, 0.3);
    this.panelBg.strokeRoundedRect(x - w / 2 + 10, y - h / 2 + 10, w - 20, h - 20, 15);
  }

  createInputs(centerX, centerY, panelWidth) {
    const inputWidth = 320;
    const inputHeight = 50;

    // 名字输入框
    this.createLabel(centerX - panelWidth / 2 + 65, centerY - 80, '你的名字');
    this.nameInput = this.createInputElement({
      x: centerX,
      y: centerY - 50,
      width: inputWidth,
      height: inputHeight,
      placeholder: '例如：小明',
      id: 'nameInput',
      maxLength: 12,
    });

    // 房间码输入框（默认隐藏）
    this.roomCodeContainer = this.add.container(0, 0);
    this.roomCodeContainer.setVisible(false);

    const roomLabel = this.add.text(centerX - panelWidth / 2 + 65, centerY - 10, '房间号（6位）', {
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0, 0.5);
    this.roomCodeContainer.add(roomLabel);

    this.roomInput = this.createInputElement({
      x: centerX,
      y: centerY + 20,
      width: inputWidth,
      height: inputHeight,
      placeholder: '123456',
      id: 'roomInput',
      maxLength: 6,
      numeric: true,
    });
    this.roomCodeContainer.add(this.roomInput.domElement);
  }

  createLabel(x, y, text) {
    this.add.text(x, y, text, {
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0, 0.5);
  }

  createInputElement({ x, y, width, height, placeholder, id, maxLength, numeric }) {
    const input = document.createElement('input');
    input.type = numeric ? 'text' : 'text';
    input.placeholder = placeholder;
    input.maxLength = maxLength;
    input.id = id;
    input.style.cssText = `
      position: absolute;
      left: ${x - width / 2}px;
      top: ${y - height / 2}px;
      width: ${width}px;
      height: ${height}px;
      font-size: 20px;
      text-align: center;
      border: 2px solid #00d4ff;
      border-radius: 10px;
      background: rgba(0,0,0,0.5);
      color: white;
      outline: none;
      transition: all 0.3s;
    `;

    input.addEventListener('focus', () => {
      input.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.5)';
      input.style.borderColor = '#00ffff';
    });

    input.addEventListener('blur', () => {
      input.style.boxShadow = 'none';
      input.style.borderColor = '#00d4ff';
    });

    if (numeric) {
      input.inputMode = 'numeric';
      input.pattern = '[0-9]*';
    }

    document.body.appendChild(input);

    // 返回对象以便销毁
    return {
      domElement: input,
      get value() { return input.value; },
      destroy: () => input.remove(),
    };
  }

  createButtons() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const startY = height * 0.55 + 80;

    // 快速开始按钮（最显眼）
    this.quickStartBtn = this.createButton({
      x: centerX,
      y: startY,
      width: 300,
      height: 60,
      text: '快速开始',
      color: 0x00d4ff,
      hoverColor: 0x00ffff,
      textColor: '#1a1a2e',
      fontSize: '28px',
      onClick: () => this.handleQuickStart(),
    });

    // 加入房间按钮
    this.joinBtn = this.createButton({
      x: centerX,
      y: startY + 80,
      width: 260,
      height: 50,
      text: '加入房间',
      color: 0x2a2a5e,
      hoverColor: 0x3a3a7e,
      textColor: '#ffffff',
      fontSize: '20px',
      onClick: () => this.handleJoinRoom(),
    });

    // 老师模式
    this.teacherBtn = this.createButton({
      x: centerX,
      y: startY + 150,
      width: 200,
      height: 45,
      text: '老师模式',
      color: 0x3a3a5e,
      hoverColor: 0x4a4a6e,
      textColor: '#cccccc',
      fontSize: '16px',
      onClick: () => this.handleTeacherMode(),
    });
  }

  createButton({ x, y, width, height, text, color, hoverColor, textColor, fontSize, onClick }) {
    const container = this.add.container(x, y);

    // 按钮背景
    const bg = this.add.rectangle(0, 0, width, height, color)
      .setInteractive({ useHandCursor: true });

    // 边框
    const border = this.add.graphics();
    border.lineStyle(2, 0x00d4ff, 0.5);
    border.strokeRect(-width / 2, -height / 2, width, height);

    // 文字
    const label = this.add.text(0, 0, text, {
      fontSize,
      color: textColor,
      fontFamily: 'Arial Black',
    }).setOrigin(0.5);

    container.add([bg, border, label]);

    // 交互
    bg.on('pointerover', () => {
      bg.setFillStyle(hoverColor);
      container.setScale(1.05);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(color);
      container.setScale(1);
    });

    bg.on('pointerdown', () => {
      this.soundGenerator.play('click');
      onClick();
    });

    // 入场动画（暂时禁用，可能导致 gameObject.once 错误）
    // container.setAlpha(0);
    // this.tweens.add({
    //   targets: container,
    //   alpha: 1,
    //   y: y,
    //   duration: 500,
    //   delay: 200,
    //   ease: 'Power2',
    // });

    return container;
  }

  handleQuickStart() {
    const name = this.nameInput?.value?.trim() || '玩家';

    if (name.length < 1) {
      this.showError('请输入你的名字');
      return;
    }

    this.clearInputs();

    // 单人模式：加入 SOLO 房间
    window.network.joinRoom('SOLO', name, false);
    this.scene.start('LobbyScene', { code: 'SOLO', name, isTeacher: false, isLocal: true });
  }

  handleJoinRoom() {
    // 显示房间码输入
    this.roomCodeContainer.setVisible(true);

    const name = this.nameInput?.value?.trim();
    const code = this.roomInput?.value?.trim();

    if (!name || name.length < 1) {
      this.showError('请输入你的名字');
      return;
    }

    if (!code || code.length !== 6) {
      this.showError('请输入6位房间号');
      return;
    }

    this.clearInputs();
    window.network.joinRoom(code, name, false);
    this.scene.start('LobbyScene', { code, name, isTeacher: false });
  }

  handleTeacherMode() {
    const name = this.nameInput?.value?.trim() || '老师';

    this.showRoomInput();

    const code = this.roomInput?.value?.trim();
    if (!code || code.length !== 6) {
      this.showError('请输入房间号');
      return;
    }

    this.clearInputs();
    window.network.joinRoom(code, name, true);
    this.scene.start('TeacherScene', { code, name });
  }

  showRoomInput() {
    this.roomCodeContainer.setVisible(true);
    // 重新定位输入框
    const { width, height } = this.scale;
    const roomInput = document.getElementById('roomInput');
    if (roomInput) {
      roomInput.style.top = `${height * 0.55 + 20}px`;
    }
  }

  async checkDuplicateTab() {
    const result = await window.checkDuplicateSession();
    if (result.duplicate) {
      this.showError('你已在另一个标签页打开游戏，请关闭后再试');
    }
  }

  showError(msg) {
    this.soundGenerator.play('wrong');
    const { width, height } = this.scale;

    const errorText = this.add.text(width / 2, height - 50, msg, {
      fontSize: '16px',
      color: '#ff4444',
      backgroundColor: '#00000080',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: errorText,
      alpha: 0,
      y: height - 30,
      duration: 2000,
      onComplete: () => errorText.destroy(),
    });
  }

  clearInputs() {
    this.nameInput?.destroy();
    this.roomInput?.destroy?.();
  }

  shutdown() {
    this.clearInputs();
    this.panelBg?.destroy();
  }
}
