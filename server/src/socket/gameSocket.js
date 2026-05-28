// Socket.io 事件路由 — Map 查表驱动，零 switch 地狱

const { Logger } = require('../core/Logger');
const { checkRate } = require('../core/RateLimiter');
const { HeartbeatManager } = require('../core/Heartbeat');

// 事件处理器注册表
const createHandlers = (rooms, wordEngine, io) => ({
  join_room: handleJoinRoom(rooms, io),
  player_ready: handlePlayerReady(rooms, io),
  start_game: handleStartGame(rooms, io),
  submit_answer: handleSubmitAnswer(rooms, wordEngine, io),
  use_item: handleUseItem(rooms, io),
  teacher_action: handleTeacherAction(rooms, io),
  reconnect: handleReconnect(rooms, io),
  request_state_sync: handleRequestStateSync(rooms, io),
});

const setupGameSocket = (io, rooms, wordEngine) => {
  const handlers = createHandlers(rooms, wordEngine, io);
  const heartbeatMgr = new HeartbeatManager();

  io.on('connection', (socket) => {
    Logger.info('socket_connected', { socketId: socket.id });

    // 速率限制检查
    if (!checkRate(socket.id, 50)) {
      socket.emit('error', { msg: 'rate_limited' });
      socket.disconnect();
      return;
    }

    // 注册心跳
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
          Logger.error('socket_handler_error', {
            event,
            socketId: socket.id,
            error: err.message,
          });
          if (callback) callback({ ok: false, error: err.message });
        }
      });
    });

    // ping/pong 用于 RTT 测量
    socket.on('ping', () => socket.emit('pong', { time: Date.now() }));

    socket.on('disconnect', () => {
      Logger.info('socket_disconnected', { socketId: socket.id });
      heartbeatMgr.remove(socket.id);
      handleDisconnect(socket, rooms, io);
    });
  });
};

// === 事件处理器 ===

const handleJoinRoom = (rooms, io) => async (socket, data) => {
  const { code, playerName, isTeacher } = data;
  const room = [...rooms.values()].find((r) => r.code === code);

  if (!room) return { ok: false, reason: 'room_not_found' };
  if (room.status !== 'waiting') return { ok: false, reason: 'game_already_started' };

  const result = room.addPlayer(socket.id, {
    name: playerName,
    colorTheme: getColorByTrack(room.players.size + 1),
    isTeacher: !!isTeacher,
  });

  if (!result.ok) return result;

  socket.join(room.id);
  room.io = io;

  // 通知房间内其他人
  socket.to(room.id).emit('player_joined', {
    socketId: socket.id,
    name: playerName,
    trackNumber: result.player.trackNumber,
  });

  return {
    ok: true,
    player: result.player,
    players: [...room.players.values()].map((p) => ({
      socketId: p.socketId,
      name: p.name,
      trackNumber: p.trackNumber,
      isReady: p.isReady,
    })),
  };
};

const handlePlayerReady = (rooms, io) => (socket, data) => {
  const room = findRoomBySocketId(rooms, socket.id);
  if (!room) return { ok: false, reason: 'not_in_room' };

  const result = room.setPlayerReady(socket.id, true);
  if (!result.ok) return result;

  room.broadcast('player_ready', { socketId: socket.id });

  // 检查是否全部准备
  if (room.allReady() && room.players.size >= 2) {
    room.transition('countdown');
  }

  return { ok: true };
};

const handleStartGame = (rooms, io) => (socket, data) => {
  const room = findRoomBySocketId(rooms, socket.id);
  if (!room) return { ok: false, reason: 'not_in_room' };

  const player = room.players.get(socket.id);
  if (!player?.isTeacher) return { ok: false, reason: 'not_teacher' };

  return room.transition('countdown');
};

