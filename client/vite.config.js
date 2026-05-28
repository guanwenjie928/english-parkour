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
