# 英语跑酷课堂游戏 (English Parkour Classroom)

## 项目概述
面向课堂的2D横版跑酷+英语拼写实时PVP游戏。
- 学生端：平板操作角色跑酷 + 虚拟键盘拼写
- 老师端：大屏投影观赛 + 实时数据 + Excel导出

## 技术栈
- 客户端：Phaser 3 (WebGL) + HTML5 Canvas
- 服务端：Node.js + Socket.io + Express
- 数据库：MySQL 8.0
- 部署：腾讯云轻量服务器 + Nginx

## 目录结构
```
├── docs/           # 设计文档
├── assets/         # 素材清单与生成提示词
├── database/       # MySQL 迁移文件
├── server/         # Node.js 游戏服务器
├── client/         # Phaser.js 游戏客户端
└── assets-generated/ # Leonardo.ai 生成后存放
```

## 快速启动

### 1. 数据库
```bash
mysql -u root -p < database/init.sql
```

### 2. 服务端
```bash
cd server
npm install
npm run dev
```

### 3. 客户端（开发模式）
```bash
cd client
npm install
npm run dev
```

## 核心功能清单
- [x] 房间制（6位数字码）
- [x] 8跑道同图竞技
- [x] 单词挑战（补全 + 中译英）
- [x] 道具系统（火箭/电击/香蕉皮/护盾/磁铁）
- [x] 实时PVP同步
- [x] 大屏观赛面板
- [x] Excel答题报表导出
- [x] 多地图随机（城市/森林/太空/海底/火山）

## 单局规则
- 时长：90秒固定
- 人数：2-8人（推荐8人）
- 胜利条件：到达终点或时间到时距离最远
- 道具获取：连续正确答题3题
- 惩罚：答错减速50% 3秒，被控需拼写恢复

## 课堂场景
- 学生平板输入姓名+房间码加入
- 老师大屏显示实时排名和跑道进度
- 支持断线重连（30秒内）
- 单局结束可导出Excel报表

## 素材生成
- 见 `assets/leonardo_prompts.md` — 完整Leonardo.ai提示词库
- 见 `assets/audio_prompts.md` — 完整音效AI生成提示词

## 开发阶段
### MVP（4周）
- P0: 房间系统 + 8跑道跑酷 + 单词挑战 + 加速/减速 + 大屏排名
- P1: 道具系统 + 90秒倒计时 + Excel导出

### 二期
- 多地图随机 + 追赶机制 + 道具皮肤 + 学期排行榜
