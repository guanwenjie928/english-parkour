# API 接口定义

## REST API

### 创建房间
```
POST /api/rooms
Request: {
    "word_difficulty": 3,
    "word_category": "四年级",
    "challenge_type_ratio": {"fill_blank":0.5,"cn_to_en":0.5},
    "duration": 90,
    "max_players": 8
}
Response: {
    "room_id": "uuid",
    "code": "123456",
    "ws_url": "wss://your-server.com/game",
    "expires_at": "2026-05-27T22:30:00Z"
}
```

### 加入房间
```
POST /api/rooms/:code/join
Request: { "player_name": "小明" }
Response: {
    "player_id": 8,
    "track": 3,
    "color": "red",
    "room_status": "waiting"
}
```

### 获取房间状态
```
GET /api/rooms/:code
Response: {
    "code": "123456",
    "status": "playing",
    "players": [
        {"id":1,"name":"小明","track":1,"progress":45.2,"status":"running"}
    ],
    "map": {"id":"city","name":"城市屋顶"},
    "remaining_seconds": 45
}
```

### 导出Excel报表
```
GET /api/rooms/:code/export
Response: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
文件名: 英语跑酷_2026-05-27_123456.xlsx
```

## WebSocket 事件

### 客户端 → 服务器

| 事件 |  payload | 说明 |
|------|---------|------|
| `join_room` | `{room_code, player_name}` | 加入房间 |
| `player_ready` | `{}` | 准备就绪 |
| `answer` | `{word_id, answer, time_ms}` | 提交答案 |
| `use_item` | `{item_type, target_track}` | 使用道具 |
| `ping` | `{timestamp}` | 心跳 |

### 服务器 → 客户端

| 事件 | payload | 说明 |
|------|---------|------|
| `room_state` | `{players, status, countdown}` | 房间状态更新 |
| `game_start` | `{map, words, start_time}` | 游戏开始 |
| `word_challenge` | `{word_id, display, type, time_limit}` | 单词挑战 |
| `answer_result` | `{player_id, is_correct, new_speed, streak}` | 答题结果 |
| `item_effect` | `{from, to, item_type, duration}` | 道具效果 |
| `player_stunned` | `{player_id, recover_words}` | 被控制 |
| `game_end` | `{rankings, stats}` | 游戏结束 |
| `player_disconnected` | `{player_id}` | 玩家断线 |
| `player_reconnected` | `{player_id}` | 玩家重连 |

## 消息格式示例

### 答题结果广播
```json
{
    "event": "answer_result",
    "data": {
        "player_id": 3,
        "is_correct": true,
        "streak": 3,
        "new_speed": 1.5,
        "item_gained": "rocket",
        "word": "beautiful",
        "time_ms": 4200
    }
}
```

### 道具效果广播
```json
{
    "event": "item_effect",
    "data": {
        "from_player": 3,
        "to_player": 5,
        "item_type": "electric",
        "duration": -1,
        "recover_condition": {
            "type": "streak_correct",
            "count": 2
        }
    }
}
```
