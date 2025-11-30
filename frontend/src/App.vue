<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Treemap from './components/Treemap.vue'
import Breadcrumb from './components/Breadcrumb.vue'
import StatsBar from './components/StatsBar.vue'
import Statusline from './components/Statusline.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import FileViewer from './components/FileViewer.vue'
import ExclusionMenu from './components/ExclusionMenu.vue'
import { usePreferences } from './composables/usePreferences'
import { parseClocignore, filterTree } from './utils/clocignore'

// Preferences
const { preferences, updateURL, addExclusion } = usePreferences()
const showSettings = ref(false)

// Context menu state
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  node: null
})

// Available analyses
const analyses = ref([])
const selectedAnalysis = ref(null)

// Current analysis data
const data = ref(null)
const analysisInfo = ref(null)
const rootPath = ref(null)
const loading = ref(true)
const error = ref(null)

// Navigation state
const navigationStack = ref([])
const breadcrumbPath = ref([])
const statuslineText = ref('')
const currentNode = ref(null)

// File viewer state
const viewingFile = ref(null)

// Clocignore patterns
const clocignorePatterns = ref([])

// Combine .clocignore patterns with enabled custom exclusions
const allExclusionPatterns = computed(() => {
  const patterns = [...clocignorePatterns.value]

  // Add enabled custom exclusions
  const customExclusions = preferences.value.filters?.customExclusions || []
  for (const excl of customExclusions) {
    if (excl.enabled) {
      patterns.push(excl.pattern)
    }
  }

  return patterns
})

// Filtered tree (computed based on preferences)
const filteredData = computed(() => {
  if (!data.value) return null

  // Check if .clocignore filtering is disabled AND no custom exclusions
  const hideClocignore = preferences.value.filters?.hideClocignore
  const hasCustomExclusions = (preferences.value.filters?.customExclusions || [])
    .some(e => e.enabled)

  if (!hideClocignore && !hasCustomExclusions) {
    return data.value
  }

  // Build combined pattern list
  const patterns = []

  if (hideClocignore) {
    patterns.push(...clocignorePatterns.value)
  }

  const customExclusions = preferences.value.filters?.customExclusions || []
  for (const excl of customExclusions) {
    if (excl.enabled) {
      patterns.push(excl.pattern)
    }
  }

  if (patterns.length === 0) {
    return data.value
  }

  return filterTree(data.value, patterns)
})

// Find matching node in filtered tree for stats calculation
const filteredCurrentNode = computed(() => {
  if (!filteredData.value || !currentNode.value) return null

  // Check if any filtering is active
  const hasClocignoreFiltering = preferences.value.filters?.hideClocignore && clocignorePatterns.value.length > 0
  const hasCustomExclusions = (preferences.value.filters?.customExclusions || []).some(e => e.enabled)

  // If no filtering active, return unfiltered currentNode
  if (!hasClocignoreFiltering && !hasCustomExclusions) {
    return currentNode.value
  }

  // Navigate to matching node in filtered tree using path
  const path = currentNode.value.path
  if (!path) return filteredData.value

  function findNode(node, targetPath) {
    if (node.path === targetPath) return node
    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child, targetPath)
        if (found) return found
      }
    }
    return null
  }

  return findNode(filteredData.value, path) || filteredData.value
})

// Load list of available analyses
async function loadAnalysesList() {
  try {
    const response = await fetch('/api/analyses/')
    if (!response.ok) {
      throw new Error('Failed to load analyses list')
    }
    const index = await response.json()
    analyses.value = index.analyses || []

    // Try to restore last selected analysis by name
    if (preferences.value.lastSelectedAnalysis) {
      const exists = analyses.value.find(a => a.name === preferences.value.lastSelectedAnalysis)
      if (exists) {
        selectedAnalysis.value = exists.filename
        return
      }
    }

    // Fallback: auto-select first analysis if available
    if (analyses.value.length > 0 && !selectedAnalysis.value) {
      selectedAnalysis.value = analyses.value[0].filename
    }
  } catch (e) {
    console.error('Failed to load analyses list:', e)
    error.value = 'No analyses found. Run "./aina analyze <name>" first.'
    loading.value = false
  }
}

