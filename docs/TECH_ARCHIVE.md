# 技术档案 — English Parkour Classroom Game

> 英语跑酷课堂游戏 · 完整技术档案
> 最后更新: 2026-05-28
> 版本: v0.1.0

---

## 1. 项目概览

| 属性 | 值 |
|------|-----|
| 项目名称 | English Parkour Classroom Game (英语跑酷课堂游戏) |
| 项目类型 | 2D Side-Scrolling Parkour + English Spelling Real-time PVP |
| 目标用户 | 小学3-6年级学生 (平板) + 英语老师 (大屏) |
| 技术栈 | Phaser 3 + Vite / Node.js + Socket.io / MySQL 8.0 |
| 仓库 | `github.com/guanwenjie928/english-parkour` |
| 协议 | MIT |

---

## 2. 架构总览

```
┌──────────────────────────────────────────────────┐
│                    Client Layer                    │
│  ┌─────────┐ ┌─────────┐ ┌───────────────────┐  │
│  │ Phaser 3 │ │  Vite   │ │ Web Audio API     │  │
│  │ (WebGL)  │ │ (Build) │ │ (8-bit SFX Synth) │  │
│  └─────────┘ └─────────┘ └───────────────────┘  │
│  6 Scenes: Boot → Menu → Lobby → Game → Result   │
│            TeacherScene (老师大屏)                 │
├──────────────────────────────────────────────────┤
│                  WebSocket Layer                   │
│  ┌────────────────────────────────────────────┐  │
│  │          Socket.io (Engine.IO)              │  │
│  │  Events: join_room, submit_answer,          │  │
│  │          use_item, position_sync, ...        │  │
│  └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│                   Server Layer                    │
│  ┌─────────┐ ┌─────────┐ ┌───────────────────┐  │
│  │ Express  │ │  Game   │ │     Stability      │  │
│  │  REST    │ │ Engine  │ │  Heartbeat         │  │
│  │  API     │ │         │ │  RateLimiter       │  │
│  │          │ │ GameRoom│ │  ErrorBoundary     │  │
│  │ /api/    │ │ WordEng │ │  GracefulShutdown  │  │
│  │  rooms   │ │ ItemSys │ │  Logger            │  │
│  └─────────┘ └─────────┘ └───────────────────┘  │
├──────────────────────────────────────────────────┤
│                  Database Layer                   │
│  ┌────────────────────────────────────────────┐  │
│  │              MySQL 8.0                      │  │
│  │  Tables: words, maps, rooms, room_players,  │  │
│  │          game_answers, game_items,           │  │
│  │          game_words                          │  │
│  │  Engine: InnoDB, Charset: utf8mb4           │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## 3. 目录结构

```
english-parkour/
├── README.md                    # 项目说明
├── CHANGELOG.md                 # 更新日志
├── .gitignore                   # Git 忽略规则
├── assets/                      # 素材提示词 (源文件)
│   ├── leonardo_prompts.md      # Leonardo.ai 图片生成提示词
│   └── audio_prompts.md         # ElevenLabs 音频生成提示词
├── docs/                        # 设计文档
│   ├── TECH_ARCHIVE.md          # 本文件 — 技术档案
│   ├── 01_core_gameplay.md      # 核心玩法设计
│   ├── 02_architecture.md       # 系统架构
│   ├── 03_database.md           # 数据库设计
│   ├── 04_api_spec.md           # API 规范
│   └── 05_client_design.md      # 客户端设计
├── database/
│   └── init.sql                 # 数据库初始化脚本
├── server/                      # 服务端
│   ├── package.json
│   ├── index.js                 # 入口 (待拆分)
│   └── src/
│       ├── db.js                # 数据库连接池
│       ├── utils.js             # 通用工具函数
│       ├── routes/
│       │   └── api.js           # REST API 路由
│       ├── socket/
│       │   └── gameSocket.js    # WebSocket 事件处理
│       ├── game/
│       │   ├── GameRoom.js      # 房间状态机
│       │   ├── WordEngine.js    # 单词引擎
│       │   └── ItemSystem.js    # 道具系统
│       └── core/
│           ├── Heartbeat.js     # 心跳检测
│           ├── RateLimiter.js   # 令牌桶限流
│           ├── ErrorBoundary.js # 全局异常兜底
│           ├── GracefulShutdown.js # 优雅关闭
│           └── Logger.js        # 结构化日志
└── client/                      # 客户端
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── public/
    │   └── assets/              # 生成图片素材
    │       ├── characters/
    │       ├── backgrounds/
    │       ├── items/
    │       └── ui/
    └── src/
        ├── main.js              # 入口 + NetworkManager
        ├── utils/
        │   ├── SoundGenerator.js    # Web Audio 8-bit 合成器
        │   ├── ColorConfig.js       # 8玩家颜色配置
        │   ├── ConnectionManager.js # 连接状态机
        │   ├── StateReconciler.js   # 重连状态恢复
        │   ├── OfflineDetector.js   # 多信号离线检测
        │   ├── MessageQueue.js      # 离线消息队列
        │   └── helpers.js           # 通用工具函数
        └── scenes/
            ├── BootScene.js         # 资源加载
            ├── MenuScene.js         # 主菜单
            ├── LobbyScene.js        # 等待大厅
            ├── GameScene.js         # 游戏主场景
            ├── TeacherScene.js      # 老师大屏
            └── ResultScene.js       # 结算页
