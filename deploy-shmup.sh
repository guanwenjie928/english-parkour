#!/usr/bin/env bash
# ============================================================
#  英语跑酷 Shmup 多人模式 — 一键部署脚本
#  在服务器上执行: bash /root/english-parkour/deploy-shmup.sh
# ============================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

PROJECT_DIR="/root/english-parkour"
WWW_DIR="/var/www/english-parkour"
NGINX_CONF="/etc/nginx/sites-enabled/classroom-eval"

echo "=========================================="
echo "  英语跑酷 Shmup 多人模式部署"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# ---- 1. 拉取最新代码 ----
log "拉取最新代码..."
cd "$PROJECT_DIR"

# 保存服务器特有的 vite.config.js 改动（base=/parkour/）
if git diff --quiet client/vite.config.js 2>/dev/null; then
  : # 无改动，无需 stash
else
  warn "检测到 vite.config.js 本地修改，已 stash"
  git stash push -m "deploy: auto-stash before pull" client/vite.config.js 2>/dev/null || true
fi

git pull origin main || err "git pull 失败，请手动处理冲突"

# ---- 2. 构建前端 ----
log "构建前端（base=/parkour/, outDir=dist）..."
cd "$PROJECT_DIR/client"
npm install 2>&1 | tail -3

# 清理旧构建
rm -rf dist/

# VITE_BASE=/parkour/  VITE_OUTDIR=dist → 构建到 client/dist/
VITE_BASE=/parkour/ VITE_OUTDIR=dist npm run build 2>&1 | tail -8

# 检查构建产物
if [ ! -f "dist/index.html" ]; then
  err "构建失败：dist/index.html 不存在"
fi
log "构建成功 $(du -sh dist/index.html | cut -f1)"

# ---- 3. 部署静态文件到 Nginx ----
log "部署静态文件到 $WWW_DIR ..."
mkdir -p "$WWW_DIR"
rm -rf "$WWW_DIR/assets" "$WWW_DIR/index.html" 2>/dev/null || true
cp -r dist/* "$WWW_DIR/"
log "静态文件已部署 ($(ls "$WWW_DIR" | wc -l) 个文件)"

# ---- 4. 确保 socket.io 的 js 可加载 ----
# 客户端 index.html 中已有条件加载逻辑：非本地模式自动加载 /socket.io/socket.io.js
# Nginx /socket.io/ → proxy 到 3000 端口，由 Socket.io 服务端内置提供

# ---- 5. Nginx: 添加 /shmup/socket.io/ 代理规则 ----
log "检查 Nginx 配置..."
if [ -f "$NGINX_CONF" ]; then
  if ! grep -q "/shmup/socket.io/" "$NGINX_CONF"; then
    log "添加 /shmup/socket.io/ 代理规则..."

    # 备份原配置
    cp "$NGINX_CONF" "${NGINX_CONF}.bak-$(date +%Y%m%d%H%M%S)"

    # 在 "location /socket.io/" 行之前插入
    sed -i '/^location \/socket\.io\/ {/i\
# 英语跑酷 Shmup 多人模式 WebSocket 代理\
location /shmup/socket.io/ {\
    proxy_pass http://127.0.0.1:3000;\
    proxy_http_version 1.1;\
    proxy_set_header Upgrade $http_upgrade;\
    proxy_set_header Connection "upgrade";\
    proxy_set_header Host $host;\
    proxy_set_header X-Real-IP $remote_addr;\
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
}\
' "$NGINX_CONF"

    nginx -t 2>&1 || err "Nginx 配置语法错误，已自动备份: ${NGINX_CONF}.bak-*"
    nginx -s reload
    log "Nginx 已更新并重载"
  else
    log "Nginx 已包含 /shmup/socket.io/ 规则，跳过"
  fi
else
  warn "未找到 Nginx 配置 $NGINX_CONF"
  warn "请手动添加: location /shmup/socket.io/ { proxy_pass http://127.0.0.1:3000; ... }"
fi

# ---- 6. 服务端依赖 ----
log "安装服务端依赖..."
cd "$PROJECT_DIR/server"
npm install 2>&1 | tail -3

# ---- 7. 重启 PM2 ----
log "重启 PM2..."
if pm2 list 2>/dev/null | grep -q "english-parkour"; then
  pm2 restart english-parkour
else
  pm2 start index.js --name english-parkour
fi
pm2 save

# ---- 8. 健康检查 ----
sleep 3
log "健康检查..."
HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null || echo '{"status":"unreachable"}')
echo "  $HEALTH"

if echo "$HEALTH" | grep -q '"ok"'; then
  log "服务启动成功！"
else
  warn "服务可能未正常启动，查看最近日志:"
  pm2 logs english-parkour --lines 15 --nostream 2>&1 || true
fi

# ---- 9. 验证 Shmup 房间创建 ----
log "测试 /shmup 命名空间连接..."
curl -s "http://localhost:3000/socket.io/?EIO=4&transport=polling" 2>/dev/null | head -c 100 && echo ""
curl -s "http://localhost:3000/shmup/socket.io/?EIO=4&transport=polling" 2>/dev/null | head -c 100 && echo ""

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo "  游戏入口:  http://124.220.226.95/parkour/"
echo "  健康检查:  http://124.220.226.95/api/health"
echo "  PM2 日志:  pm2 logs english-parkour"
echo ""
echo "  多人模式测试:"
echo "    1. 打开 http://124.220.226.95/parkour/"
echo "    2. 菜单页选择 MULTIPLAYER"
echo "    3. 创建房间 → 分享房间码 → 同学加入"
echo "=========================================="
