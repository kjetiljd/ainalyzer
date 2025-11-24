<script setup>
import { ref, onMounted, watch } from 'vue'
import Treemap from './components/Treemap.vue'
import Breadcrumb from './components/Breadcrumb.vue'
import Statusline from './components/Statusline.vue'

// Available analyses
const analyses = ref([])
const selectedAnalysis = ref(null)

// Current analysis data
const data = ref(null)
const analysisInfo = ref(null)
const loading = ref(true)
const error = ref(null)

// Navigation state
const navigationStack = ref([])
const breadcrumbPath = ref([])
const statuslineText = ref('')
const currentNode = ref(null)

// Load list of available analyses
async function loadAnalysesList() {
  try {
    const response = await fetch('/api/analyses/')
    if (!response.ok) {
      throw new Error('Failed to load analyses list')
    }
    const index = await response.json()
    analyses.value = index.analyses || []

    // Auto-select first analysis if available
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

    // Extract tree for visualization
    data.value = json.tree
    navigationStack.value = [json.tree]
    breadcrumbPath.value = [json.tree.name]
    currentNode.value = json.tree
    loading.value = false

    console.log('Loaded analysis:', json.analysis_set)
    console.log('Stats:', json.stats)
  } catch (e) {
    error.value = e.message
    loading.value = false
    console.error('Failed to load analysis:', e)
  }
}

// Watch for selection changes
watch(selectedAnalysis, (newValue) => {
  if (newValue) {
    loadAnalysis(newValue)
  }
})

// Initialize on mount
onMounted(async () => {
  await loadAnalysesList()
})


// Handle drill-down - use full path from event
function handleDrillDown(event) {
  // If clicking the same node we're already at, ignore it
  if (currentNode.value === event.node) {
    return
  }

  navigationStack.value = event.path
  breadcrumbPath.value = event.path.map(n => n.name)
  currentNode.value = event.node
}

// Handle breadcrumb navigation
function handleBreadcrumbNavigate(index) {
  navigationStack.value = navigationStack.value.slice(0, index + 1)
  breadcrumbPath.value = breadcrumbPath.value.slice(0, index + 1)
  currentNode.value = navigationStack.value[index]
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>Ainalyzer - Code Visibility</h1>

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
    </header>

    <div v-if="loading" class="loading">Loading analysis data...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else-if="data">
      <Breadcrumb :path="breadcrumbPath" @navigate="handleBreadcrumbNavigate" />
      <div class="treemap-container">
        <Treemap
          :data="data"
          :currentNode="currentNode"
          @drill-down="handleDrillDown"
          @hover="statuslineText = $event"
          @hover-end="statuslineText = ''"
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
  grid-template-rows: auto auto 1fr auto;
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