```

---

## 4. 核心技术决策

### 4.1 为什么用 Phaser 3？
- 成熟的 2D WebGL 框架，性能优异
- 内置物理、粒子、补间动画系统
- 丰富的插件生态
- 适合 2D 横版跑酷类型

### 4.2 为什么用 Web Audio API 合成音效？
- 零外部文件依赖，包体积极小
- 8-bit 复古风格完美匹配游戏调性
- 程序化控制，可运行时调参
- 避免音频版权问题

### 4.3 为什么服务端状态全内存？
- 每局最多 8 人 + 90 秒，状态量极小
- 内存操作延迟远低于 DB 读写
- DB 只负责持久化（开局前 + 结束后）
- 服务重启可通过 DB 恢复未完成房间

### 4.4 代码风格铁律
| 原则 | 实践 |
|------|------|
| 数据结构驱动 | `Map`/`Set` 索引，O(1) 查找 |
| 守卫子句优先 | 函数顶部 return early，零深层嵌套 |
| 查表替代分支 | `switch`/`if-else` → `Map<key, handler>` |
| 管道组合 | 数据流经 `filter → map → reduce` |
| 不变性 | `Object.freeze()` 常量，`structuredClone()` 深拷贝 |

---

## 5. 数据库核心表

| 表名 | 行数 (预计) | 说明 |
|------|------------|------|
| `words` | ~200 | 单词库 (三~六年级) |
| `maps` | 5 | 地图配置 |
| `rooms` | ~100/天 | 游戏房间 |
| `room_players` | ~800/天 | 玩家参与记录 |
| `game_answers` | ~5000/天 | 答题记录 |
| `game_items` | ~500/天 | 道具使用记录 |
| `game_words` | ~2000/天 | 每局使用的单词 |

---

## 6. API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/rooms` | 创建房间，返回 6 位房间码 |
| `POST` | `/api/rooms/:code/join` | 加入房间 |
| `GET` | `/api/rooms/:code` | 获取房间状态 |
| `GET` | `/api/rooms/:code/export` | Excel 导出比赛数据 |
| `POST` | `/api/rooms/:code/reconnect` | 断线重连 |

---

## 7. WebSocket 事件

### 客户端 → 服务端
| 事件 | 载荷 | 说明 |
|------|------|------|
| `join_room` | `{ code, playerName }` | 加入房间 |
| `player_ready` | `{ roomId }` | 玩家准备 |
| `start_game` | `{ roomId }` | 老师开始游戏 |
| `submit_answer` | `{ roomId, answer }` | 提交答案 |
| `use_item` | `{ roomId, itemType, targetTrack? }` | 使用道具 |
| `teacher_action` | `{ roomId, action, payload }` | 老师控制指令 |

### 服务端 → 客户端
| 事件 | 载荷 | 说明 |
|------|------|------|
| `game_start` | `{ mapId, countdown }` | 游戏开始 |
| `word_challenge` | `{ type, word, display, blankPositions? }` | 单词挑战 |
| `answer_result` | `{ correct, effects }` | 答题结果 |
| `position_sync` | `[{ socketId, progress, speed, lane }]` | 位置同步 |
| `item_reward` | `{ item }` | 道具奖励 |
| `item_effect` | `{ fromId, toId, itemType }` | 道具生效广播 |
| `game_end` | `{ rankings[] }` | 游戏结束 |

---

## 8. 稳定性保障

| 层级 | 机制 | 参数 |
|------|------|------|
| 心跳 | 5s ping / 8s 超时 | 2次丢失 → 僵尸, 15s → 清理 |
| 限流 | 令牌桶 | 50 tokens/s 默认, 按 socketId 分桶 |
| 异常兜底 | process 级 + Express 级 + Socket 级 | 三级捕获 |
| 优雅关闭 | SIGTERM → 通知 → 保存 → 关HTTP → 关DB | 5s 超时 |
| 房间回收 | 定时清理 | 每5min, 30min TTL |
| 重连 | 指数退避 `min(1000*2^n, 10000)` | 最多5次 |
| 离线检测 | 浏览器 API + 主动探针 + 心跳 | 三信号融合 |
| 消息队列 | 环形缓冲, 重连回放 | 20条上限, 30s 过期 |

---

## 9. 分支策略

```
main                    # 稳定版本，只接受 PR 合并
  └── feature/phase-*   # 每个阶段一个功能分支
```

分支命名: `feature/phase-{n}-{name}`
- `feature/phase-1-assets` — 素材生成
- `feature/phase-2-server` — 服务端补全
- `feature/phase-3-client` — 客户端补全
- `feature/phase-4-data` — 数据扩充
- `feature/phase-5-stability` — 稳定性模块

---

## 10. 环境要求

| 组件 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18 LTS | 服务端 + 构建 |
| MySQL | >= 8.0 | 数据持久化 |
| npm | >= 9 | 包管理 |
| 浏览器 | Chrome/Safari/Firefox 最新版 | 需支持 WebGL + Web Audio |
