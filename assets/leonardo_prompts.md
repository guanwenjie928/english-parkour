# Leonardo.ai 视觉素材生成提示词

## 工具设置
- 平台: leonardo.ai
- 模型: Leonardo Anime / Game Art
- 尺寸: 512×512（角色）/ 2048×512（背景）
- Transparency: On（角色和道具）
- Guidance Scale: 7
- Steps: 30

## 角色基础（固定Seed生成系列）

### 基础风格（先生成这张，记录Seed）
```
Cute chibi 2D game character, side view, 
big head small body proportion 1:2, 
clean vector art style, thick black outline 3px, 
flat vibrant colors, transparent background, 
game sprite sheet style, high resolution, 
no shadows, no background elements, 
cartoon network style, playful and energetic
```

### 动作变体（同Seed，改动作词）

**跑步循环帧1-4:**
```
[基础风格], running frame 1, left leg forward right leg back, 
arms pumping forward, dynamic action pose, mid-stride

[基础风格], running frame 2, both legs pushing off ground, 
arms bent high, explosive running power, dust kick behind

[基础风格], running frame 3, right leg forward left leg back, 
arms opposite swing, balanced running gait

[基础风格], running frame 4, both legs airborne, 
arms spread wide, maximum extension, jumping peak
```

**特殊动作:**
```
[基础风格], sliding pose, body low to ground horizontal, 
one leg extended front, one leg bent back, 
friction sparks on ground, speed lines

[基础风格], hit stunned pose, spiral dizzy eyes, 
shaking vibration lines around head, 
small electric sparks, confused expression, 
stars circling head

[基础风格], victory celebration pose, arms raised high, 
jumping with joy, confetti particles, 
star sparkle eyes, biggest smile

[基础风格], shield protected pose, blue energy bubble around body, 
deflecting pose, confident stance, 
glowing shield reflection
```

## 8人颜色变体

在基础风格前插入颜色：

| 玩家 | 提示词前缀 |
|------|-----------|
| P1 | `Red theme character, red hoodie and blue shorts, red baseball cap,` |
| P2 | `Blue theme character, blue hoodie and yellow shorts, blue goggles,` |
| P3 | `Green theme character, green hoodie and orange shorts, green headphones,` |
| P4 | `Yellow theme character, yellow hoodie and purple shorts, yellow scarf,` |
| P5 | `Purple theme character, purple hoodie and green shorts, purple backpack,` |
| P6 | `Orange theme character, orange hoodie and blue shorts, orange gloves,` |
| P7 | `Pink theme character, pink hoodie and cyan shorts, pink bow,` |
| P8 | `Cyan theme character, cyan hoodie and red shorts, cyan badge,` |

## 地图背景（分层生成）

### 城市屋顶 - 远景
```
2D side-scrolling game background, far parallax layer, 
neon cyberpunk city skyline at night, 
tall buildings dark silhouettes with glowing window dots, 
purple and deep blue gradient sky, 
small stars and crescent moon, 
clean vector art style, flat colors, 
no foreground elements, 
seamless horizontal tiling texture, 
2048x512 resolution, atmospheric depth
```

### 城市屋顶 - 中景
```
2D side-scrolling game background, mid parallax layer, 
cyberpunk city rooftops and building tops, 
air conditioning units, water towers, 
neon billboard shapes with abstract glow, 
medium detail level, clean vector art, 
transparent gaps showing far layer, 
seamless horizontal tiling, 
2048x512 resolution, urban texture
```

### 城市屋顶 - 近景/跑道
```
2D game platform ground, rooftop running track, 
concrete surface with subtle cracks and wear, 
neon edge lighting cyan and pink, 
clean flat top surface for character running, 
occasional ventilation grates, 
seamless horizontal tiling, 
clean vector art style, 
2048x256 resolution, game ready
```

### 魔法森林 - 远景
```
2D side-scrolling game background, enchanted magical forest, 
giant glowing mushrooms with soft light, 
floating fireflies and pollen particles, 
twisted ancient trees with subtle faces, 
deep green and mystical purple color palette, 
clean vector art style, 
seamless horizontal tiling, 
2048x512 resolution, fantasy atmosphere
```

### 太空隧道 - 远景
```
2D side-scrolling game background, deep space tunnel, 
distant galaxies and nebulae, 
floating asteroids and space debris, 
metallic tunnel walls with rivets, 
dark blue and starlight white colors, 
clean vector art style, 
seamless horizontal tiling, 
2048x512 resolution, sci-fi depth
```

### 海底遗迹 - 远景
```
2D side-scrolling game background, underwater ancient ruins, 
sunken temple columns and arches, 
coral reefs with fish silhouettes, 
bubbles rising, light rays from surface, 
teal blue and sandy gold colors, 
clean vector art style, 
seamless horizontal tiling, 
2048x512 resolution, underwater depth
```

