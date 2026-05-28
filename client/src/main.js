import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LobbyScene } from './scenes/LobbyScene';
import { GameScene } from './scenes/GameScene';
import { ShmupScene } from './scenes/ShmupScene';
import { TeacherScene } from './scenes/TeacherScene';
import { ResultScene } from './scenes/ResultScene';
import { ConnectionManager } from './utils/ConnectionManager.js';
import { MessageQueue } from './utils/MessageQueue.js';
import { OfflineDetector } from './utils/OfflineDetector.js';
import { SoundGenerator } from './utils/SoundGenerator.js';
import { LocalGameEngine } from './engine/LocalGameEngine.js';
import { ShmupEngine } from './engine/ShmupEngine.js';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, LobbyScene, GameScene, ShmupScene, TeacherScene, ResultScene],
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 800 } },
  },
};

const game = new Phaser.Game(config);

// 网络管理器 — 稳定化版本
class NetworkManager {
  constructor() {
    this.socket = io('', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.eventHandlers = new Map();
    this.messageQueue = new MessageQueue();
    this.connectionManager = new ConnectionManager(this.socket);
    this.offlineDetector = new OfflineDetector({
      onChange: (isOnline, signals) => {
        console.log('Network status:', isOnline, signals);
        if (!isOnline) {
          this.emit('network_offline', signals);
        } else {
          this.emit('network_online', signals);
        }
      },
    });

    this.setupListeners();
    this.setupConnectionStateHandlers();
  }

  setupListeners() {
    // 房间相关
    this.socket.on('room_state', (data) => this.emit('room_state', data));
    this.socket.on('player_joined', (data) => this.emit('player_joined', data));
    this.socket.on('player_left', (data) => this.emit('player_left', data));
    this.socket.on('player_ready', (data) => this.emit('player_ready', data));
    this.socket.on('player_disconnected', (data) => this.emit('player_disconnected', data));
    this.socket.on('player_reconnected', (data) => this.emit('player_reconnected', data));
    this.socket.on('player_offline', (data) => this.emit('player_offline', data));
    this.socket.on('player_list', (data) => this.emit('player_list', data));

    // 游戏流程
    this.socket.on('countdown', (data) => this.emit('countdown', data));
    this.socket.on('game_start', (data) => this.emit('game_start', data));
    this.socket.on('game_end', (data) => this.emit('game_end', data));
    this.socket.on('game_paused', (data) => this.emit('game_paused', data));
    this.socket.on('game_resumed', (data) => this.emit('game_resumed', data));

    // 游戏数据
    this.socket.on('word_challenge', (data) => this.emit('word_challenge', data));
    this.socket.on('answer_result', (data) => this.emit('answer_result', data));
    this.socket.on('position_sync', (data) => this.emit('position_sync', data));
    this.socket.on('player_update', (data) => this.emit('player_update', data));

    // 道具
    this.socket.on('item_reward', (data) => this.emit('item_reward', data));
    this.socket.on('item_effect', (data) => this.emit('item_effect', data));

    // 连接状态
    this.socket.on('connection_warning', (data) => this.emit('connection_warning', data));
    this.socket.on('server_shutdown', (data) => this.emit('server_shutdown', data));

    // 错误
    this.socket.on('error', (data) => this.emit('error', data));

    // 心跳
    this.socket.on('ping', () => this.socket.emit('pong'));
  }

  setupConnectionStateHandlers() {
    this.connectionManager
      .onState('connected', () => {
        console.log('Connected to server');
        this.emit('connected');
        // 重连后回放离线消息
        this.messageQueue.replay(this.socket);
      })
      .onState('reconnecting', () => {
        console.log('Reconnecting...');
        this.emit('reconnecting');
      })
      .onState('failed', () => {
        console.log('Connection failed');
        this.emit('connection_failed');
      })
      .onState('slow', () => {
        console.log('Connection slow');
        this.emit('connection_slow');
      });
  }

  // 事件订阅
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
    return this;
  }

  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
    return this;
  }

  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((h) => h(data));
    }
  }

  // === API 调用 ===

  joinRoom(code, name, isTeacher = false) {
    this.currentRoom = code;
    this.currentName = name;
    this.isTeacher = isTeacher;
    this.socket.emit('join_room', { code, playerName: name, isTeacher });
  }

  setReady(ready) {
    this.socket.emit('player_ready', { ready });
  }

  startGame() {
    this.socket.emit('start_game', {});
  }

  submitAnswer(answer) {
    // 离线时暂存
    if (!this.connectionManager.isConnected) {
      this.messageQueue.enqueue('submit_answer', { answer });
      return;
    }
    this.socket.emit('submit_answer', { answer });
  }

  useItem(itemType, targetTrack) {
    if (!this.connectionManager.isConnected) {
      this.messageQueue.enqueue('use_item', { itemType, targetTrack });
      return;
    }
    this.socket.emit('use_item', { itemType, targetTrack });
  }

  requestPlayerList() {
    this.socket.emit('request_player_list', {});
  }

  send(event, data) {
    this.socket.emit(event, data);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

// === 本地模式检测 ===
const isLocalMode = typeof io === 'undefined' || typeof io !== 'function' || location.search.includes('local=1');

if (isLocalMode) {
  window.network = new ShmupEngine();
  console.log('[ShmupEngine] 本地弹幕模式已启动');
} else {
  window.network = new NetworkManager();
  console.log('[NetworkManager] 联网模式已启动');
}

// 多标签页冲突检测（联网模式才启用）
const TAB_CHANNEL = isLocalMode ? null : new BroadcastChannel('english_parkour');

window.checkDuplicateSession = () => {
  // 本地模式跳过检测
  if (isLocalMode) {
    return Promise.resolve({ duplicate: false, sessionId: 'local' });
  }

  // 兼容不支持 crypto.randomUUID 的浏览器
  const genId = () => {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };
  const sessionId = genId();
  localStorage.setItem('parkour_session', sessionId);

  TAB_CHANNEL.postMessage({ type: 'new_tab', sessionId });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ duplicate: false, sessionId }), 500);
    TAB_CHANNEL.onmessage = (msg) => {
      if (msg.data.type === 'new_tab' && msg.data.sessionId !== sessionId) {
        clearTimeout(timeout);
        resolve({ duplicate: true, existingSessionId: msg.data.sessionId });
      }
    };
  });
};

// 确保 AudioContext 在用户手势后解锁
document.addEventListener('click', () => {
  SoundGenerator.unlock();
}, { once: true });
