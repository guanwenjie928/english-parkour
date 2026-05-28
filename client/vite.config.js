import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 使用相对路径，服务器部署用 /english-parkour/
  base: process.env.GITHUB_PAGES ? './' : '/english-parkour/',
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
    outDir: '../docs',
    assetsDir: 'assets',
    emptyOutDir: false,  // 防止误删 docs/ 下的文档文件
  }
});