// Load selected analysis
async function loadAnalysis(filename) {
  if (!filename) return

  loading.value = true
  error.value = null

  try {
    const response = await fetch(`/api/analyses/${filename}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const json = await response.json()

    // Store analysis info
    analysisInfo.value = {
      name: json.analysis_set,
      generatedAt: json.generated_at,
      stats: json.stats
    }

    // Store root path for file opening
    rootPath.value = json.root_path

    // Extract tree for visualization
    data.value = json.tree
    navigationStack.value = [json.tree]
    breadcrumbPath.value = [json.tree.name]
    currentNode.value = json.tree
    loading.value = false

    console.log('Loaded analysis:', json.analysis_set)
    console.log('Stats:', json.stats)

    // Load .clocignore patterns
    await loadClocignore(json.analysis_set)
  } catch (e) {
    error.value = e.message
    loading.value = false
    console.error('Failed to load analysis:', e)
  }
}

// Load .clocignore patterns for current analysis
async function loadClocignore(analysisName) {
  try {
    const response = await fetch(`/api/clocignore?analysis=${encodeURIComponent(analysisName)}`)
    if (response.ok) {
      const data = await response.json()
      clocignorePatterns.value = parseClocignore(data.content || '')
    } else {
      clocignorePatterns.value = []
    }
  } catch (e) {
    console.warn('Failed to load .clocignore:', e)
    clocignorePatterns.value = []
  }
}

// Watch for selection changes
watch(selectedAnalysis, (newValue) => {
  if (newValue) {
    loadAnalysis(newValue)
    // Persist selection by name
    const analysis = analyses.value.find(a => a.filename === newValue)
    if (analysis) {
      preferences.value.lastSelectedAnalysis = analysis.name
      updateURL()
    }
  }
})

// Initialize on mount
onMounted(async () => {
  await loadAnalysesList()
})


// Handle drill-down - use full path from event
function handleDrillDown(event) {
  const node = event.node

  // Check if this is a file by type property
  if (node.type === 'file') {
    // If already zoomed into this file, open FileViewer
    if (currentNode.value === node && node.path && rootPath.value) {
      openFileInEditor(node.path)
      return
    }
    // Otherwise drill into the file (make it currentNode)
    navigationStack.value = event.path
    breadcrumbPath.value = event.path.map(n => n.name)
    currentNode.value = node
    return
  }

  // If clicking the same directory we're already at, ignore it
  if (currentNode.value === node) {
    return
  }

  // Navigate to directory
  navigationStack.value = event.path
  breadcrumbPath.value = event.path.map(n => n.name)
  currentNode.value = node
}

// Open file viewer
function openFileInEditor(relativePath) {
  viewingFile.value = relativePath
}

// Handle breadcrumb navigation
function handleBreadcrumbNavigate(index) {
  navigationStack.value = navigationStack.value.slice(0, index + 1)
  breadcrumbPath.value = breadcrumbPath.value.slice(0, index + 1)
  currentNode.value = navigationStack.value[index]
}

// Handle context menu from treemap
function handleContextMenu(event) {
  contextMenu.value = {
    visible: true,
    x: event.x,
    y: event.y,
    node: event.node
  }
}

// Handle exclusion from context menu
function handleExclude(pattern) {
  addExclusion(pattern)
}

// Close context menu
function closeContextMenu() {
  contextMenu.value.visible = false
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>Ainalyzer - Code Visibility</h1>

      <div class="header-controls">
        <div v-if="analyses.length > 0" class="analysis-selector">
          <label for="analysis-select">Analysis:</label>
          <select id="analysis-select" v-model="selectedAnalysis">
            <option v-for="analysis in analyses" :key="analysis.filename" :value="analysis.filename">
              {{ analysis.name }}
              <template v-if="analysis.stats">
                ({{ analysis.stats.total_files.toLocaleString() }} files,
                 {{ analysis.stats.total_lines.toLocaleString() }} lines)
              </template>
            </option>
          </select>
        </div>
        <button class="settings-button" @click="showSettings = true" aria-label="Open settings">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    </header>

    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    <FileViewer
      v-if="viewingFile"
      :path="viewingFile"
      :rootPath="rootPath"
      :displayPath="breadcrumbPath.slice(1).join(' / ')"
      @close="viewingFile = null"
    />
    <ExclusionMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :node="contextMenu.node"
      @exclude="handleExclude"
      @close="closeContextMenu"
    />

    <div v-if="loading" class="loading">Loading analysis data...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else-if="filteredData">
      <Breadcrumb :path="breadcrumbPath" @navigate="handleBreadcrumbNavigate" />
      <StatsBar :currentNode="filteredCurrentNode" />
      <div class="treemap-container">
        <Treemap
          :data="filteredData"
          :currentNode="filteredCurrentNode"
          :navigationStack="navigationStack"
          :cushionMode="preferences.appearance?.cushionTreemap"
          :hideFolderBorders="preferences.appearance?.hideFolderBorders"
          :colorMode="preferences.appearance?.colorMode || 'depth'"
          @drill-down="handleDrillDown"
          @hover="statuslineText = $event"
          @hover-end="statuslineText = ''"
          @node-contextmenu="handleContextMenu"
        />
      </div>
      <Statusline :text="statuslineText" />
    </template>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #1e1e1e;
  color: #d4d4d4;
}

.app {
  container-type: inline-size;
  container-name: app-container;
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  height: 100vh;
  height: 100dvh;
  width: 100vw;
  max-width: 100vw;
  padding: clamp(8px, 2vw, 20px);
  box-sizing: border-box;
  gap: clamp(8px, 1.5vh, 16px);
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.settings-button {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.settings-button:hover {
  color: #d4d4d4;
  background: #3e3e3e;
}

h1 {
  margin: 0;
  font-size: clamp(18px, 4vw, 24px);
}

.analysis-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.analysis-selector label {
  color: #888;
}

.analysis-selector select {
  padding: 6px 12px;
  background: #2a2a2a;
  border: 1px solid #3e3e3e;
  border-radius: 4px;
  color: #d4d4d4;
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  min-width: 200px;
}

.analysis-selector select:hover {
  border-color: #4fc3f7;
}

.analysis-selector select:focus {
  outline: none;
  border-color: #4fc3f7;
  box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.1);
}

.loading, .error {
  padding: 40px;
  text-align: center;
  font-size: 18px;
}

.error {
  color: #ff6b6b;
}

.treemap-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
  overflow: hidden;
}

/* Container queries for adaptive UI */
@container app-container (max-width: 768px) {
  h1 {
    font-size: clamp(16px, 5vw, 20px);
    margin-bottom: 8px;
  }
}

@container app-container (min-width: 1600px) {
  .treemap-container {
    border: 1px solid #3e3e3e;
  }
}
</style>
