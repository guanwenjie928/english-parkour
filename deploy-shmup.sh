#!/usr/bin/env bash
# ============================================================
#  英语跑酷 Shmup — 全自动部署脚本
#  直接拷贝到 /root/english-parkour/ 后执行即可
#  bash /root/english-parkour/deploy-shmup.sh
# ============================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

PROJECT_DIR="/root/english-parkour"
WWW_DIR="/var/www/english-parkour"
NGINX_CONF="/etc/nginx/sites-enabled/classroom-eval"

echo "=========================================="
echo "  英语跑酷 Shmup 多人模式 全自动部署"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# ---- 0. 拉取最新代码 ----
log "拉取最新代码..."
cd "$PROJECT_DIR"
git pull origin main 2>/dev/null || warn "git pull 失败（网络问题），使用现有代码继续"

# ================================================================
#  补丁 1/3: vite.config.js — 支持 VITE_BASE / VITE_OUTDIR 环境变量
# ================================================================
log "应用补丁: vite.config.js ..."
cat > "$PROJECT_DIR/client/vite.config.js" << 'VEOF'
import { defineConfig } from 'vite';

export default defineConfig({
  // base 优先级: GITHUB_PAGES=1 → './'  |  VITE_BASE=/parkour/ → '/parkour/'  |  默认 → '/english-parkour/'
  base: process.env.GITHUB_PAGES ? './' : (process.env.VITE_BASE || '/english-parkour/'),
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': {
        target: 'ws://localhost:3000',
        ws: true
      }
    }
  },
  build: {
    outDir: process.env.VITE_OUTDIR || '../docs',
    assetsDir: 'assets',
    emptyOutDir: false,
  }
});
VEOF

# ================================================================
#  补丁 2/3: NetworkShmupEngine.js — 添加 socket.io import
# ================================================================
log "应用补丁: NetworkShmupEngine.js ..."
NETWORK_FILE="$PROJECT_DIR/client/src/engine/NetworkShmupEngine.js"
# 检查第一行是否已有 import
if head -1 "$NETWORK_FILE" | grep -q "import.*socket.io-client"; then
  log "NetworkShmupEngine.js 已包含 import，跳过"
else
  # 在第一行注释后插入 import
  sed -i '4a import { io } from '"'"'socket.io-client'"'"';' "$NETWORK_FILE"
  log "已添加 import { io } from 'socket.io-client'"
fi

# ================================================================
#  补丁 3/3: main.js — 修复 isLocalMode 检测（CDN 竞态 bug）
# ================================================================
log "应用补丁: main.js ..."
MAIN_FILE="$PROJECT_DIR/client/src/main.js"
# 检查是否已经修复
if grep -q "location.hostname === 'localhost'" "$MAIN_FILE"; then
  log "main.js 已修复，跳过"
else
  OLD_PATTERN="const isLocalMode = typeof io === 'undefined' || urlParams.get('local') === '1';"
  NEW_PATTERN="const isLocalMode = urlParams.get('local') === '1'
  || location.hostname === 'localhost'
  || location.hostname.includes('github.io');"
  # 用 perl 做多行替换（sed 对多行不友好）
  perl -i -pe "s/const isLocalMode = typeof io === 'undefined' \|\| urlParams\.get\('local'\) === '1';/const isLocalMode = urlParams.get('local') === '1'\n  || location.hostname === 'localhost'\n  || location.hostname.includes('github.io');/" "$MAIN_FILE"
  log "已修复 isLocalMode 检测逻辑"
fi

# ---- 构建前端 ----
log "构建前端 (base=/parkour/, outDir=dist)..."
cd "$PROJECT_DIR/client"
npm install 2>&1 | tail -3
rm -rf dist/
VITE_BASE=/parkour/ VITE_OUTDIR=dist npm run build 2>&1 | tail -8

if [ ! -f "dist/index.html" ]; then
  err "构建失败：dist/index.html 不存在"
fi
log "构建成功"

# ---- 部署静态文件 ----
log "部署静态文件到 $WWW_DIR ..."
mkdir -p "$WWW_DIR"
rm -rf "$WWW_DIR/assets" "$WWW_DIR/index.html" 2>/dev/null || true
cp -r dist/* "$WWW_DIR/"
log "静态文件已部署"

# ---- Nginx /shmup/socket.io/ 代理 ----
log "检查 Nginx 配置..."
if [ -f "$NGINX_CONF" ]; then
  if ! grep -q "/shmup/socket.io/" "$NGINX_CONF"; then
    log "添加 /shmup/socket.io/ 代理规则..."
    cp "$NGINX_CONF" "${NGINX_CONF}.bak-$(date +%Y%m%d%H%M%S)"

    SHMUP_BLOCK='
# 英语跑酷 Shmup 多人模式 WebSocket
location /shmup/socket.io/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
'
    awk -v block="$SHMUP_BLOCK" '
      /^location \/socket\.io\/ \{/ { print block; }
      { print; }
    ' "$NGINX_CONF" > "${NGINX_CONF}.tmp" && mv "${NGINX_CONF}.tmp" "$NGINX_CONF"

    nginx -t 2>&1 || err "Nginx 配置语法错误，已备份"
    nginx -s reload
    log "Nginx 已重载"
  else
    log "Nginx 已有 /shmup/socket.io/ 规则"
  fi
fi

# ---- 服务端依赖 + 重启 ----
log "安装服务端依赖..."
cd "$PROJECT_DIR/server"
npm install 2>&1 | tail -3

log "重启 PM2..."
if pm2 list 2>/dev/null | grep -q "english-parkour"; then
  pm2 restart english-parkour
else
  pm2 start index.js --name english-parkour
fi
pm2 save

# ---- 健康检查 ----
sleep 3
log "健康检查..."
HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null || echo '{"status":"unreachable"}')
echo "  $HEALTH"

if echo "$HEALTH" | grep -q '"ok"'; then
  log "服务启动成功！"
else
  warn "查看日志: pm2 logs english-parkour --lines 15 --nostream"
  pm2 logs english-parkour --lines 15 --nostream 2>&1 || true
fi

# ---- 验证 ----
echo ""
echo "=========================================="
echo "  部署完成！验证清单："
echo "=========================================="
echo "  游戏入口:  http://124.220.226.95/parkour/"
echo "  健康检查:  http://124.220.226.95/api/health"
echo ""
echo "  如果页面空白，F12 检查："
echo "  1. Console 是否有 JS 错误"
echo "  2. Network → socket.io 是否 101 握手"
echo "  3. pm2 logs english-parkour"
echo ""
echo "  多人模式测试："
echo "  1. 打开 http://124.220.226.95/parkour/"
echo "  2. 菜单页进入多人模式"
echo "  3. 创建房间 → 分享码 → 同学加入"
echo "=========================================="
