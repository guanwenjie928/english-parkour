// 射击弹幕 Socket 事件路由 — 查表驱动
const { Logger } = require('../core/Logger');
const { checkRate } = require('../core/RateLimiter');
const { HeartbeatManager } = require('../core/Heartbeat');
const { ShmupGameRoom } = require('../game/ShmupGameRoom');

// === 事件处理器工厂 ===
const createHandlers = (rooms, wordEngine, io) => ({
  create_room: handleCreateRoom(rooms, wordEngine, io),
  join_room: handleJoinRoom(rooms, io),
  player_ready: handlePlayerReady(rooms, io),
  start_game: handleStartGame(rooms, io),
  submit_answer: handleSubmitAnswer(rooms, io),
  leave_room: handleLeaveRoom(rooms, io),
  reconnect: handleReconnect(rooms, io),
});

// === 创建房间 ===
const handleCreateRoom = (rooms, wordEngine, io) => (socket, data) => {
  const { playerName, mode = 'coop', difficulty = 1 } = data || {};
  const code = generateRoomCode(rooms);

  const room = new ShmupGameRoom(`room-${code}`, code, { mode, difficulty });
  room._io = io;
  room.wordEngine = wordEngine; // 注入单词引擎
  rooms.set(room.id, room);

  const result = room.addPlayer(socket.id, { name: playerName || '房主', isTeacher: true });
  if (!result.ok) return result;

  socket.join(room.id);

  Logger.info('shmup_room_created', { code, mode, playerCount: 1 });
  return {
    ok: true,
    room: room.toJSON(),
    player: result.player,
  };
};

// === 加入房间 ===
const handleJoinRoom = (rooms, io) => (socket, data) => {
  const { code, playerName } = data || {};
  const room = findRoomByCode(rooms, code);
  if (!room) return { ok: false, reason: 'room_not_found' };
  if (room.status !== 'waiting') return { ok: false, reason: 'game_already_started' };

  const result = room.addPlayer(socket.id, { name: playerName });
  if (!result.ok) return result;

  socket.join(room.id);
  room._io = io;

  // 通知房间内其他人
  socket.to(room.id).emit('player_joined', {
    socketId: socket.id,
    name: playerName,
    players: room._serializePlayers(),
  });

  Logger.info('shmup_player_joined', { code, name: playerName });

  return {
    ok: true,
    player: result.player,
    room: room.toJSON(),
  };
};

// === 准备 ===
const handlePlayerReady = (rooms, io) => (socket, data) => {
  const room = findRoomBySocketId(rooms, socket.id);
  if (!room) return { ok: false, reason: 'not_in_room' };

  const result = room.setPlayerReady(socket.id, true);
  if (!result.ok) return result;

  room.broadcast('player_ready', {
    socketId: socket.id,
    players: room._serializePlayers(),
  });

  // 全体准备完毕自动开始
  if (room.allReady()) {
    room.transition('countdown');
  }

  return { ok: true };
};

// === 开始游戏 ===
const handleStartGame = (rooms, io) => (socket, data) => {
  const room = findRoomBySocketId(rooms, socket.id);
  if (!room) return { ok: false, reason: 'not_in_room' };

  const player = room.players.get(socket.id);
  if (!player?.isTeacher) return { ok: false, reason: 'not_host' };

  if (room.players.size < 1) return { ok: false, reason: 'need_players' };

  return room.transition('countdown');
};

// === 答题 ===
const handleSubmitAnswer = (rooms, io) => (socket, data) => {
  const { answer } = data || {};
  const room = findRoomBySocketId(rooms, socket.id);
  if (!room) return { ok: false, reason: 'not_in_room' };

  return room.submitAnswer(socket.id, answer);
};

// === 离开房间 ===
const handleLeaveRoom = (rooms, io) => (socket, data) => {
  const room = findRoomBySocketId(rooms, socket.id);
  if (!room) return { ok: false, reason: 'not_in_room' };

  const player = room.players.get(socket.id);
  room.removePlayer(socket.id);
  socket.leave(room.id);

  room.broadcast('player_left', {
    socketId: socket.id,
    name: player?.name,
    players: room._serializePlayers(),
  });

  // 空房间清理
  if (room.players.size === 0) {
    room.cleanup();
    rooms.delete(room.id);
  }

  return { ok: true };
};

// === 重连 ===
const handleReconnect = (rooms, io) => (socket, data) => {
  const { code, playerName } = data || {};
  const room = findRoomByCode(rooms, code);
  if (!room) return { ok: false, reason: 'room_not_found' };

  // 查找离线玩家
  const entry = [...room.players.entries()].find(
    ([, p]) => p.name === playerName && !p.isOnline,
  );
  if (!entry) return { ok: false, reason: 'player_not_found_or_online' };

  const [oldSocketId, player] = entry;
  room.players.delete(oldSocketId);
  player.socketId = socket.id;
  player.isOnline = true;
  room.players.set(socket.id, player);

  socket.join(room.id);

  return {
    ok: true,
    player,
    room: room.toJSON(),
  };
};

// === Socket 初始化和断开 ===
const handleDisconnect = (socket, rooms) => {
  const room = findRoomBySocketId(rooms, socket.id);
  if (!room) return;

  const player = room.players.get(socket.id);
  if (player) {
    player.isOnline = false;
    room.broadcast('player_offline', {
      socketId: socket.id,
      name: player.name,
      players: room._serializePlayers(),
    });
  }
};

// === 主入口 ===
const setupShmupSocket = (io, rooms, wordEngine) => {
  const shmupNsp = io.of('/shmup');
  const handlers = createHandlers(rooms, wordEngine, shmupNsp);
  const heartbeatMgr = new HeartbeatManager();

  shmupNsp.on('connection', (socket) => {
    if (!checkRate(socket.id, 50)) {
      socket.emit('error', { msg: 'rate_limited' });
      socket.disconnect();
      return;
    }

    heartbeatMgr.register(socket, {
      onZombie: (sid) => {
        const room = findRoomBySocketId(rooms, sid);
        if (room) {
          const player = room.players.get(sid);
          if (player) player.isOnline = false;
          room.broadcast('player_disconnected', { socketId: sid });
        }
      },
      onRecover: (sid) => {
        const room = findRoomBySocketId(rooms, sid);
        if (room) {
          const player = room.players.get(sid);
          if (player) player.isOnline = true;
          room.broadcast('player_reconnected', { socketId: sid });
        }
      },
    });

    // 注册事件处理器
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, async (data, callback) => {
        try {
          const result = await handler(socket, data);
          if (callback) callback(result);
        } catch (err) {
          Logger.error('shmup_socket_error', { event, socketId: socket.id, error: err.message });
          if (callback) callback({ ok: false, error: err.message });
        }
      });
    });

    socket.on('ping', () => socket.emit('pong', { time: Date.now() }));

    socket.on('disconnect', () => {
      heartbeatMgr.remove(socket.id);
      handleDisconnect(socket, rooms);
    });
  });

  Logger.info('shmup_socket_ready');
};

// === 辅助函数 ===
const findRoomBySocketId = (rooms, socketId) =>
  [...rooms.values()].find((r) => r.players.has(socketId));

const findRoomByCode = (rooms, code) =>
  [...rooms.values()].find((r) => r.code === code);

const generateRoomCode = (rooms) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while ([...rooms.values()].some((r) => r.code === code));
  return code;
};

module.exports = { setupShmupSocket };
