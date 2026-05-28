const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// 数据库连接池
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'english_parkour',
  waitForConnections: true,
  connectionLimit: 10
});

// 房间管理
const rooms = new Map();

// REST API
app.post('/api/rooms', async (req, res) => {
  // 创建房间逻辑
  try {
    const { word_difficulty, word_category, challenge_type_ratio, duration, max_players } = req.body;
    const roomId = uuidv4();
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await db.execute(
      'INSERT INTO rooms (id, code, word_config, duration, max_players) VALUES (?, ?, ?, ?, ?)',
      [roomId, code, JSON.stringify({ word_difficulty, word_category, challenge_type_ratio }), duration || 90, max_players || 8]
    );

    res.json({
      room_id: roomId,
      code: code,
      ws_url: `wss://${req.headers.host}/game`,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms/:code/join', async (req, res) => {
  // 加入房间逻辑
  try {
    const { player_name } = req.body;
    const [rooms] = await db.execute('SELECT * FROM rooms WHERE code = ? AND status = "waiting"', [req.params.code]);

    if (rooms.length === 0) {
      return res.status(404).json({ error: '房间不存在或已开始' });
    }

    const room = rooms[0];
    const [players] = await db.execute('SELECT COUNT(*) as count FROM room_players WHERE room_id = ?', [room.id]);

    if (players[0].count >= room.max_players) {
      return res.status(400).json({ error: '房间已满' });
    }

    const trackNumber = players[0].count + 1;
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
    const colorTheme = colors[trackNumber - 1];

    const [result] = await db.execute(
      'INSERT INTO room_players (room_id, player_name, track_number, color_theme) VALUES (?, ?, ?, ?)',
      [room.id, player_name, trackNumber, colorTheme]
    );

    res.json({
      player_id: result.insertId,
      track: trackNumber,
      color: colorTheme,
      room_status: room.status
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rooms/:code/export', async (req, res) => {
  // Excel导出逻辑
  try {
    const XLSX = require('xlsx');
    const [rooms] = await db.execute('SELECT * FROM rooms WHERE code = ?', [req.params.code]);

    if (rooms.length === 0) {
      return res.status(404).json({ error: '房间不存在' });
    }

    const [reportData] = await db.execute('SELECT * FROM v_room_report WHERE room_id = ?', [rooms[0].id]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);
    XLSX.utils.book_append_sheet(wb, ws, '答题报表');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=英语跑酷_${new Date().toISOString().split('T')[0]}_${req.params.code}.xlsx`);
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebSocket
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_room', async (data) => {
    // 加入房间处理
    const { room_code, player_name } = data;
    socket.join(room_code);
    socket.to(room_code).emit('player_joined', { player_name });
  });

  socket.on('answer', async (data) => {
    // 答题处理
    const { word_id, answer, time_ms } = data;
    // 校验答案逻辑
    // 广播结果
  });

  socket.on('use_item', async (data) => {
    // 道具使用处理
    const { item_type, target_track } = data;
    // 校验并广播
  });

  socket.on('disconnect', () => {
    // 断线处理
    console.log('Client disconnected:', socket.id);
  });
});

// 游戏循环定时器
setInterval(() => {
  // 50ms广播房间状态
  rooms.forEach((room, roomId) => {
    if (room.status === 'playing') {
      io.to(roomId).emit('room_state', {
        players: room.players,
        remaining: room.remainingTime
      });
    }
  });
}, 50);

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
