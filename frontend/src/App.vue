<script setup>
import { ref, onMounted } from 'vue'
import Treemap from './components/Treemap.vue'
import Breadcrumb from './components/Breadcrumb.vue'
import Statusline from './components/Statusline.vue'

// Data will be loaded from backend
const data = ref(null)
const loading = ref(true)
const error = ref(null)

// Navigation state
const navigationStack = ref([])
const breadcrumbPath = ref([])
const statuslineText = ref('')
const currentNode = ref(null)

// Load data from backend-generated JSON
onMounted(async () => {
  try {
    const response = await fetch('/data.json')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const json = await response.json()

    // Extract tree from backend JSON structure
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
    console.error('Failed to load data:', e)
  }
})


// Handle drill-down - use full path from event
function handleDrillDown(event) {
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
    <h1>Ainalyzer - Code Visibility</h1>

    <div v-if="loading" class="loading">Loading analysis data...</div>
    <div v-else-if="error" class="error">Error loading data: {{ error }}</div>

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

h1 {
  margin: 0;
  font-size: clamp(18px, 4vw, 24px);
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
