<template>
  <div class="file-viewer-overlay" @click.self="$emit('close')">
    <div class="file-viewer">
      <div class="file-viewer-header">
        <span class="file-path">{{ displayPath || path }}</span>
        <button class="close-button" @click="$emit('close')">&times;</button>
      </div>
      <div class="file-viewer-content">
        <pre v-if="loading" class="loading">Loading...</pre>
        <pre v-else-if="error" class="error">{{ error }}</pre>
        <pre v-else><code ref="codeBlock" :class="languageClass">{{ content }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script>
import hljs from 'highlight.js'
import 'highlight.js/styles/vs2015.css'

// Map file extensions to highlight.js language names
const EXTENSION_MAP = {
  '.js': 'javascript',
  '.ts': 'typescript',
  '.vue': 'xml',
  '.py': 'python',
  '.java': 'java',
  '.kt': 'kotlin',
  '.md': 'markdown',
  '.json': 'json',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sql': 'sql',
  '.sh': 'bash',
  '.bash': 'bash',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.xml': 'xml',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.r': 'r',
  '.R': 'r',
  '.scala': 'scala',
  '.groovy': 'groovy',
  '.gradle': 'groovy'
}

export default {
  name: 'FileViewer',
  props: {
    path: {
      type: String,
      required: true
    },
    rootPath: {
      type: String,
      required: true
    },
    displayPath: {
      type: String,
      default: ''
    }
  },
  emits: ['close'],
  data() {
    return {
      content: '',
      loading: true,
      error: null
    }
  },
  computed: {
    languageClass() {
      const ext = this.path.substring(this.path.lastIndexOf('.'))
      const lang = EXTENSION_MAP[ext.toLowerCase()]
      return lang ? `language-${lang}` : ''
    }
  },
  async mounted() {
    window.addEventListener('keydown', this.handleKeydown)
    await this.loadFile()
    this.$nextTick(() => {
      if (this.$refs.codeBlock && this.content) {
        hljs.highlightElement(this.$refs.codeBlock)
      }
    })
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeydown)
  },
  methods: {
    handleKeydown(e) {
      if (e.key === 'Escape') {
        this.$emit('close')
      }
    },
    async loadFile() {
      try {
        const params = new URLSearchParams({
          path: this.path,
          root: this.rootPath
        })
        const response = await fetch(`/api/file?${params}`)
        const data = await response.json()

        if (!response.ok) {
          this.error = data.error || 'Failed to load file'
          return
        }

        this.content = data.content
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.file-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.file-viewer {
  background: #1e1e1e;
  border: 1px solid #3e3e3e;
  border-radius: 8px;
  width: 90vw;
  max-width: 1200px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.file-viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
}

.file-path {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  color: #d4d4d4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-button {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0 8px;
  line-height: 1;
}

.close-button:hover {
  color: #d4d4d4;
}

.file-viewer-content {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.file-viewer-content pre {
  margin: 0;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: #1e1e1e;
}

.file-viewer-content code {
  background: transparent;
}

.loading {
  color: #888;
}

.error {
  color: #ff6b6b;
}
</style>
