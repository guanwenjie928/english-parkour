# English Parkour 重规划 GDD

> 基于 `game-development` 技能套件的 7 大维度重新规划
> 当前版本: v0.4.0 | 目标版本: v1.0.0

---

## 一、当前诊断（按 game-design 核心循环模型分析）

### 当前 30 秒循环
```
ACTION → 看到单词拼写出来 → 按键盘 → FEEDBACK → 角色前进/后退
REWARD → 进度条变化（弱反馈）
```

| 问题 | 对应设计原则违反 |
|------|------------------|
| 只有单一拼写→前进循环 | 缺少多层循环嵌套（核心/扩展/元循环） |
| 没有难度曲线 | 违反 Flow State 原则 → 玩家很快厌倦 |
| 没有阶段目标 | 没有 Progression Design |
| 答对/答错反馈弱 | 没有 Multi-sensory Feedback |
| 素材手动转换 | 没有 Asset Pipeline 自动化 |
| AI 无个性 | AI 只用了 FSM，缺少 Behavior Tree 分层 |

---

## 二、核心循环重构（game-design）
以固定比例滚动（拼写是唯一得分手段）
### 新 30 秒核心循环
```
OBSERVE → 看到中文释义 + 赛道环境 + 障碍物距离
DECIDE  → 思考拼写 → 同时判断是否使用道具
ACT     → 输入拼写 → 点击道具
FEEDBACK→ 答对冲刺+粒子爆发 / 答错卡顿+红色闪屏
REWARD  → ✨ 连击数 + 完美拼写判定 + 金币/星星获取
```

### 三层循环结构
| 层 | 频率 | 内容 |
|----|------|------|
| **核心循环** | 每 10-15s | 拼写→冲刺→反馈 |
| **扩展循环** | 每 60-90s | 关卡完成→星级评价→解锁新关卡 |
| **元循环** | 每章节 | 主题解锁、成就收集、排行榜刷新 |

---

## 三、难度平衡系统（Flow State 实现）

### 动态难度调节
```
当前连续答对 > 3 → difficulty +1（更难的词）
当前连续答错 > 2 → difficulty -1（回落）
```

### 单词难度分级
| 等级 | 年级 | 词长 | 出现时机 |
|------|------|------|----------|
| ★☆☆☆ | 三年级 | 3-4 字母 | 关卡 1-3 |
| ★★☆☆ | 四年级 | 5-6 字母 | 关卡 4-6 |
| ★★★☆ | 五年级 | 6-7 字母 | 关卡 7-9 |
| ★★★★ | 六年级 | 7-9 字母 | 关卡 10+ |

---

## 四、程序化内容生成矩阵

### 4.1 程序化单词生成
```
输入：年级 + 难度等级
处理：WordEngine 模板匹配 → Fisher-Yates 随机 → 去重检查
输出：{ word, meaning, blank_pattern, distractors }
```
- 题型扩展：填空 / 首字母 / 听音拼写 / 反义词
- 错题重考机制：自动收集错词加大权重

### 4.2 程序化地形生成
```
赛道结构（Perlin Noise 驱动）：
├── 直线区（拼写挑战段，60%）→ 平坦
├── 上坡区（加速段，15%）→ 需要加速道具
├── 下坡区（冲刺段，10%）→ 视觉加速
└── 弯道区（变轨段，15%）→ 屏幕震动

障碍物生成（基于进度%）：
├── 35% → 简单障碍（木箱）
├── 50% → 中级障碍（路障+减速带）
├── 70% → 密集障碍 + 岔路选择
└── 90% → BOSS 单词（3 词连答才能通过）
```

### 4.3 程序化粒子特效生成器
```
// 答对：绿色星星爆发
burstParticles(x, y, color='green', count=12, pattern='star')

// 连击：彩色烟花
comboParticles(x, y, comboCount, pattern='firework')

// BOSS 答对：全屏庆祝
screenParticles(pattern='confetti', duration=2s)
```

