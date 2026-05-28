// 打字射击多人模式 — 房间大厅场景
// 支持创建房间（选模式）+ 加入房间（输房间码）
// 玩家列表 + 准备状态 + 房主开始控制
import { SoundGenerator } from '../utils/SoundGenerator.js';

// 星露谷田园调色板
const C = {
  SKY_TOP: 0x6496d6, SKY_BOT: 0xd4c8a0,
  GRASS: 0x6ab840, GRASS_D: 0x559a30,
  PANEL: 0x6b4018, PANEL_BORDER: 0x9a6a38, PANEL_INNER: 0x8a5528,
  PAPER: 0xf5eed8, PAPER_DARK: 0xd8c8a0,
  TEXT: 0xf5e6c8, TEXT_DIM: 0xb0a080, TEXT_DARK: 0x3a2010,
  ACCENT: 0xffc840, PRIMARY: 0x6ac840, WARN: 0xff4a3a,
  HEART_FULL: 0xff4050, HEART_EMPTY: 0x4a3035,
  COOP: 0x5acc40, COMP: 0xff6a3a,
};
const FONT = 'Nunito';
const FONT_CN = 'ZCOOL KuaiLe';

// 简单的 5x5 格心形（与 ShmupScene 共用图案）
const HEART_PX = [
  [0,2],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2],[2,3],[2,4],
  [3,1],[3,2],[3,3],[4,2],
];

