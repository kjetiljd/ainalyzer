import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { homedir } from 'os'
import { join } from 'path'
import fs from 'fs'

// Path to ~/.aina/analysis directory
const ainaAnalysisDir = join(homedir(), '.aina', 'analysis')

// Vite plugin to serve aina analysis files
function ainaAnalysisPlugin() {
  return {
    name: 'aina-analysis-server',
    configureServer(server) {
      server.middlewares.use('/api/analyses', (req, res, next) => {
        // Remove /api/analyses prefix and query params
        const path = req.url.split('?')[0].replace(/^\//, '')
        const filePath = join(ainaAnalysisDir, path || 'index.json')

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404
          res.end('Not found')
          return
        }

        // Read and serve the file
        try {
          const content = fs.readFileSync(filePath, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(content)
        } catch (err) {
          res.statusCode = 500
          res.end('Error reading file')
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    ainaAnalysisPlugin()
  ],
  test: {
    globals: true,
    environment: 'happy-dom'
  }
})