### 火山赛道 - 远景
```
2D side-scrolling game background, active volcano interior, 
flowing lava rivers and falls, 
rocky bridges and stone platforms, 
ash particles and heat distortion, 
dark rock and bright orange lava contrast, 
clean vector art style, 
seamless horizontal tiling, 
2048x512 resolution, dangerous heat
```

## 道具图标（64×64）

### 火箭
```
2D game item icon, cute cartoon rocket booster, 
red body with yellow flame exhaust, 
small fins and round window, 
facing right direction, 
thick black outline 2px, flat vibrant colors, 
transparent background, clean vector style, 
centered composition, 64x64 game sprite
```

### 电击
```
2D game item icon, lightning bolt weapon, 
jagged yellow electric spark with blue edges, 
crackling energy effect, 
thick black outline 2px, flat vibrant colors, 
transparent background, clean vector style, 
centered composition, 64x64 game sprite
```

### 香蕉皮
```
2D game item icon, cartoon banana peel on ground, 
bright yellow with brown spots, 
curved slippery shape, 
small motion lines indicating slipperiness, 
thick black outline 2px, flat vibrant colors, 
transparent background, clean vector style, 
centered composition, 64x64 game sprite
```

### 护盾
```
2D game item icon, glowing energy shield bubble, 
translucent blue sphere with white highlights, 
sparkles and hexagonal pattern inside, 
thick black outline 2px, flat vibrant colors, 
transparent background, clean vector style, 
centered composition, 64x64 game sprite
```

### 磁铁
```
2D game item icon, horseshoe magnet, 
red and silver metallic colors, 
magnetic wave lines emanating, 
thick black outline 2px, flat vibrant colors, 
transparent background, clean vector style, 
centered composition, 64x64 game sprite
```

## 特效动画（精灵图）

### 电击命中
```
2D game VFX sprite sheet, electric shock impact, 
5 frames animation, yellow and blue lightning branches, 
sparks and particles exploding outward, 
cartoon exaggerated style, thick outlines, 
flat vibrant colors, transparent background, 
256x256 resolution, game ready
```

### 加速拖尾
```
2D game VFX, speed motion lines and wind streaks, 
white and yellow horizontal streaks, 
fast wind whoosh effect, 
cartoon dynamic style, transparent background, 
horizontal direction composition, 
512x128 resolution, seamless loop ready
```

### 滑倒灰尘
```
2D game VFX, dust cloud impact, 
brown and gray swirling particles, 
cartoon comedic fall effect, 
spiral motion lines, transparent background, 
256x256 resolution, single burst
```

### 护盾激活
```
2D game VFX, magical bubble shield activate, 
blue energy ring expanding outward, 
soft glow and sparkles, 
protective force field formation, 
transparent background, 256x256 resolution, 
5 frames expanding animation
```

## UI元素

### 主按钮
```
2D game UI button, rounded rectangle shape, 
gradient blue to cyan glossy surface, 
white highlight reflection on top, 
thick dark blue border 3px, 
subtle inner shadow, cartoon game style, 
clean vector art, transparent background, 
9-slice ready corners, 256x64 resolution
```

### 面板背景
```
2D game UI panel, rounded rectangle frame, 
dark navy blue with subtle grid pattern texture, 
inner glow light blue, thick light border 3px, 
slight drop shadow, cartoon game style, 
clean vector art, transparent center area, 
9-slice ready, 512x512 resolution
```

### 进度条
```
2D game UI progress bar, long horizontal rectangle, 
green fill with yellow gradient highlight top, 
dark gray background track, 
rounded caps on both ends, 
glossy surface with highlight, 
cartoon game style, clean vector art, 
transparent background, 512x32 resolution
```

### 倒计时数字
```
2D game UI number "3", bold cartoon display font, 
bright red fill with thick yellow outline 4px, 
subtle drop shadow, sporty energetic style, 
transparent background, 128x128 resolution

2D game UI text "GO", bold cartoon display font, 
bright green fill with white outline 4px, 
explosion burst effect behind letters, 
victory announcement style, 
transparent background, 256x128 resolution
```

## 障碍物

### 城市屋顶障碍
```
2D game obstacle, rooftop air vent with steam, 
metal box shape with grill lines, 
white steam puffs coming out top, 
cartoon style, thick black outline, 
flat colors, transparent background, 
128x128 resolution

2D game obstacle, construction barrier block, 
orange and white diagonal stripes, 
concrete base, warning light on top, 
cartoon style, thick black outline, 
flat colors, transparent background, 
128x64 resolution
```

## 生成后处理

1. **角色序列帧**: 用Photoshop/GIMP裁剪为128×128，命名 `run_01.png` ~ `run_08.png`
2. **背景分层**: 远/中/近三层分别导出，代码实现视差滚动速度 0.3/0.6/1.0
3. **透明素材**: 确保PNG有alpha通道，无白边
4. **9-slice UI**: 导出时保留四角，Phaser设置 `setTexture('button', {left:20, right:20, top:20, bottom:20})`
