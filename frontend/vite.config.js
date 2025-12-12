import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Dev server proxies /api/* requests to Python backend (aina show --port 8081)
// This eliminates API code duplication between dev and production.
// To develop: run `aina show --port 8081 --no-browser` in one terminal,
// then `npm run dev` in another.

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom'
  }
})
