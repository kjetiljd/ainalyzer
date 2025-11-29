import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { homedir } from 'os'
import { join, resolve } from 'path'
import fs from 'fs'

// Path to ~/.aina/analysis directory
const ainaAnalysisDir = join(homedir(), '.aina', 'analysis')

// Vite plugin to serve aina analysis files
function ainaAnalysisPlugin() {
  return {
    name: 'aina-analysis-server',
    configureServer(server) {
      // Serve file content with path validation
      server.middlewares.use('/api/file', (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const filePath = url.searchParams.get('path')
        const rootPath = url.searchParams.get('root')

        if (!filePath || !rootPath) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing path or root parameter' }))
          return
        }

        // Resolve to absolute paths and validate containment
        const resolvedRoot = resolve(rootPath)
        const resolvedFile = resolve(rootPath, filePath)

        if (!resolvedFile.startsWith(resolvedRoot + '/')) {
          res.statusCode = 403
          res.end(JSON.stringify({ error: 'Path outside analysis root' }))
          return
        }

        if (!fs.existsSync(resolvedFile)) {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'File not found' }))
          return
        }

        try {
          const content = fs.readFileSync(resolvedFile, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify({ content, path: filePath }))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Error reading file' }))
        }
      })

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
