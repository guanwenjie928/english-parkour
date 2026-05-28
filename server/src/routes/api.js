// REST API 路由

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { Logger } = require('../core/Logger');
const { generateRoomCode } = require('../utils');
const { GameRoom } = require('../game/GameRoom');

const router = express.Router();

module.exports = (rooms, wordEngine) => {
  // 健康检查
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // 创建房间
  router.post('/rooms', async (req, res) => {
    try {
      const {
        word_difficulty,
        word_category,
        challenge_type_ratio,
        duration,
        max_players,
        map_id,
      } = req.body;

      const roomId = uuidv4();
      const code = generateRoomCode();

      await db.execute(
        'INSERT INTO rooms (id, code, map_id, word_config, duration, max_players) VALUES (?, ?, ?, ?, ?, ?)',
        [
          roomId,
          code,
          map_id || 'city',
          JSON.stringify({
            word_difficulty,
            word_category,
            challenge_type_ratio,
          }),
          duration || 90,
          max_players || 8,
        ]
      );

      // 创建内存中的房间实例
      const room = new GameRoom(roomId, code, {
        mapId: map_id || 'city',
        duration: (duration || 90) * 1000,
        wordConfig: {
          difficulty: word_difficulty || 2,
          category: word_category,
        },
      });
      room.wordEngine = wordEngine;
      rooms.set(roomId, room);

      Logger.info('room_created', { roomId, code });

      res.json({
        room_id: roomId,
        code,
        ws_url: `wss://${req.headers.host}/socket.io`,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
    } catch (err) {
      Logger.error('create_room_error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // 加入房间
  router.post('/rooms/:code/join', async (req, res) => {
    try {
      const { player_name, is_teacher } = req.body;
      const [roomRows] = await db.execute(
        'SELECT * FROM rooms WHERE code = ? AND status = "waiting"',
        [req.params.code]
      );

      if (roomRows.length === 0) {
        return res.status(404).json({ error: '房间不存在或已开始' });
      }

      const roomData = roomRows[0];
      const [playerCount] = await db.execute(
        'SELECT COUNT(*) as count FROM room_players WHERE room_id = ?',
        [roomData.id]
      );

      if (playerCount[0].count >= roomData.max_players) {
        return res.status(400).json({ error: '房间已满' });
      }

      const trackNumber = playerCount[0].count + 1;
      const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
      const colorTheme = colors[trackNumber - 1];

      const [result] = await db.execute(
        'INSERT INTO room_players (room_id, player_name, track_number, color_theme) VALUES (?, ?, ?, ?)',
        [roomData.id, player_name, trackNumber, colorTheme]
      );

      res.json({
        player_id: result.insertId,
        track: trackNumber,
        color: colorTheme,
        room_status: roomData.status,
      });
    } catch (err) {
      Logger.error('join_room_error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // 获取房间状态
  router.get('/rooms/:code', async (req, res) => {
    try {
      const [rooms] = await db.execute('SELECT * FROM rooms WHERE code = ?', [
        req.params.code,
      ]);

      if (rooms.length === 0) {
        return res.status(404).json({ error: '房间不存在' });
      }

      const [players] = await db.execute(
        'SELECT player_name, track_number, color_theme, is_online FROM room_players WHERE room_id = ?',
        [rooms[0].id]
      );

      res.json({
        room: rooms[0],
        players,
      });
    } catch (err) {
      Logger.error('get_room_error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // 断线重连
  router.post('/rooms/:code/reconnect', async (req, res) => {
    try {
      const { player_name } = req.body;
      const [rooms] = await db.execute('SELECT * FROM rooms WHERE code = ?', [
        req.params.code,
      ]);

      if (rooms.length === 0) {
        return res.status(404).json({ error: '房间不存在' });
      }

      const [players] = await db.execute(
        'SELECT * FROM room_players WHERE room_id = ? AND player_name = ?',
        [rooms[0].id, player_name]
      );

      if (players.length === 0) {
        return res.status(404).json({ error: '玩家不存在' });
      }

      res.json({
        ok: true,
        player: players[0],
        room: rooms[0],
      });
    } catch (err) {
      Logger.error('reconnect_error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Excel 导出
  router.get('/rooms/:code/export', async (req, res) => {
    try {
      const XLSX = require('xlsx');
      const [rooms] = await db.execute('SELECT * FROM rooms WHERE code = ?', [
        req.params.code,
      ]);

      if (rooms.length === 0) {
        return res.status(404).json({ error: '房间不存在' });
      }

      const [reportData] = await db.execute(
        'SELECT * FROM v_room_report WHERE room_id = ?',
        [rooms[0].id]
      );

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(reportData);
      XLSX.utils.book_append_sheet(wb, ws, '答题报表');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=英语跑酷_${new Date().toISOString().split('T')[0]}_${req.params.code}.xlsx`
      );
      res.send(buf);
    } catch (err) {
      Logger.error('export_error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // 获取单词列表
  router.get('/words', async (req, res) => {
    try {
      const { difficulty, category, limit = 50 } = req.query;
      let sql = 'SELECT * FROM words WHERE is_active = TRUE';
      const params = [];

      if (difficulty) {
        sql += ' AND difficulty = ?';
        params.push(difficulty);
      }
      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }
      sql += ' ORDER BY RAND() LIMIT ?';
      params.push(parseInt(limit));

      const [words] = await db.query(sql, params);
      res.json({ words });
    } catch (err) {
      Logger.error('get_words_error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

// 挂载导入路由
module.exports.importRoutes = require('../import/ImportRouter');
