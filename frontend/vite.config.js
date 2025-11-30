import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { homedir } from 'os'
import { join, resolve } from 'path'
import fs from 'fs'

// Path to ~/.aina/analysis directory
const ainaAnalysisDir = join(homedir(), '.aina', 'analysis')

// Vite plugin to serve aina analysis files (dev server)
//
// NOTE: API endpoint logic is duplicated in aina_lib.py (production server)
// and here (dev server). Changes to /api/analyses, /api/file, or
// /api/clocignore must be synced in both places.
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

      // Serve merged .clocignore from analysis root_path and all repos
      server.middlewares.use('/api/clocignore', (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const analysisName = url.searchParams.get('analysis')

        if (!analysisName) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing analysis parameter' }))
          return
        }

        // Load analysis JSON to get root_path
        const analysisPath = join(ainaAnalysisDir, `${analysisName}.json`)
        if (!fs.existsSync(analysisPath)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Analysis not found', content: '' }))
          return
        }

        try {
          const analysisJson = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'))
          const rootPath = analysisJson.root_path

          // Collect patterns from all .clocignore files
          const allPatterns = []

          // Helper to read and add patterns from a .clocignore file
          function addPatternsFrom(filePath, prefix = '') {
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath, 'utf-8')
              content.split('\n').forEach(line => {
                line = line.trim()
                if (line && !line.startsWith('#')) {
                  // Prefix repo-specific patterns with repo name
                  if (prefix) {
                    allPatterns.push(`${prefix}/${line}`)
                  } else {
                    allPatterns.push(line)
                  }
                }
              })
            }
          }

          // Read root .clocignore (applies to all)
          addPatternsFrom(join(rootPath, '.clocignore'))

          // Read .clocignore from each immediate subdirectory (repos)
          // These patterns are prefixed with repo name
          const entries = fs.readdirSync(rootPath, { withFileTypes: true })
          for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
              const repoPath = join(rootPath, entry.name)
              addPatternsFrom(join(repoPath, '.clocignore'), entry.name)
            }
          }

          const content = allPatterns.join('\n')
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify({ content }))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Error reading clocignore' }))
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
