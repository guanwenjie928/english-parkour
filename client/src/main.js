import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, MenuScene, GameScene, ResultScene],
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 800 } }
  }
};

const game = new Phaser.Game(config);

// 网络管理器
class NetworkManager {
  constructor() {
    this.socket = io('wss://your-server.com');
    this.setupListeners();
  }

  setupListeners() {
    this.socket.on('room_state', (data) => {
      // 更新房间状态
    });
    this.socket.on('word_challenge', (data) => {
      // 弹出单词挑战
    });
    this.socket.on('answer_result', (data) => {
      // 处理答题结果
    });
  }

  joinRoom(code, name) {
    this.socket.emit('join_room', { room_code: code, player_name: name });
  }

  submitAnswer(wordId, answer, timeMs) {
    this.socket.emit('answer', { word_id: wordId, answer, time_ms: timeMs });
  }

  useItem(itemType, targetTrack) {
    this.socket.emit('use_item', { item_type: itemType, target_track: targetTrack });
  }
}

window.network = new NetworkManager();
