import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { PLAYER_COLORS } from '../utils/ColorConfig.js';

// 老师大屏三模式视角架构
const TEACHER_MODES = Object.freeze({
  cluster: { icon: '👥', label: '人群视角', viewportPct: 40, segmentSize: 25, minPlayers: 3 },
  full: { icon: '🗺️', label: '全景视角', viewportPct: 100 },
  follow: { icon: '🔍', label: '追踪视角', viewportPct: 30 },
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

    // 背景
    this.add.rectangle(width / 2, headerHeight / 2, width, headerHeight, 0x252545);

    // 标题
    this.add.text(20, headerHeight / 2, '🏫 英语跑酷', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#00d4ff',
    }).setOrigin(0, 0.5);

    // 地图名
    this.add.text(200, headerHeight / 2, '城市屋顶', {
      fontSize: '18px',
      color: '#888888',
    }).setOrigin(0, 0.5);

    // 倒计时
    this.timerText = this.add.text(width / 2, headerHeight / 2, '⏱ 01:30', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);

    // 模式切换按钮组
    let btnX = width - 280;
    Object.entries(TEACHER_MODES).forEach(([mode, config]) => {
      const btn = this.add.rectangle(btnX, headerHeight / 2, 80, 40, 0x3a3a5e)
        .setInteractive({ useHandCursor: true });

      const txt = this.add.text(btnX, headerHeight / 2, config.icon, {
        fontSize: '20px',
      }).setOrigin(0.5);

      btn.on('pointerdown', () => this.switchMode(mode));
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

    // 8 条跑道
    this.laneHeight = trackAreaHeight / 8;
    this.laneY = [];

    for (let i = 0; i < 8; i++) {
      const y = headerHeight + this.laneHeight * i + this.laneHeight / 2;
      this.laneY.push(y);

      // 跑道背景
      const bgColor = i % 2 === 0 ? 0x2a2a4e : 0x252545;
      this.add.rectangle(this.trackAreaWidth / 2, y, this.trackAreaWidth, this.laneHeight - 4, bgColor);

      // 跑道边框
      this.add.rectangle(this.trackAreaWidth / 2, y - this.laneHeight / 2 + 2, this.trackAreaWidth, 2, 0x00d4ff);
    }

    // 玩家圆点（8个）
    this.playerDots = [];
    for (let i = 0; i < 8; i++) {
      const dot = this.add.circle(50, this.laneY[i], 20, PLAYER_COLORS[i].tint)
        .setStrokeStyle(3, 0xffffff)
        .setVisible(false);

      // 名字标签
      const nameText = this.add.text(80, this.laneY[i] - 25, '', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#00000080',
      }).setOrigin(0, 0.5);

      // 进度文字
      const progressText = this.add.text(80, this.laneY[i] + 10, '', {
        fontSize: '12px',
        color: '#00d4ff',
      }).setOrigin(0, 0.5);

      // 效果图标
      const effectIcon = this.add.text(50, this.laneY[i] - 30, '', {
        fontSize: '16px',
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

    const arrow = this.add.text(x, y, side === 'left' ? '◄' : '►', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Arial Black',
    }).setOrigin(0.5).setVisible(false);

    const label = this.add.text(x, y + 40, '', {
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(0.5).setVisible(false);

    return { arrow, label };
  }

  createMinimap() {
    const barY = 80;
    const barWidth = this.trackAreaWidth - 40;
    const barHeight = 6;

    // 背景条
    this.add.rectangle(this.trackAreaWidth / 2, barY, barWidth, barHeight, 0x3a3a5e);

    // 8 个彩色小圆点
    this.minimapDots = [];
    for (let i = 0; i < 8; i++) {
      const dot = this.add.circle(20, barY, 8, PLAYER_COLORS[i].tint)
        .setStrokeStyle(2, 0xffffff)
        .setVisible(false);
      this.minimapDots.push(dot);
    }

    // 终点线标记
    this.add.text(this.trackAreaWidth - 20, barY - 20, '🏁', {
      fontSize: '16px',
    }).setOrigin(0.5);
  }

  createRankingPanel() {
    const { width, height } = this.scale;
    const panelX = width - (width - this.trackAreaWidth) / 2;
    const panelWidth = width - this.trackAreaWidth;

    // 标题
    this.add.text(panelX, 100, '🏆 实时排名', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#ffdd44',
    }).setOrigin(0.5);

    // 排名条目
    this.rankItems = [];
    for (let i = 0; i < 8; i++) {
      const y = 150 + i * 60;

      // 排名数字
      const rankText = this.add.text(panelX - panelWidth / 2 + 30, y, `${i + 1}`, {
        fontSize: '20px',
        fontFamily: 'Arial Black',
        color: i < 3 ? '#ffdd44' : '#888888',
      }).setOrigin(0.5);

      // 颜色圆点
      const colorDot = this.add.circle(panelX - panelWidth / 2 + 70, y, 10, 0x444444);

      // 名字
      const nameText = this.add.text(panelX - panelWidth / 2 + 90, y, '', {
        fontSize: '16px',
        color: '#888888',
      }).setOrigin(0, 0.5);

      // 进度条背景
      const barBg = this.add.rectangle(panelX, y + 20, panelWidth - 40, 8, 0x3a3a5e);

      // 进度条填充
      const barFill = this.add.rectangle(
        panelX - (panelWidth - 40) / 2,
        y + 20,
        0,
        8,
        0x00d4ff
      ).setOrigin(0, 0.5);

      this.rankItems.push({
        rankText,
        colorDot,
        nameText,
        barBg,
        barFill,
      });
    }

    // 事件日志区域
    this.add.text(panelX, height - 200, '📋 事件日志', {
      fontSize: '18px',
      color: '#888888',
    }).setOrigin(0.5);

    this.eventLog = [];
    this.eventTexts = [];
    for (let i = 0; i < 4; i++) {
      const text = this.add.text(panelX, height - 170 + i * 25, '', {
        fontSize: '12px',
        color: '#aaaaaa',
      }).setOrigin(0.5);
      this.eventTexts.push(text);
    }
  }

  createControlBar() {
    const { width, height } = this.scale;
    const barY = height - 40;

    // 背景
    this.add.rectangle(width / 2, barY, width, 80, 0x1a1a2e);

    const buttons = [
      { label: '🎁 道具雨', action: () => {} },
      { label: '📚 换词库', action: () => {} },
      { label: '⏸ 暂停', action: () => this.pauseGame() },
      { label: '🎬 慢镜头', action: () => {} },
      { label: '🔇 静音', action: () => this.toggleMute() },
      { label: '📊 导出', action: () => this.exportData() },
    ];

    let btnX = 100;
    buttons.forEach((btn) => {
      const rect = this.add.rectangle(btnX, barY, 100, 50, 0x3a3a5e)
        .setInteractive({ useHandCursor: true });

      this.add.text(btnX, barY, btn.label, {
        fontSize: '14px',
        color: '#ffffff',
      }).setOrigin(0.5);

      rect.on('pointerdown', btn.action);
      rect.on('pointerover', () => rect.setFillStyle(0x4a4a6e));
      rect.on('pointerout', () => rect.setFillStyle(0x3a3a5e));

      btnX += 120;
    });
  }

  switchMode(mode) {
    if (!TEACHER_MODES[mode]) return;
    this.currentMode = mode;

    if (mode === 'follow') {
      // 显示玩家选择下拉
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
      const bg = this.add.rectangle(200, y, 180, 35, 0x3a3a5e).setInteractive();
      const txt = this.add.text(200, y, `${PLAYER_COLORS[p.trackNumber - 1].label} ${p.name}`, {
        fontSize: '14px',
        color: '#ffffff',
      }).setOrigin(0.5);

      bg.on('pointerdown', () => {
        this.followTarget = p.socketId;
        this.followDropdown.setVisible(false);
      });

      this.followDropdown.add([bg, txt]);
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

    // 滑动窗口找最密集区域
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

    // 滞后阈值防止抖动
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
    // 更新玩家数据
    data.forEach((p) => {
      this.players.set(p.socketId, p);
    });

    // 计算排名
    const sorted = [...this.players.values()]
      .filter((p) => p.progress > 0)
      .sort((a, b) => b.progress - a.progress);

    // 更新跑道显示（根据当前模式）
    this.renderTrack(sorted);

    // 更新排名面板
    this.updateRankingPanel(sorted);

    // 更新迷你进度条
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
      // full
      viewLeft = 0;
      viewRight = 100;
    }

    const trackPixelWidth = this.trackAreaWidth - 100;

    // 更新每个跑道上的玩家
    this.playerDots.forEach((dotData) => {
      const player = sorted.find((p) => p.trackNumber === dotData.trackNumber);

      if (!player) {
        dotData.dot.setVisible(false);
        dotData.nameText.setText('');
        dotData.progressText.setText('');
        return;
      }

      // 检查是否在视野内
      if (player.progress >= viewLeft && player.progress <= viewRight) {
        const normalizedX = (player.progress - viewLeft) / (viewRight - viewLeft);
        const x = 50 + normalizedX * trackPixelWidth;

        dotData.dot.setPosition(x, this.laneY[dotData.trackNumber - 1]);
        dotData.dot.setVisible(true);
        dotData.dot.setFillStyle(PLAYER_COLORS[dotData.trackNumber - 1].tint);

        // 第一名金色光环
        if (sorted[0]?.trackNumber === dotData.trackNumber) {
          dotData.dot.setStrokeStyle(4, 0xffdd44);
        } else {
          dotData.dot.setStrokeStyle(3, 0xffffff);
        }

        dotData.nameText.setPosition(x + 30, this.laneY[dotData.trackNumber - 1] - 25);
        dotData.nameText.setText(player.name);

        dotData.progressText.setPosition(x + 30, this.laneY[dotData.trackNumber - 1] + 10);
        dotData.progressText.setText(`${player.progress.toFixed(1)}%`);

        // 效果图标
        let effects = '';
        if (player.shielded) effects += '🛡️';
        if (player.paralyzed) effects += '⚡';
        dotData.effectIcon.setText(effects);
        dotData.effectIcon.setPosition(x, this.laneY[dotData.trackNumber - 1] - 35);
      } else {
        // 在视野外，显示边缘箭头
        dotData.dot.setVisible(false);
        dotData.nameText.setText('');
        dotData.progressText.setText('');
      }
    });

    // 更新边缘箭头
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
        item.barFill.setDisplaySize(0, 8);
        item.colorDot.setFillStyle(0x444444);
        return;
      }

      item.colorDot.setFillStyle(PLAYER_COLORS[player.trackNumber - 1].tint);
      item.nameText.setText(player.name);
      item.barFill.setDisplaySize((player.progress / 100) * 200, 8);
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
    // 更新倒计时
    if (this.gameTime > 0) {
      this.gameTime -= delta;
      const mins = Math.floor(this.gameTime / 60000);
      const secs = Math.floor((this.gameTime % 60000) / 1000);
      this.timerText.setText(`⏱ ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }
  }

  shutdown() {
    clearInterval(this.clusterUpdateTimer);
  }
}