export class ShmupLobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShmupLobbyScene' });
    this.players = [];
    this.mode = 'coop';        // 'coop' | 'competitive'
  }

  init(data) {
    this._flow = data.flow || 'join';  // 'create' | 'join'
    this._roomCode = data.code || '';
  }

  create() {
    const { width: w, height: h } = this.scale;
    this.soundGenerator = SoundGenerator.get();

    this._createBackground(w, h);
    this._createHeader(w, h);
    this._createModeSelector(w, h);     // 仅房主可见
    this._createPlayerList(w, h);
    this._createActionButton(w, h);
    this._createStatusBar(w, h);
    this._setupListeners();

    // 根据流程执行
    if (this._flow === 'create') {
      this._doCreateRoom();
    } else if (this._roomCode) {
      this._doJoinRoom(this._roomCode);
    }
  }

  // ================================================================
  //  背景
  // ================================================================
  _createBackground(w, h) {
    // 天空渐变
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Phaser.Math.Linear(C.SKY_TOP >> 16 & 0xff, C.SKY_BOT >> 16 & 0xff, t);
      const g = Phaser.Math.Linear(C.SKY_TOP >> 8 & 0xff, C.SKY_BOT >> 8 & 0xff, t);
      const b = Phaser.Math.Linear(C.SKY_TOP & 0xff, C.SKY_BOT & 0xff, t);
      const color = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
      this.add.rectangle(w / 2, h * 0.4 * t, w, Math.ceil(h * 0.4 / steps) + 1, color).setDepth(0);
    }
    // 草地
    const gy = h * 0.40;
    this.add.rectangle(w / 2, gy + (h - gy) / 2, w, h - gy, C.GRASS).setDepth(0);

    // 装饰云朵
    for (let i = 0; i < 5; i++) {
      const cx = Math.random() * w;
      const cy = h * 0.03 + Math.random() * h * 0.15;
      const cs = 2 + Math.floor(Math.random() * 3);
      [[0,0],[1,-1],[2,0],[0,1],[1,1],[2,1]].forEach(([dx, dy]) => {
        this.add.rectangle(cx + dx * cs, cy + dy * cs, cs, cs, 0xf0f0f0, 0.6).setDepth(0);
      });
    }
  }

  // ================================================================
  //  顶部 — 标题 + 房间码
  // ================================================================
  _createHeader(w, h) {
    const topY = h * 0.04;
    this.add.text(w / 2, topY, 'TYPING  SHMOOP', {
      fontSize: `${Math.max(22, w * 0.028)}px`,
      fontFamily: FONT, fontStyle: '900',
      color: '#f5e6c8', stroke: '#3a2818', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2);

    // 房间码（大号展示）
    this.roomCodeText = this.add.text(w / 2, topY + 38, '', {
      fontSize: `${Math.max(30, w * 0.04)}px`,
      fontFamily: FONT, fontStyle: '800',
      color: '#ffc840',
    }).setOrigin(0.5).setDepth(2);

    // 复制提示
    this.copyHint = this.add.text(w / 2, topY + 68, '', {
      fontSize: '11px', fontFamily: FONT_CN, color: '#b0a080',
    }).setOrigin(0.5).setDepth(2);
  }

  // ================================================================
  //  模式选择（仅创建房间者可见）
  // ================================================================
  _createModeSelector(w, h) {
    const my = h * 0.20;
    const btnW = 130, btnH = 36, gap = 16;
    const cx = w / 2;

    const makeModeBtn = (x, label, desc, mode, color) => {
      const gfx = this.add.graphics().setDepth(3);
      const draw = (hover) => {
        gfx.clear();
        const bw = hover ? btnW + 4 : btnW;
        const bh = hover ? btnH + 4 : btnH;
        gfx.fillStyle(0x000000, 0.25);
        gfx.fillRoundedRect(x - bw / 2 + 2, my - bh / 2 + 2, bw, bh, 4);
        gfx.fillStyle(color, hover ? 1 : 0.85);
        gfx.fillRoundedRect(x - bw / 2, my - bh / 2, bw, bh, 4);
        gfx.lineStyle(1.5, 0xffffff, 0.2);
        gfx.strokeRoundedRect(x - bw / 2, my - bh / 2, bw, bh, 4);
      };
      draw(false);

      this.add.text(x, my - 8, label, {
        fontSize: '14px', fontFamily: FONT, fontStyle: '800', color: '#ffffff',
      }).setOrigin(0.5).setDepth(4);

      this.add.text(x, my + 12, desc, {
        fontSize: '9px', fontFamily: FONT_CN, color: '#e0d8c0',
      }).setOrigin(0.5).setDepth(4);

      const hit = this.add.rectangle(x, my, btnW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(5);
      hit.on('pointerover', () => draw(true));
      hit.on('pointerout', () => draw(false));
      hit.on('pointerdown', () => {
        this.mode = mode;
        this._updateModeSelection();
      });

      return { gfx, draw, hit, mode };
    };

    const leftX = cx - btnW / 2 - gap / 2;
    const rightX = cx + btnW / 2 + gap / 2;

    this.modeCoopBtn = makeModeBtn(leftX, 'COOP', '协作·共享生命', 'coop', C.COOP);
    this.modeCompBtn = makeModeBtn(rightX, 'COMP', '竞技·独立HP', 'competitive', C.COMP);

    this.modeLabel = this.add.text(cx, my + btnH / 2 + 18, '', {
      fontSize: '11px', fontFamily: FONT_CN, color: '#b0a080',
    }).setOrigin(0.5).setDepth(2);

    // 默认隐藏（仅房主可见）
    this._modeGroup = [this.modeCoopBtn, this.modeCompBtn, this.modeLabel]
      .flatMap((b) => b.gfx ? [b.gfx, b.hit, ...(b.hit ? [] : [])] : [b]);
    this._setModeVisible(false);

    this._updateModeSelection();
  }

  _setModeVisible(visible) {
    const objects = [
      this.modeLabel,
      this.modeCoopBtn?.gfx, this.modeCoopBtn?.hit,
      this.modeCompBtn?.gfx, this.modeCompBtn?.hit,
    ].filter(Boolean);
    objects.forEach((o) => o.setVisible(visible));
  }

  _updateModeSelection() {
    const updateBtn = (btn, selected) => {
      if (!btn) return;
      const color = btn.mode === 'coop' ? C.COOP : C.COMP;
      btn.draw(selected);
    };
    updateBtn(this.modeCoopBtn, this.mode === 'coop');
    updateBtn(this.modeCompBtn, this.mode === 'competitive');
    this.modeLabel.setText(this.mode === 'coop'
      ? '协作模式：所有玩家共享 10 颗心，一人受伤全队扣血'
      : '竞技模式：每人独立 5 颗心，最后存活者获胜');
  }

  // ================================================================
  //  玩家列表
  // ================================================================
  _createPlayerList(w, h) {
    const startY = h * 0.28;
    const slotW = Math.min(380, w * 0.65);
    const slotH = 44;
    const slotGap = 4;
    const slotX = (w - slotW) / 2;

    this.playerSlots = [];

    for (let i = 0; i < 8; i++) {
      const y = startY + i * (slotH + slotGap);

      // 槽位背景
      const bg = this.add.graphics().setDepth(2);
      const bgColor = i % 2 === 0 ? 0xf5eed8 : 0xede0c8;
      bg.fillStyle(bgColor, i % 2 === 0 ? 0.7 : 0.5);
      bg.fillRoundedRect(slotX, y, slotW, slotH, 6);

      // 序号
      this.add.text(slotX + 16, y + slotH / 2, `${i + 1}`, {
        fontSize: '13px', fontFamily: FONT, fontStyle: '700', color: '#b0a080',
      }).setOrigin(0.5).setDepth(3);

      // 名字
      const nameText = this.add.text(slotX + 48, y + slotH / 2, '等待中...', {
        fontSize: '15px', fontFamily: FONT_CN, color: '#b0a080',
      }).setOrigin(0, 0.5).setDepth(3);

      // 状态 (READY / 房主)
      const statusText = this.add.text(slotX + slotW - 20, y + slotH / 2, '', {
        fontSize: '10px', fontFamily: FONT, fontStyle: '700', color: '#6ac840',
      }).setOrigin(1, 0.5).setDepth(3);

      this.playerSlots.push({ y, slotH, slotW, slotX, bg, nameText, statusText, occupied: false, socketId: null });
    }
  }

  _updatePlayerList() {
    const engine = window.network;
    const allPlayers = engine.players || [];

    // 清空所有槽位
    this.playerSlots.forEach((s, i) => {
      s.occupied = false;
      s.socketId = null;
      s.nameText.setText('等待中...');
      s.nameText.setColor('#b0a080');
      s.statusText.setText('');

      const bgColor = i % 2 === 0 ? 0xf5eed8 : 0xede0c8;
      s.bg.clear();
      s.bg.fillStyle(bgColor, i % 2 === 0 ? 0.7 : 0.5);
      s.bg.fillRoundedRect(s.slotX, s.y, s.slotW, s.slotH, 6);
    });

    // 填充活跃玩家
    allPlayers.forEach((p, i) => {
      if (i >= this.playerSlots.length) return;
      const slot = this.playerSlots[i];
      slot.occupied = true;
      slot.socketId = p.socketId;
      slot.nameText.setText(p.name);
      slot.nameText.setColor('#3a2010');

      // 状态标签
      if (p.isTeacher) {
        slot.statusText.setText('HOST');
        slot.statusText.setColor('#ffc840');
      } else if (p.isReady) {
        slot.statusText.setText('READY');
        slot.statusText.setColor('#6ac840');
      }

      // 在线状态
      if (p.isOnline === false) {
        slot.nameText.setColor('#8a6a50');
        slot.statusText.setText('OFFLINE');
        slot.statusText.setColor('#ff4a3a');
      }

      // 高亮槽位
      slot.bg.clear();
      slot.bg.fillStyle(0x6ac840, 0.12);
      slot.bg.fillRoundedRect(slot.slotX, slot.y, slot.slotW, slot.slotH, 6);
      slot.bg.lineStyle(1.5, 0x6ac840, 0.35);
      slot.bg.strokeRoundedRect(slot.slotX, slot.y, slot.slotW, slot.slotH, 6);
    });
  }

  // ================================================================
  //  操作按钮
  // ================================================================
  _createActionButton(w, h) {
    const btnY = h * 0.87;
    const btnW = 220, btnH = 48;
    const cx = w / 2;

    this.actionGfx = this.add.graphics().setDepth(10);
    this.actionText = this.add.text(cx, btnY, '', {
      fontSize: '16px', fontFamily: FONT, fontStyle: '800', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    this.actionHit = this.add.rectangle(cx, btnY, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(12);

    this.actionHit.on('pointerdown', () => {
      this.soundGenerator.play('click');
      this._handleAction();
    });

    this._btnW = btnW; this._btnH = btnH;
    this._updateActionButton();
  }

  _drawButton(color, label) {
    const { width: w } = this.scale;
    const cx = w / 2;
    this.actionGfx.clear();
    this.actionGfx.fillStyle(0x000000, 0.3);
    this.actionGfx.fillRoundedRect(cx - this._btnW / 2 + 2, this.actionText.y - this._btnH / 2 + 2,
      this._btnW, this._btnH, 5);
    this.actionGfx.fillStyle(color);
    this.actionGfx.fillRoundedRect(cx - this._btnW / 2, this.actionText.y - this._btnH / 2,
      this._btnW, this._btnH, 5);
    this.actionGfx.lineStyle(1.5, 0xffffff, 0.2);
    this.actionGfx.strokeRoundedRect(cx - this._btnW / 2, this.actionText.y - this._btnH / 2,
      this._btnW, this._btnH, 5);
    this.actionGfx.fillStyle(0xffffff, 0.12);
    this.actionGfx.fillRoundedRect(cx - this._btnW / 2 + 3, this.actionText.y - this._btnH / 2 + 3,
      this._btnW - 6, this._btnH / 3, 2);
    this.actionText.setText(label);
  }

  _updateActionButton() {
    const engine = window.network;
    if (engine.isTeacher) {
      this._drawButton(C.PRIMARY, 'START  GAME');
    } else {
      const ready = engine.isReady;
      this._drawButton(ready ? C.WARN : C.ACCENT, ready ? 'CANCEL  READY' : 'READY');
    }
  }

  _handleAction() {
    const engine = window.network;
    if (engine.isTeacher) {
      engine.startGame();
    } else {
      engine.isReady = !engine.isReady;
      engine.setReady();
      this._updateActionButton();
      this.soundGenerator.play('click');
    }
  }

  // ================================================================
  //  状态栏
  // ================================================================
  _createStatusBar(w, h) {
    const sy = h * 0.93;
    this.statusText = this.add.text(w / 2, sy, '', {
      fontSize: '11px', fontFamily: FONT_CN, color: '#8a6a50',
    }).setOrigin(0.5).setDepth(2);
  }

  // ================================================================
  //  网络事件
  // ================================================================
  _setupListeners() {
    const engine = window.network;

    engine.on('player_joined', (d) => {
      this.players = d.players || engine.players;
      this._updatePlayerList();
      this.soundGenerator.play('item_get');
      this.statusText.setText(`${d.name} 加入了房间`);
    });

    engine.on('player_left', (d) => {
      this.players = d.players || engine.players;
      this._updatePlayerList();
      this.statusText.setText(`${d.name || '玩家'} 离开了房间`);
    });

    engine.on('player_ready', (d) => {
      this.players = d.players || engine.players;
      this._updatePlayerList();
    });

    engine.on('player_offline', (d) => {
      this._updatePlayerList();
      this.statusText.setText(`${d.name} 断线了...`);
    });

    engine.on('player_reconnected', (d) => {
      this._updatePlayerList();
      this.statusText.setText(`${d.name || '玩家'} 重新连接`);
    });

    engine.on('countdown', (d) => {
      this._showCountdown(d.count);
    });

    engine.on('game_start', (d) => {
      this.scene.start('ShmupScene', {
        code: engine.roomCode,
        mode: engine.mode,
        isMultiplayer: true,
      });
    });

    engine.on('error', (d) => {
      this._showToast(d.msg || d.reason || '发生错误');
    });

    engine.on('disconnected', () => {
      this.statusText.setText('与服务器断开连接...');
    });
  }

  // ================================================================
  //  创建 / 加入房间
  // ================================================================
  async _doCreateRoom() {
    const engine = window.network;
    const name = localStorage.getItem('playerName') || '房主';
    this.statusText.setText('正在创建房间...');

    const result = await engine.createRoom(name, this.mode);
    if (result?.ok) {
      this.roomCodeText.setText(result.room.code);
      this.copyHint.setText('把房间号发给同学们吧！');
      this._setModeVisible(true);
      this._updatePlayerList();
      this._updateActionButton();
      this.statusText.setText('等待玩家加入...');
    } else {
      this.statusText.setText('创建失败: ' + (result?.reason || '未知错误'));
      this.soundGenerator.play('wrong');
    }
  }

  async _doJoinRoom(code) {
    const engine = window.network;
    const name = localStorage.getItem('playerName') || '玩家';
    this.statusText.setText('正在加入房间...');

    const result = await engine.joinRoom(code, name);
    if (result?.ok) {
      this.roomCodeText.setText(code);
      this.copyHint.setText(`已加入房间 · ${name}`);
      this._setModeVisible(false);
      this._updatePlayerList();
      this._updateActionButton();
      this.statusText.setText('等待房主开始游戏...');
    } else {
      this.statusText.setText('加入失败: ' + (result?.reason || '房间不存在或已开始'));
      this.soundGenerator.play('wrong');
      // 2秒后返回菜单
      this.time.delayedCall(2000, () => this.scene.start('MenuScene'));
    }
  }

  // ================================================================
  //  倒计时动画
  // ================================================================
  _showCountdown(count) {
    const { width: w, height: h } = this.scale;
    const size = Math.max(70, Math.min(130, h * 0.16));
    const text = count === 0 ? 'GO!' : String(count);
    const color = count === 0 ? '#5acc40' : (count <= 2 ? '#ff5a4a' : '#ffc840');

    const overlay = this.add.text(w / 2, h / 2, text, {
      fontSize: `${size}px`,
      fontFamily: FONT, fontStyle: '900',
      color,
      stroke: '#2a1a08', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(300).setScale(2).setAlpha(0);

    this.tweens.add({
      targets: overlay, scaleX: 1, scaleY: 1, alpha: 1,
      duration: 200, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: overlay, scaleX: 1.5, scaleY: 1.5, alpha: 0,
          duration: 450, delay: 100, ease: 'Cubic.easeIn',
          onComplete: () => overlay.destroy(),
        });
      },
    });
    this.soundGenerator.play(count === 0 ? 'victory' : 'countdown');
  }

  // ================================================================
  //  提示 Toast
  // ================================================================
  _showToast(msg) {
    const { width: w } = this.scale;
    const tw = 300, th = 32;
    const tx = (w - tw) / 2;
    const ty = 60;
    const gfx = this.add.graphics().setDepth(300);
    gfx.fillStyle(C.WARN, 0.92);
    gfx.fillRoundedRect(tx, ty, tw, th, 4);
    const text = this.add.text(w / 2, ty + th / 2, msg, {
      fontSize: '11px', fontFamily: FONT_CN, fontStyle: '700', color: '#ffffff',
    }).setOrigin(0.5).setDepth(301);
    this.tweens.add({
      targets: [gfx, text], alpha: 0, y: ty - 15,
      duration: 400, delay: 2000,
      onComplete: () => { gfx.destroy(); text.destroy(); },
    });
  }
}
