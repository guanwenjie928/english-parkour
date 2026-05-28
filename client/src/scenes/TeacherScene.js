import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { GHIBLI, PLAYER_COLORS } from '../utils/ColorConfig.js';

const C = GHIBLI;
const FONT = 'Nunito';
const FONT_CN = 'ZCOOL KuaiLe';

// 老师大屏三模式视角架构
const TEACHER_MODES = Object.freeze({
  cluster: { icon: '人群', label: '人群视角', viewportPct: 40, segmentSize: 25, minPlayers: 3 },
  full: { icon: '全景', label: '全景视角', viewportPct: 100 },
  follow: { icon: '追踪', label: '追踪视角', viewportPct: 30 },
});

export class TeacherScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TeacherScene' });
    this.players = new Map();
    this.currentMode = 'cluster';
    this.followTarget = null;
    this.clusterCenter = 50;
  }

  init(data) {
    this.roomCode = data.code;
  }

  create() {
    const { width, height } = this.scale;
    this.soundGenerator = SoundGenerator.get();

    // 顶部栏
    this.createHeader();

    // 主赛道区域（左侧）
    this.trackAreaWidth = width * 0.75;
    this.createTrackArea();

    // 排名面板（右侧）
    this.createRankingPanel();

    // 底部控制栏
    this.createControlBar();

    // 网络事件
    this.setupNetworkListeners();

    // 人群检测定时器（500ms debounce）
    this.clusterUpdateTimer = setInterval(() => {
      this.updateClusterCenter();
    }, 500);
  }

  createHeader() {
    const { width } = this.scale;
    const headerHeight = 60;

    // 治愈绿顶栏背景
    this.add.rectangle(width / 2, headerHeight / 2, width, headerHeight, C.PRIMARY);

    // 标题
    this.add.text(20, headerHeight / 2, '英语跑酷', {
      fontSize: '22px',
      fontFamily: FONT_CN,
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    // 地图名
    this.add.text(170, headerHeight / 2, '城市屋顶', {
      fontSize: '14px',
      fontFamily: FONT,
      color: '#' + C.BG_CREAM.toString(16).padStart(6, '0'),
    }).setOrigin(0, 0.5);

    // 倒计时
    this.timerText = this.add.text(width / 2, headerHeight / 2, '01:30', {
      fontSize: '26px',
      fontFamily: FONT,
      fontStyle: '800',
      color: '#ffffff',
    }).setOrigin(0.5);

    // 模式切换按钮组
    let btnX = width - 280;
    Object.entries(TEACHER_MODES).forEach(([mode, config]) => {
      const btnW = 80;
      const btnH = 38;
      const btn = this.add.graphics();
      btn.fillStyle(C.BG_CREAM, 0.25);
      btn.fillRoundedRect(btnX - btnW / 2, headerHeight / 2 - btnH / 2, btnW, btnH, 6);
      btn.lineStyle(1, 0xffffff, 0.4);
      btn.strokeRoundedRect(btnX - btnW / 2, headerHeight / 2 - btnH / 2, btnW, btnH, 6);

      const hitArea = this.add.rectangle(btnX, headerHeight / 2, btnW, btnH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      const txt = this.add.text(btnX, headerHeight / 2, config.icon, {
        fontSize: '14px',
        fontFamily: FONT_CN,
        color: '#ffffff',
      }).setOrigin(0.5);

      hitArea.on('pointerdown', () => this.switchMode(mode));
      hitArea.on('pointerover', () => {
        btn.clear();
        btn.fillStyle(0xffffff, 0.35);
        btn.fillRoundedRect(btnX - btnW / 2, headerHeight / 2 - btnH / 2, btnW, btnH, 6);
        btn.lineStyle(1, 0xffffff, 0.6);
        btn.strokeRoundedRect(btnX - btnW / 2, headerHeight / 2 - btnH / 2, btnW, btnH, 6);
      });
      hitArea.on('pointerout', () => {
        btn.clear();
        btn.fillStyle(C.BG_CREAM, 0.25);
        btn.fillRoundedRect(btnX - btnW / 2, headerHeight / 2 - btnH / 2, btnW, btnH, 6);
        btn.lineStyle(1, 0xffffff, 0.4);
        btn.strokeRoundedRect(btnX - btnW / 2, headerHeight / 2 - btnH / 2, btnW, btnH, 6);
      });

      btnX += 90;
    });

    // 追踪玩家下拉（仅 follow 模式显示）
    this.followDropdown = this.add.container(0, 0);
    this.followDropdown.setVisible(false);
  }

  createTrackArea() {
    const { height } = this.scale;
    const headerHeight = 60;
    const controlHeight = 80;
    const trackAreaHeight = height - headerHeight - controlHeight;

    // 奶油白背景
    this.add.rectangle(this.trackAreaWidth / 2, headerHeight + trackAreaHeight / 2,
      this.trackAreaWidth, trackAreaHeight, C.BG_CREAM);

    // 8 条跑道
    this.laneHeight = trackAreaHeight / 8;
    this.laneY = [];

    for (let i = 0; i < 8; i++) {
      const y = headerHeight + this.laneHeight * i + this.laneHeight / 2;
      this.laneY.push(y);

      // 跑道背景 — 奶油白/暖沙色交替
      const bgColor = i % 2 === 0 ? C.BG_CREAM : C.BG_SAND;
      this.add.rectangle(this.trackAreaWidth / 2, y, this.trackAreaWidth, this.laneHeight - 4, bgColor, 0.7);

      // 跑道分隔线 — 天空蓝
      this.add.rectangle(this.trackAreaWidth / 2, y - this.laneHeight / 2 + 2,
        this.trackAreaWidth, 1, C.ACCENT, 0.4);
    }

    // 玩家圆点（8个）
    this.playerDots = [];
    for (let i = 0; i < 8; i++) {
      const dot = this.add.circle(50, this.laneY[i], 18, PLAYER_COLORS[i].tint)
        .setStrokeStyle(3, 0xffffff)
        .setVisible(false);

      // 名字标签 — 暖棕文字，半透明奶油白底
      const nameText = this.add.text(80, this.laneY[i] - 22, '', {
        fontSize: '13px',
        fontFamily: FONT,
        fontStyle: '600',
        color: '#' + C.TEXT_WARM.toString(16).padStart(6, '0'),
      }).setOrigin(0, 0.5);

      // 进度文字
      const progressText = this.add.text(80, this.laneY[i] + 10, '', {
        fontSize: '11px',
        fontFamily: FONT,
        fontStyle: '600',
        color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
      }).setOrigin(0, 0.5);

      // 效果图标
      const effectIcon = this.add.text(50, this.laneY[i] - 28, '', {
        fontSize: '14px',
      }).setOrigin(0.5);

      this.playerDots.push({
        dot,
        nameText,
        progressText,
        effectIcon,
        trackNumber: i + 1,
        progress: 0,
      });
    }

    // 边缘箭头（视野外玩家指示器）
    this.edgeArrows = {
      left: this.createEdgeArrow('left'),
      right: this.createEdgeArrow('right'),
    };

    // 迷你进度条（顶部）
    this.createMinimap();
  }

  createEdgeArrow(side) {
    const { height } = this.scale;
    const headerHeight = 60;
    const controlHeight = 80;
    const x = side === 'left' ? 30 : this.trackAreaWidth - 30;
    const y = (height - headerHeight - controlHeight) / 2 + headerHeight;

    const arrow = this.add.text(x, y, side === 'left' ? '<' : '>', {
      fontSize: '40px',
      fontFamily: FONT,
      fontStyle: '800',
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setVisible(false);

    const label = this.add.text(x, y + 36, '', {
      fontSize: '11px',
      fontFamily: FONT,
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setVisible(false);

    return { arrow, label };
  }

  createMinimap() {
    const barY = 80;
    const barWidth = this.trackAreaWidth - 40;
    const barHeight = 6;

    // 暖沙色背景条
    const barBg = this.add.graphics();
    barBg.fillStyle(C.BG_SAND, 0.8);
    barBg.fillRoundedRect(20, barY - barHeight / 2, barWidth, barHeight, 3);

    // 8 个彩色小圆点
    this.minimapDots = [];
    for (let i = 0; i < 8; i++) {
      const dot = this.add.circle(20, barY, 7, PLAYER_COLORS[i].tint)
        .setStrokeStyle(2, 0xffffff)
        .setVisible(false);
      this.minimapDots.push(dot);
    }

    // 终点线标记
    this.add.text(this.trackAreaWidth - 20, barY - 18, 'FINISH', {
      fontSize: '10px',
      fontFamily: FONT,
      fontStyle: '600',
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
  }

  createRankingPanel() {
    const { width, height } = this.scale;
    const panelX = width - (width - this.trackAreaWidth) / 2;
    const panelWidth = width - this.trackAreaWidth;

    // 面板背景
    const panelBg = this.add.graphics();
    panelBg.fillStyle(C.BG_CREAM, 0.5);
    panelBg.fillRoundedRect(this.trackAreaWidth, 60, panelWidth, height - 140, 0);

    // 标题
    this.add.text(panelX, 95, '实时排名', {
      fontSize: '20px',
      fontFamily: FONT_CN,
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 排名条目
    this.rankItems = [];
    for (let i = 0; i < 8; i++) {
      const y = 140 + i * 54;

      // 排名数字
      const rankColor = i < 3 ? C.HIGHLIGHT : C.TEXT_MUTED;
      const rankText = this.add.text(panelX - panelWidth / 2 + 28, y, `${i + 1}`, {
        fontSize: '18px',
        fontFamily: FONT,
        fontStyle: '700',
        color: '#' + rankColor.toString(16).padStart(6, '0'),
      }).setOrigin(0.5);

      // 颜色圆点
      const colorDot = this.add.circle(panelX - panelWidth / 2 + 60, y, 9, C.BG_SAND);

      // 名字
      const nameText = this.add.text(panelX - panelWidth / 2 + 78, y, '', {
        fontSize: '14px',
        fontFamily: FONT,
        fontStyle: '600',
        color: '#' + C.TEXT_WARM.toString(16).padStart(6, '0'),
      }).setOrigin(0, 0.5);

      // 进度条背景
      const barW = panelWidth - 50;
      const barBg = this.add.graphics();
      barBg.fillStyle(C.BG_SAND, 0.8);
      barBg.fillRoundedRect(panelX - panelWidth / 2 + 10, y + 14, barW, 6, 3);

      // 进度条填充
      const barFill = this.add.graphics();
      barFill.fillStyle(C.PRIMARY, 0.8);
      barFill.fillRoundedRect(panelX - panelWidth / 2 + 10, y + 14, 0, 6, 3);

      this.rankItems.push({
        rankText,
        colorDot,
        nameText,
        barBg,
        barFill,
        barW,
        barX: panelX - panelWidth / 2 + 10,
        barY: y + 14,
      });
    }

    // 事件日志区域
    this.add.text(panelX, height - 185, '事件日志', {
      fontSize: '16px',
      fontFamily: FONT_CN,
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    this.eventLog = [];
    this.eventTexts = [];
    for (let i = 0; i < 4; i++) {
      const text = this.add.text(panelX, height - 158 + i * 22, '', {
        fontSize: '11px',
        fontFamily: FONT,
        color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
      }).setOrigin(0.5);
      this.eventTexts.push(text);
    }
  }

  createControlBar() {
    const { width, height } = this.scale;
    const barY = height - 40;

    // 暖沙色底部栏背景
    this.add.rectangle(width / 2, barY, width, 80, C.BG_SAND, 0.8);

    const buttons = [
      { label: '道具雨', action: () => {} },
      { label: '换词库', action: () => {} },
      { label: '暂停', action: () => this.pauseGame() },
      { label: '慢镜头', action: () => {} },
      { label: '静音', action: () => this.toggleMute() },
      { label: '导出', action: () => this.exportData() },
    ];

    let btnX = 100;
    buttons.forEach((btn) => {
      const btnW = 100;
      const btnH = 44;

      const gfx = this.add.graphics();
      const drawBtn = (fillColor, fillAlpha, borderColor, borderAlpha) => {
        gfx.clear();
        gfx.fillStyle(fillColor, fillAlpha);
        gfx.fillRoundedRect(btnX - btnW / 2, barY - btnH / 2, btnW, btnH, 8);
        gfx.lineStyle(1, borderColor, borderAlpha);
        gfx.strokeRoundedRect(btnX - btnW / 2, barY - btnH / 2, btnW, btnH, 8);
      };

      drawBtn(C.BG_CREAM, 0.9, C.ACCENT, 0.5);

      const hitArea = this.add.rectangle(btnX, barY, btnW, btnH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      this.add.text(btnX, barY, btn.label, {
        fontSize: '13px',
        fontFamily: FONT_CN,
        color: '#' + C.TEXT_WARM.toString(16).padStart(6, '0'),
      }).setOrigin(0.5);

      hitArea.on('pointerdown', btn.action);
      hitArea.on('pointerover', () => drawBtn(C.ACCENT, 0.5, C.PRIMARY, 0.6));
      hitArea.on('pointerout', () => drawBtn(C.BG_CREAM, 0.9, C.ACCENT, 0.5));

      btnX += 120;
    });
  }

  switchMode(mode) {
    if (!TEACHER_MODES[mode]) return;
    this.currentMode = mode;

    if (mode === 'follow') {
      this.showFollowDropdown();
    } else {
      this.followDropdown.setVisible(false);
    }

    this.soundGenerator.play('click');
  }

  showFollowDropdown() {
    this.followDropdown.removeAll(true);

    const players = [...this.players.values()].filter((p) => p.name);
    players.forEach((p, i) => {
      const y = 100 + i * 40;
      const bg = this.add.graphics();
      bg.fillStyle(C.BG_CREAM, 0.95);
      bg.fillRoundedRect(110, y - 17, 180, 34, 6);
      bg.lineStyle(1, C.ACCENT, 0.5);
      bg.strokeRoundedRect(110, y - 17, 180, 34, 6);

      const hitArea = this.add.rectangle(200, y, 180, 34, 0x000000, 0).setInteractive();
      const txt = this.add.text(200, y, `${p.name}`, {
        fontSize: '13px',
        fontFamily: FONT,
        fontStyle: '600',
        color: '#' + C.TEXT_WARM.toString(16).padStart(6, '0'),
      }).setOrigin(0.5);

      hitArea.on('pointerdown', () => {
        this.followTarget = p.socketId;
        this.followDropdown.setVisible(false);
      });

      this.followDropdown.add([bg, hitArea, txt]);
    });

    this.followDropdown.setVisible(true);
  }

  updateClusterCenter() {
    if (this.currentMode !== 'cluster') return;

    const positions = [...this.players.values()]
      .filter((p) => p.progress > 0)
      .map((p) => p.progress);

    if (positions.length < TEACHER_MODES.cluster.minPlayers) {
      this.clusterCenter = 50;
      return;
    }

    const windowSize = 25;
    let bestCenter = 50;
    let bestCount = 0;

    positions.sort((a, b) => a - b);

    for (let i = 0; i < positions.length; i++) {
      const windowEnd = positions[i] + windowSize;
      const count = positions.filter((p) => p >= positions[i] && p <= windowEnd).length;

      if (count > bestCount) {
        bestCount = count;
        bestCenter = (positions[i] + windowEnd) / 2;
      }
    }

    if (Math.abs(bestCenter - this.clusterCenter) > 5) {
      this.clusterCenter = bestCenter;
    }
  }

  setupNetworkListeners() {
    window.network.on('position_sync', (data) => {
      this.updatePlayers(data);
    });

    window.network.on('item_effect', (data) => {
      this.logEvent(`${data.fromId} 对 ${data.toId} 使用 ${data.itemType}`);
    });

    window.network.on('answer_result', (data) => {
      this.logEvent(`${data.socketId} ${data.correct ? '答对' : '答错'}`);
    });
  }

  updatePlayers(data) {
    data.forEach((p) => {
      this.players.set(p.socketId, p);
    });

    const sorted = [...this.players.values()]
      .filter((p) => p.progress > 0)
      .sort((a, b) => b.progress - a.progress);

    this.renderTrack(sorted);
    this.updateRankingPanel(sorted);
    this.updateMinimap(sorted);
  }

  renderTrack(sorted) {
    const halfWindow = TEACHER_MODES[this.currentMode].viewportPct / 2;
    let viewLeft, viewRight;

    if (this.currentMode === 'cluster') {
      viewLeft = Math.max(0, this.clusterCenter - halfWindow);
      viewRight = Math.min(100, this.clusterCenter + halfWindow);
    } else if (this.currentMode === 'follow' && this.followTarget) {
      const target = this.players.get(this.followTarget);
      if (target) {
        viewLeft = Math.max(0, target.progress - halfWindow);
        viewRight = Math.min(100, target.progress + halfWindow);
      } else {
        viewLeft = 0;
        viewRight = 100;
      }
    } else {
      viewLeft = 0;
      viewRight = 100;
    }

    const trackPixelWidth = this.trackAreaWidth - 100;

    this.playerDots.forEach((dotData) => {
      const player = sorted.find((p) => p.trackNumber === dotData.trackNumber);

      if (!player) {
        dotData.dot.setVisible(false);
        dotData.nameText.setText('');
        dotData.progressText.setText('');
        return;
      }

      if (player.progress >= viewLeft && player.progress <= viewRight) {
        const normalizedX = (player.progress - viewLeft) / (viewRight - viewLeft);
        const x = 50 + normalizedX * trackPixelWidth;

        dotData.dot.setPosition(x, this.laneY[dotData.trackNumber - 1]);
        dotData.dot.setVisible(true);
        dotData.dot.setFillStyle(PLAYER_COLORS[dotData.trackNumber - 1].tint);

        // 第一名金色光环
        if (sorted[0]?.trackNumber === dotData.trackNumber) {
          dotData.dot.setStrokeStyle(4, C.HIGHLIGHT);
        } else {
          dotData.dot.setStrokeStyle(3, 0xffffff);
        }

        dotData.nameText.setPosition(x + 28, this.laneY[dotData.trackNumber - 1] - 22);
        dotData.nameText.setText(player.name);

        dotData.progressText.setPosition(x + 28, this.laneY[dotData.trackNumber - 1] + 10);
        dotData.progressText.setText(`${player.progress.toFixed(1)}%`);

        let effects = '';
        if (player.shielded) effects += 'S ';
        if (player.paralyzed) effects += 'Z ';
        dotData.effectIcon.setText(effects);
        dotData.effectIcon.setPosition(x, this.laneY[dotData.trackNumber - 1] - 33);
      } else {
        dotData.dot.setVisible(false);
        dotData.nameText.setText('');
        dotData.progressText.setText('');
      }
    });

    this.updateEdgeArrows(sorted, viewLeft, viewRight);
  }

  updateEdgeArrows(sorted, viewLeft, viewRight) {
    const leftPlayers = sorted.filter((p) => p.progress < viewLeft);
    const rightPlayers = sorted.filter((p) => p.progress > viewRight);

    if (leftPlayers.length > 0) {
      this.edgeArrows.left.arrow.setVisible(true);
      this.edgeArrows.left.label.setVisible(true);
      this.edgeArrows.left.label.setText(`${leftPlayers.length}人 左侧`);
    } else {
      this.edgeArrows.left.arrow.setVisible(false);
      this.edgeArrows.left.label.setVisible(false);
    }

    if (rightPlayers.length > 0) {
      this.edgeArrows.right.arrow.setVisible(true);
      this.edgeArrows.right.label.setVisible(true);
      this.edgeArrows.right.label.setText(`${rightPlayers.length}人 右侧`);
    } else {
      this.edgeArrows.right.arrow.setVisible(false);
      this.edgeArrows.right.label.setVisible(false);
    }
  }

  updateRankingPanel(sorted) {
    this.rankItems.forEach((item, i) => {
      const player = sorted[i];
      if (!player) {
        item.nameText.setText('');
        item.barFill.clear();
        item.colorDot.setFillStyle(C.BG_SAND);
        return;
      }

      item.colorDot.setFillStyle(PLAYER_COLORS[player.trackNumber - 1].tint);
      item.nameText.setText(player.name);

      const fillW = (player.progress / 100) * item.barW;
      item.barFill.clear();
      item.barFill.fillStyle(C.PRIMARY, 0.8);
      if (fillW > 3) {
        item.barFill.fillRoundedRect(item.barX, item.barY - 3, fillW, 6, 3);
      }
    });
  }

  updateMinimap(sorted) {
    const barWidth = this.trackAreaWidth - 40;

    sorted.forEach((player) => {
      const dot = this.minimapDots[player.trackNumber - 1];
      dot.setVisible(true);
      dot.x = 20 + (player.progress / 100) * barWidth;
    });
  }

  logEvent(message) {
    this.eventLog.unshift(message);
    if (this.eventLog.length > 4) this.eventLog.pop();

    this.eventTexts.forEach((text, i) => {
      text.setText(this.eventLog[i] || '');
    });
  }

  pauseGame() {
    window.network.send('teacher_action', { action: 'pause' });
  }

  toggleMute() {
    // 静音切换
  }

  exportData() {
    window.open(`/api/rooms/${this.roomCode}/export`, '_blank');
  }

  update(time, delta) {
    if (this.gameTime > 0) {
      this.gameTime -= delta;
      const mins = Math.floor(this.gameTime / 60000);
      const secs = Math.floor((this.gameTime % 60000) / 1000);
      this.timerText.setText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }
  }

  shutdown() {
    clearInterval(this.clusterUpdateTimer);
  }
}