### 4.4 素材变体系统
```
base_sprite → [color_shift, scale_jitter, flip, rotate]
一个精灵图 → 8-16 个视觉变体（无需手工绘制）
```

---

## 五、视觉表现升级（game-art + 2d-games）

### 5.1 艺术风格定义
| 维度 | 当前 | 目标 |
|------|------|------|
| **风格** | 不统一（代码绘图 + JPG素材混用） | **Vector/Flat 治愈系** |
| **色板** | GHIBLI（已定义但未贯彻） | GHIBLI 严格色板 + 程序化渐变 |
| **UI** | 部分硬编码像素值 | 全响应式 + 统一动效语言 |
| **角色** | 静态精灵图 | 骨骼动画（或帧动画状态机） |

### 5.2 动画状态机（2d-games 原则）
```
IDLE → RUNNING → JUMPING → LANDING
                 → SLIDING（被banana击中）
                 → STUNNED（被electric击中）
                 → VICTORY（到达终点）
                 → SHIELDED（护盾状态）
```
- 帧率：12 FPS（running）/ 8 FPS（idle）
- Squash & Stretch：弹跳效果
- Anticipation：冲刺前回缩

### 5.3 UI 动效规范
| 元素 | 动效 | Easing | 时长 |
|------|------|--------|------|
| 面板入场 | 底部滑入 | Back.easeOut | 350ms |
| 面板退场 | 向下滑出 | Cubic.easeIn | 250ms |
| 按钮悬停 | Scale 1.05 + 阴影 | Sine.easeOut | 150ms |
| 道具获得 | Scale 0→1 弹入 | Back.easeOut | 300ms |
| 连击计数 | 数字弹跳 + 缩放脉冲 | Elastic.easeOut | 400ms |

---

## 六、音效系统升级（game-audio）

### 6.1 音效分层
| 类别 | 内容 | 优先级 | 生成方式 |
|------|------|--------|----------|
| **UI** | 点击/悬停/面板开关 | 4 | Web Audio 合成 |
| **Player SFX** | 答对/答错/连击/冲刺 | 2 | 采样 + 合成混合 |
| **环境** | 风声/人群/赛道氛围 | 5 | 循环合成 |
| **音乐** | 菜单BGM/游戏BGM/胜利BGM | 3 | 程序化生成 |
| **语音** | "Great!"/"连击x3!"/"加油!" | 1 | TTS 或预录 |

### 6.2 自适应音频
```
comboCount === 3 → BGM intensity +20%（Vertical Layer 叠加）
health < 30%    → low-pass filter（紧迫感）
nearFinish       → tempo +10%（最后冲刺加速）
```

---

## 七、多人体验（multiplayer）

### 7.1 模式扩展
| 模式 | 描述 | 优先级 |
|------|------|--------|
| **练习模式** | 当前单人+AI | ✅ 已有 |
| **实时对战** | 2-8人同场竞速 | P1 |
| **团队接力** | 4v4 接力拼写 | P2 |
| **挑战模式** | 限时Boss词挑战 | P1 |
| **每日挑战** | 每天3关，全服排名 | P2 |

### 7.2 网络架构
```
当前：Socket.io 基础广播
升级：State Sync + Client Prediction + Server Reconciliation
```

---

## 八、P0-P4 优先级路线图

### P0 — 立即修复（本周）
| # | 任务 | 文件 | 预期效果 |
|---|------|------|----------|
| 1 | 菜单页视觉修复（3端一致） | MenuScene.js | 第一印象合格 |
| 2 | 开场 3-2-1 倒计时动画 | GameScene.js | 仪式感 |
| 3 | 答对/答错粒子爆发特效 | GameScene.js | 即时感官反馈 |
| 4 | 连击系统（combo text + 分数倍率） | GameScene.js + LocalGameEngine.js | 深度动机 |
| 5 | 星星收集系统（答对N题掉落） | GameScene.js | 可视化进度 |

