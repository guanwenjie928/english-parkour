# 数据库设计

## 表结构

### words — 单词库
```sql
CREATE TABLE words (
    id INT PRIMARY KEY AUTO_INCREMENT,
    word VARCHAR(50) NOT NULL,
    meaning VARCHAR(200),
    difficulty TINYINT DEFAULT 1 COMMENT '1-5难度',
    challenge_type ENUM('fill_blank','cn_to_en') DEFAULT 'fill_blank',
    blank_pattern VARCHAR(50) COMMENT '如 b_a_t_f_l',
    blank_count TINYINT DEFAULT 1,
    hint VARCHAR(100),
    category VARCHAR(50) COMMENT '年级/主题',
    length TINYINT GENERATED ALWAYS AS (CHAR_LENGTH(word)) STORED,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_difficulty (difficulty),
    INDEX idx_category (category),
    INDEX idx_length (length),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;
```

### maps — 地图配置
```sql
CREATE TABLE maps (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    theme VARCHAR(50),
    bgm VARCHAR(100),
    difficulty TINYINT DEFAULT 1,
    special_mechanic JSON,
    unlock_condition VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO maps (id, name, theme, difficulty, special_mechanic, unlock_condition) VALUES
('city', '城市屋顶', 'cyberpunk', 1, NULL, NULL),
('forest', '魔法森林', 'fantasy', 2, '{"vine_block":1}', '通关城市5次'),
('space', '太空隧道', 'scifi', 3, '{"zero_g":0.8}', '通关森林5次'),
('ocean', '海底遗迹', 'underwater', 2, '{"bubble_distraction":1}', '通关城市3次'),
('volcano', '火山赛道', 'lava', 3, '{"wrong_penalty_double":1}', '通关太空3次');
```

### rooms — 游戏房间
```sql
CREATE TABLE rooms (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(6) UNIQUE NOT NULL,
    status ENUM('waiting','playing','ended','closed') DEFAULT 'waiting',
    map_id VARCHAR(20),
    word_config JSON,
    max_players TINYINT DEFAULT 8,
    duration INT DEFAULT 90,
    created_by VARCHAR(50),
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES maps(id)
) ENGINE=InnoDB;
```

### room_players — 房间玩家
```sql
CREATE TABLE room_players (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(36),
    player_name VARCHAR(50),
    track_number TINYINT,
    color_theme VARCHAR(20),
    final_rank TINYINT,
    final_progress DECIMAL(5,2),
    correct_count INT DEFAULT 0,
    wrong_count INT DEFAULT 0,
    item_used_count INT DEFAULT 0,
    is_online BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_room (room_id)
) ENGINE=InnoDB;
```

### game_answers — 答题记录
```sql
CREATE TABLE game_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(36),
    player_id INT,
    word_id INT,
    challenge_type ENUM('fill_blank','cn_to_en'),
    player_answer VARCHAR(50),
    is_correct BOOLEAN,
    answer_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (word_id) REFERENCES words(id),
    FOREIGN KEY (player_id) REFERENCES room_players(id),
    INDEX idx_room_player (room_id, player_id)
) ENGINE=InnoDB;
```

### game_items — 道具使用记录
```sql
CREATE TABLE game_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(36),
    from_player INT,
    to_player INT,
    item_type ENUM('rocket','electric','banana','shield','magnet'),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (from_player) REFERENCES room_players(id),
    FOREIGN KEY (to_player) REFERENCES room_players(id)
) ENGINE=InnoDB;
```

### game_words — 单词使用记录
```sql
CREATE TABLE game_words (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(36),
    word_id INT,
    sequence_number INT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (word_id) REFERENCES words(id)
) ENGINE=InnoDB;
```

## 导出视图（Excel用）

```sql
CREATE VIEW v_room_report AS
SELECT 
    r.id AS room_id,
    r.code,
    r.created_at,
    rp.player_name,
    rp.track_number,
    rp.final_rank,
    rp.final_progress,
    COUNT(DISTINCT ga.id) AS total_answers,
    SUM(CASE WHEN ga.is_correct THEN 1 ELSE 0 END) AS correct_count,
    SUM(CASE WHEN ga.is_correct THEN 0 ELSE 1 END) AS wrong_count,
    AVG(ga.answer_time_ms) AS avg_time_ms,
    MAX(ga.answer_time_ms) AS slowest_time_ms,
    MIN(ga.answer_time_ms) AS fastest_time_ms,
    rp.item_used_count
FROM rooms r
LEFT JOIN room_players rp ON r.id = rp.room_id
LEFT JOIN game_answers ga ON r.id = ga.room_id AND rp.id = ga.player_id
WHERE r.status = 'ended'
GROUP BY r.id, rp.id;
```