const handleSubmitAnswer = (rooms, wordEngine, io) => (socket, data) => {
  const { answer } = data;
  const room = findRoomBySocketId(rooms, socket.id);
  if (!room) return { ok: false, reason: 'not_in_room' };

  const result = room.handleAnswer(socket.id, answer);
  if (!result.ok) return result;

  const player = room.players.get(socket.id);

  // 通知玩家结果
  socket.emit('answer_result', {
    correct: result.correct,
    newSpeed: result.newSpeed,
    consecutiveCorrect: player.consecutiveCorrect,
  });

  // 通知其他人状态更新
  room.broadcast('player_update', {
    socketId: socket.id,
    progress: player.progress,
    speed: player.speed,
  });

  // 道具奖励
  if (result.reward?.grant) {
    socket.emit('item_reward', { item: result.reward.item });
  }

  // 延迟发送新题（模拟读题时间）
  setTimeout(() => {
    if (room.status === 'playing') {
      const word = wordEngine.selectWord(room.id, room.wordConfig);
      if (word) {
        const challenge = wordEngine.generateChallenge(word);
        player.currentChallenge = challenge;
        socket.emit('word_challenge', challenge);
      }
    }
  }, 2000);

  return { ok: true };
};

const handleUseItem = (rooms, io) => (socket, data) => {
  const { itemType, targetTrack } = data;
  const room = findRoomBySocketId(rooms, socket.id);
  if (!room) return { ok: false, reason: 'not_in_room' };

  const result = room.useItem(socket.id, itemType, targetTrack);
  if (!result.ok) return result;

  // 广播道具效果
  room.broadcast('item_effect', {
    fromId: result.fromId,
    toId: result.toId,
    itemType,
    blocked: result.blocked,
    by: result.by,
  });

  return { ok: true };
};

const handleTeacherAction = (rooms, io) => (socket, data) => {
  const { action, payload } = data;
  const room = findRoomBySocketId(rooms, socket.id);
  if (!room) return { ok: false, reason: 'not_in_room' };

  const player = room.players.get(socket.id);
  if (!player?.isTeacher) return { ok: false, reason: 'not_teacher' };

  switch (action) {
    case 'pause':
      room.clearTimer();
      room.broadcast('game_paused', {});
      break;
    case 'resume':
      room.startGameLoop();
      room.broadcast('game_resumed', {});
      break;
    case 'end':
      room.transition('ended');
      break;
    default:
      return { ok: false, reason: 'unknown_action' };
  }

  return { ok: true };
};

const handleReconnect = (rooms, io) => (socket, data) => {
  const { code, playerName } = data;
  const room = [...rooms.values()].find((r) => r.code === code);

  if (!room) return { ok: false, reason: 'room_not_found' };

  // 查找离线玩家
  const entry = [...room.players.entries()].find(
    ([, p]) => p.name === playerName && !p.isOnline
  );

  if (!entry) return { ok: false, reason: 'player_not_found_or_online' };

  const [oldSocketId, player] = entry;

  // 更新 socketId
  room.players.delete(oldSocketId);
  room.players.set(socket.id, { ...player, socketId: socket.id, isOnline: true });
  room.trackMap.set(player.trackNumber, socket.id);

  socket.join(room.id);

  return {
    ok: true,
    player: { ...player, socketId: socket.id },
    roomState: room.toJSON(),
  };
};

const handleRequestStateSync = (rooms, io) => (socket, data) => {
  const room = findRoomBySocketId(rooms, socket.id);
  if (!room) return null;

  const player = room.players.get(socket.id);
  if (!player) return null;

  return {
    progress: player.progress,
    speed: player.speed,
    correctCount: player.correctCount,
    items: player.items,
    effects: player.effects,
    status: room.status,
    elapsed: room.elapsed,
  };
};

const handleDisconnect = (socket, rooms, io) => {
  // 标记为离线，但保留数据以便重连
  const room = findRoomBySocketId(rooms, socket.id);
  if (room) {
    const player = room.players.get(socket.id);
    if (player) {
      player.isOnline = false;
      room.broadcast('player_offline', { socketId: socket.id, name: player.name });
    }
  }
};

// === 辅助函数 ===

const findRoomBySocketId = (rooms, socketId) =>
  [...rooms.values()].find((r) => r.players.has(socketId));

const getColorByTrack = (track) => {
  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
  return colors[(track - 1) % colors.length];
};

module.exports = { setupGameSocket };