### P1 — 核心体验（2周内）
| # | 任务 | 预期效果 |
|---|------|----------|
| 1 | 难度动态调节 | Flow State 保持 |
| 2 | 关卡结构（章节→关卡→评价） | 目标感 |
| 3 | 单词题型扩展（填空/听音/反义词） | 玩法多样性 |
| 4 | 音效分层混音系统 | 沉浸感提升 |
| 5 | BOSS 单词机制（连答3题过关） | 峰值体验 |

### P2 — 内容丰富（1个月内）
| # | 任务 | 预期效果 |
|---|------|----------|
| 1 | 程序化地形生成 | 视觉新鲜感 |
| 2 | 成就徽章系统 | 收集驱动 |
| 3 | 实时双人对战 | 社交属性 |
| 4 | 素材变体生成器 | 提质降本 |
| 5 | 每日挑战模式 | 日活留存 |

### P3 — 产品化（2月内）
| # | 任务 |
|---|------|
| 1 | PWA 离线模式 + 安装到桌面 |
| 2 | 多语言支持（繁中/日/韩） |
| 3 | 成绩报告页（知识点分析） |
| 4 | 排行榜/赛季系统 |

### P4 — 平台扩展（长期）
| # | 任务 |
|---|------|
| 1 | 微信小程序版 |
| 2 | 教师后台（题库管理+成绩导出） |
| 3 | 语音拼写模式 |
| 4 | VR 课堂版 |

---

## 九、技术架构升级方案（web-games 原则）

### 当前架构
```
Phaser 3.90 (WebGL) + Vite 5 → GitHub Pages
LocalGameEngine (单体) + 基础 Socket.io
```

### 目标架构
```
Phaser 3.90 (WebGL + WebGPU 渐进)
├── Engine Layer
│   ├── GameStateManager (状态机管理)
│   ├── WordEngine (程序化单词生成)
│   ├── ParticleSystem (粒子特效引擎)
│   ├── AudioMixer (分层混音)
│   └── TerrainGenerator (程序化地形)
│
├── Scene Layer
│   ├── BootScene (两阶段加载 + 进度条)
│   ├── MenuScene (响应式布局)
│   ├── GameScene (核心游戏)
│   └── ResultScene (结算 + 星级)
│
└── Network Layer
    ├── RoomManager (房间管理)
    ├── StateSync (状态同步)
    └── OfflineMode (离线缓存)
```

### 性能预算（60 FPS = 16.67ms）
| 系统 | 预算 | 现状 |
|------|------|------|
| Input | 1ms | ✅ |
| Physics/AI | 3ms | ✅ |
| Game Logic | 4ms | ✅ |
| Particles | 2ms | ❌ 未优化 |
| Rendering | 5ms | ⚠️ 精灵图过多 |
| Buffer | 1.67ms | ✅ |

---

## 十、素材生成规范（game-art 原则）

### 资产命名约定
```
[type]_[object]_[variant]_[state].[ext]

示例：
spr_player_01_run.png        # 精灵_玩家_变体1_跑步
ui_btn_start_hover.png       # UI_按钮_开始_悬停
vfx_particle_star_burst.png  # 特效_粒子_星星_爆发
```

### 文件夹结构（规范化）
```
assets/
├── characters/
│   ├── player/     → 角色精灵图（已在）
│   ├── enemies/    → 障碍物/敌人（待加）
│   └── npc/        → AI 选手变体（待扩展）
├── environment/
│   ├── backgrounds/ → 三层背景（已在）
│   ├── obstacles/   → 障碍物精灵
│   └── tiles/       → 赛道瓦片
├── ui/
│   ├── buttons/     → 按钮精灵
│   ├── panels/      → 面板素材
│   └── icons/       → 图标字体/精灵
├── effects/
│   ├── particles/   → 粒子纹理
│   └── vfx/         → 特效动画（已在）
└── audio/
    ├── bgm/         → 背景音乐
    ├── sfx/         → 音效
    └── voice/       → 语音
```
