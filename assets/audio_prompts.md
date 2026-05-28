# 音效AI生成提示词

## 工具设置
- 首选: ElevenLabs Sound Effects (elevenlabs.io)
- 备选: Meta Audiobox (免费)
- 格式: MP3 128kbps
- 音量标准化: -3dB

## 核心交互音效

### 答题正确
```
Bright cheerful ding sound, retro 8-bit game style, 
ascending major third chord C-E-G, 
clean and crisp with no reverb, 
cartoon energy and positive feedback, 
short punchy 0.8 seconds, 
instant satisfaction feel
```

### 答题错误
```
Low buzzer fail sound, retro game style, 
descending slide tone from C to G, 
short and punchy 0.6 seconds, 
cartoon disappointment without harshness, 
no echo, quick recovery feel
```

### 答题超时
```
Soft whoosh timeout sound, air escaping from balloon, 
gentle fade out, cartoon style, 
game UI feedback notification, 
0.7 seconds, neutral non-judgmental
```

### 获得道具
```
Magical item pickup chime, sparkly twinkle sound, 
retro RPG treasure chest opening, 
bright and exciting 1.0 second, 
ascending bell tones with shimmer, 
reward anticipation feel
```

## 道具音效

### 火箭释放
```
Cartoon rocket launch whoosh, 
ascending engine roar building up, 
8-bit style with modern punch, 
doppler effect pitch rise, 
fast acceleration energy, 
2.5 seconds, powerful thrust
```

### 电击释放
```
Electric zap sound, cartoon lightning strike, 
crackling sparks with voltage buzz, 
comical exaggerated thunder, 
sharp attack quick decay, 
1.2 seconds, shocking impact
```

### 电击命中（被击者）
```
Electric shock stun loop, 
cartoon character vibrating sound, 
zappy buzz with starry dizzy effect, 
rhythmic pulse 2.0 seconds, 
comical paralysis, funny not scary
```

### 香蕉皮释放
```
Slippery cartoon slide sound, 
banana peel comedic slip, 
squeaky cartoon tire skid with slide whistle, 
funny crash thud at end, 
1.5 seconds, slapstick humor
```

### 香蕉皮减速（被命中）
```
Slow motion time warp sound, 
pitch drop with tape slowdown effect, 
cartoon mud suction gurgle, 
sluggish movement feel, 
1.0 second, trapped sensation
```

### 护盾激活
```
Magical bubble shield activate, 
transparent energy hum building up, 
protective force field formation, 
soft glowing sound with shimmer, 
0.8 seconds, safety feel
```

### 护盾抵挡
```
Shield deflect ping sound, 
metallic bounce with energy dissipate, 
short and satisfying 0.5 seconds, 
successful block feedback, 
clean and crisp
```

### 从控制恢复
```
Quick recovery snap sound, 
cartoon character shake off dust, 
bright ping of energy return, 
spring bounce boing, 
0.6 seconds, relief and renewal
```

## 倒计时与节奏

### 倒计时3
```
Deep drum countdown beat, 
heavy tom drum hit, 
game show tense anticipation, 
0.4 seconds, low and heavy
```

### 倒计时2
```
Medium drum countdown beat, 
slightly higher pitch tom, 
building tension second strike, 
0.4 seconds, rising intensity
```

### 倒计时1
```
High drum countdown beat, 
peak tension sharp strike, 
crisp and urgent, 
0.4 seconds, maximum anticipation
```

### GO开始
```
Explosive game start sound, 
retro arcade "GO" voice burst, 
bright major chord with whoosh, 
celebratory and exciting, 
0.8 seconds, launch energy
```

### 最后10秒心跳
```
Racing heartbeat loop, 
accelerating tempo from 60bpm to 120bpm, 
drum and bass tension building, 
game final countdown urgency, 
10 seconds seamless loop, 
stress and excitement
```

## 结算音效

### 胜利号角
```
Short victory fanfare, 
brass trumpet celebration, 
retro game level complete, 
bright and triumphant 3.0 seconds, 
major key ascending, 
satisfaction and achievement
```

### 第一名专属
```
Golden crown fanfare, 
sparkling chimes with brass, 
champion announcement feel, 
extra bright and special, 
1.5 seconds, top honor
```

## UI音效

### 按钮点击
```
Soft UI button click, 
clean pop with subtle pitch, 
minimal game interface feedback, 
satisfying tactile feel, 
0.2 seconds, responsive
```

### 返回/取消
```
Gentle UI whoosh back, 
soft decline without harshness, 
negative feedback gentle, 
0.2 seconds, smooth
```

## 背景音乐（AI生成或素材库）

### 菜单音乐
```
Upbeat chiptune menu music, 
retro game console style, 
loopable 60 seconds, 
bright and inviting, 
8-bit square waves with soft bass, 
no jarring transitions, 
medium energy level
```

### 城市屋顶BGM
```
Cyberpunk city night ambient, 
synthwave electronic loop, 
neon atmosphere, 
60 seconds seamless loop, 
driving beat with atmospheric pads, 
moderate tempo 120bpm
```

## 生成后处理

1. **裁剪**: 用Audacity精确裁剪到指定时长
2. **标准化**: 效果→标准化，峰值-3dB
3. **格式**: 导出MP3 128kbps 或 OGG（Phaser优先OGG）
4. **命名**: `sfx_correct.mp3`, `sfx_rocket.mp3` 等
5. **音量层级**: 按文档05设置相对音量
