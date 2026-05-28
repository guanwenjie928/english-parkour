# English Parkour 项目架构

## 项目概述
英语跑酷课堂游戏 — 拼写驱动前进的多人在线竞速教育游戏。玩家通过正确拼写英语单词来推进进度，配合道具系统、AI机器人，实现寓教于乐的课堂互动体验。

- **GitHub**: `guanwenjie928/english-parkour`
- **GitHub Pages**: `https://guanwenjie928.github.io/english-parkour/`
- **技术栈**: Phaser 3.90 (WebGL) + Vite 5 + Node.js (Socket.io) + GitHub Pages (docs/)

## 目录结构
```
english-parkour/
├── client/                       # 前端游戏（Phaser 3.90 + Vite）
│   ├── vite.config.js            # Vite配置：base=/english-parkour/，GITHUB_PAGES=true时用相对路径./
│   ├── src/
│   │   ├── engine/
│   │   │   ├── LocalGameEngine.js    # 本地游戏引擎（单人模式核心）
│   │   │   ├── WordBank.js           # 单词库（40词，三~六年级）
│   │   │   └── ItemRegistry.js       # 道具注册表
│   │   ├── scenes/
│   │   │   ├── BootScene.js          # 两阶段加载（菜单素材→游戏素材）
│   │   │   ├── MenuScene.js          # 菜单/登录页
│   │   │   └── GameScene.js          # 游戏主场景
│   │   └── utils/
│   │       ├── ColorConfig.js        # GHIBLI色彩体系 + 工具函数
│   │       ├── AnimationHelper.js    # 动画工具（浮动粒子、毛玻璃面板等）
│   │       └── SoundGenerator.js     # Web Audio API 音效生成
│   └── public/assets/
│       ├── ui/                   # menu-bg.jpg, menu-character.png, ui-atlas.jpg, menu-logo.jpg
│       ├── characters/           # run-sheet.png(1456×720), pose-sheet.png(1408×768)
│       ├── items/                # items-strip.png(2320×464)
│       ├── vfx/                  # vfx-strip.png(464×2320)
│       └── backgrounds/          # city-far.jpg, city-mid.jpg, city-near.jpg
├── server/
│   └── src/game/GameRoom.js      # 服务端房间状态机 + 游戏循环
├── docs/                         # GitHub Pages 部署目录（Vite 构建输出）
├── convert_sprites.py            # PIL 精灵图JPG→PNG + 背景去除工具
└── memory/                       # 项目文档
```

## 核心技术概念

### 状态机 (STATE_MACHINE)
```
waiting → countdown → playing → ended → closed
```
查表驱动状态转换，每个状态的 `onEnter` 回调自动触发对应的启动/清理逻辑。

### 两阶段加载 (BootScene)
- **阶段1 (preload)**: 菜单必需素材（menu-character, menu-bg）
- **阶段2 (后台)**: 游戏素材（run-sheet, pose-sheet, items-strip, vfx-strip, 背景图）
- 动态帧切片：`_processTextures()` 自动适配精灵图尺寸切分帧
- 动画创建：`_createAnimations()` 创建 run/electric-hit/shield-bubble 动画

### 拼写驱动前进机制 (核心玩法)
- 真人玩家不自动前进，完全靠答题驱动
- 答对 → progress +7%（约14题到终点），speed +0.3
- 答错 → 1.5s 冷却期，speed -0.3
- 服务端/客户端双端同步该逻辑

### 道具系统 (ITEM_REGISTRY)
| 道具 | 效果 | 持续时间 |
|------|------|----------|
| rocket | 速度×2.5 | 5s |
| electric | 麻痹（需连续答对2题解除）| — |
| banana | 减速（需答对1题解除）| — |
| shield | 免疫控制道具 | 8s |

### Vite 构建配置
```js
base: process.env.GITHUB_PAGES ? './' : '/english-parkour/',
outDir: '../docs'
```
- 本地开发：绝对路径 `/english-parkour/`
- GitHub Pages：相对路径 `./`（避免 repo 名路径不匹配导致的 404）

## 关键文件索引

### GameScene.js 核心方法
- `create()` — 场景入口（L85-140）
- `createBackground()` — 三层视差背景（city-far/mid/near）
- `createHUD()` — 顶部信息栏 + 迷你进度条
- `createItemPanel()` — 右下角道具面板（响应式）
- `createVirtualKeyboard()` — 底部浮动拼写面板（L696-880）
- `showWordChallenge()` — 显示拼写题目（游戏不暂停）
- `handleAnswer()` — 答案验证 + 反馈特效
- `gameLoop()` — 主循环（相机跟随 + 位置同步）

### MenuScene.js 核心方法
- `createBackground()` — menu-bg 背景 + 天空渐变色条
- `createDecorations()` — 角色立绘（居中 scale 0.7，呼吸动画）
- `createPanel()` — 名字输入面板
- `createButtons()` — 快速开始 / 加入房间 / 老师模式

### LocalGameEngine.js 核心方法
- `_tick()` — AI 玩家自动前进，真人跳过
- `submitAnswer(data)` — 拼写驱动进度推进
- `startWordChallenge()` — 触发拼写事件
- `useItem(itemType)` — 道具使用逻辑

### GameRoom.js 核心方法
- `tick()` — 服务端 tick（仅同步位置，不自动推进）
- `handleAnswer(socketId, answer)` — 服务端答题验证 + 进度推进
- `sendNewWordChallenge()` — 广播新拼写题目
- `transition(newStatus)` — 状态机转换
