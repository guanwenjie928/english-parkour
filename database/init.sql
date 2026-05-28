-- 英语跑酷课堂游戏 - 数据库初始化
-- 运行: mysql -u root -p < init.sql

CREATE DATABASE IF NOT EXISTS english_parkour DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE english_parkour;

-- 单词库
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

-- 地图配置
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

-- 游戏房间
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

-- 房间玩家
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

-- 答题记录
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

-- 道具使用记录
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

-- 单词使用记录（每局用了哪些词）
CREATE TABLE game_words (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(36),
    word_id INT,
    sequence_number INT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (word_id) REFERENCES words(id)
) ENGINE=InnoDB;

-- 导出视图
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

-- 示例单词数据（三年级）
INSERT INTO words (word, meaning, difficulty, challenge_type, blank_pattern, blank_count, category) VALUES
('apple', '苹果', 1, 'cn_to_en', NULL, 0, '三年级'),
('banana', '香蕉', 1, 'cn_to_en', NULL, 0, '三年级'),
('cat', '猫', 1, 'cn_to_en', NULL, 0, '三年级'),
('dog', '狗', 1, 'cn_to_en', NULL, 0, '三年级'),
('beautiful', '美丽的', 3, 'fill_blank', 'b_a_t_f_l', 4, '三年级'),
('elephant', '大象', 2, 'fill_blank', 'e_e_h_n', 3, '三年级'),
('friend', '朋友', 2, 'fill_blank', 'f_i_n', 2, '三年级'),
('school', '学校', 2, 'cn_to_en', NULL, 0, '三年级'),
('teacher', '老师', 2, 'fill_blank', 't_a_h_r', 2, '三年级'),
('student', '学生', 3, 'fill_blank', 's_u_e_t', 3, '三年级');

-- 四年级单词
INSERT INTO words (word, meaning, difficulty, challenge_type, blank_pattern, blank_count, category) VALUES
('computer', '电脑', 3, 'fill_blank', 'c_m_u_e_', 3, '四年级'),
('bicycle', '自行车', 3, 'fill_blank', 'b_c_c_e', 3, '四年级'),
('library', '图书馆', 3, 'fill_blank', 'l_b_a_y', 3, '四年级'),
('medicine', '药', 3, 'fill_blank', 'm_d_c_n_', 4, '四年级'),
('tomorrow', '明天', 3, 'fill_blank', 't_m_r_o_', 3, '四年级'),
('yesterday', '昨天', 3, 'fill_blank', 'y_s_e_d_y', 4, '四年级'),
('morning', '早上', 2, 'fill_blank', 'm_r_i_g', 2, '四年级'),
('evening', '晚上', 2, 'fill_blank', 'e_e_i_g', 2, '四年级'),
('country', '国家', 3, 'fill_blank', 'c_u_t_y', 3, '四年级'),
('language', '语言', 3, 'fill_blank', 'l_n_u_g_', 4, '四年级');

-- 五年级单词
INSERT INTO words (word, meaning, difficulty, challenge_type, blank_pattern, blank_count, category) VALUES
('knowledge', '知识', 4, 'fill_blank', 'k_o_l_d_e', 4, '五年级'),
('exercise', '锻炼', 3, 'fill_blank', 'e_e_c_i_e', 4, '五年级'),
('mountain', '山', 3, 'fill_blank', 'm_u_t_i_', 4, '五年级'),
('weather', '天气', 3, 'fill_blank', 'w_a_h_r', 2, '五年级'),
('between', '在...之间', 3, 'fill_blank', 'b_t_e_n', 3, '五年级'),
('believe', '相信', 3, 'fill_blank', 'b_l_e_e', 3, '五年级'),
('against', '反对', 3, 'fill_blank', 'a_a_n_t', 3, '五年级'),
('general', '一般的', 4, 'fill_blank', 'g_n_r_l', 4, '五年级'),
('foreign', '外国的', 3, 'fill_blank', 'f_r_e_g', 3, '五年级'),
('journey', '旅行', 3, 'fill_blank', 'j_u_n_y', 3, '五年级');

-- 六年级单词
INSERT INTO words (word, meaning, difficulty, challenge_type, blank_pattern, blank_count, category) VALUES
('discovery', '发现', 4, 'fill_blank', 'd_s_o_e_y', 4, '六年级'),
('education', '教育', 4, 'fill_blank', 'e_u_a_i_n', 5, '六年级'),
('scientist', '科学家', 4, 'fill_blank', 's_i_n_i_t', 4, '六年级'),
('especially', '尤其', 4, 'fill_blank', 'e_p_c_a_y', 5, '六年级'),
('necessary', '必要的', 4, 'fill_blank', 'n_c_s_a_y', 5, '六年级'),
('different', '不同的', 4, 'fill_blank', 'd_f_e_e_t', 4, '六年级'),
('important', '重要的', 4, 'fill_blank', 'i_p_r_a_t', 4, '六年级'),
('wonderful', '精彩的', 4, 'fill_blank', 'w_n_e_f_l', 5, '六年级'),
('following', '下列的', 4, 'fill_blank', 'f_l_o_i_g', 4, '六年级'),
('situation', '情况', 4, 'fill_blank', 's_t_a_i_n', 5, '六年级');
