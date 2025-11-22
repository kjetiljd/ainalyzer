<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Treemap from './components/Treemap.vue'
import Breadcrumb from './components/Breadcrumb.vue'
import Statusline from './components/Statusline.vue'

const mockData = {
  name: 'ainalyzer-demo',
  children: [
    {
      name: 'backend-api',
      children: [
        {
          name: 'src',
          children: [
            { name: 'auth.py', value: 1234 },
            { name: 'database.py', value: 2100 },
            { name: 'api.py', value: 890 }
          ]
        },
        {
          name: 'tests',
          children: [
            { name: 'test_auth.py', value: 800 },
            { name: 'test_api.py', value: 950 }
          ]
        }
      ]
    },
    {
      name: 'frontend',
      children: [
        {
          name: 'components',
          children: [
            { name: 'Header.vue', value: 450 },
            { name: 'Sidebar.vue', value: 380 }
          ]
        },
        {
          name: 'views',
          children: [
            { name: 'Dashboard.vue', value: 1200 },
            { name: 'Settings.vue', value: 560 }
          ]
        }
      ]
    }
  ]
}

// Navigation state
const navigationStack = ref([mockData])
const breadcrumbPath = ref([mockData.name])
const statuslineText = ref('')

// Current node being displayed
const currentNode = ref(mockData)

// Responsive dimensions
const treemapWidth = ref(1200)
const treemapHeight = ref(800)

function updateDimensions() {
  // Account for body padding (20px each side = 40px total)
  // and max-width constraint on .app container
  const availableWidth = Math.min(window.innerWidth - 40, 1400)
  treemapWidth.value = availableWidth
  // Account for header, breadcrumb, padding, and statusline
  treemapHeight.value = window.innerHeight - 150
}

onMounted(() => {
  updateDimensions()
  window.addEventListener('resize', updateDimensions)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions)
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
    <Breadcrumb :path="breadcrumbPath" @navigate="handleBreadcrumbNavigate" />
    <Treemap
      :data="mockData"
      :currentNode="currentNode"
      :width="treemapWidth"
      :height="treemapHeight"
      @drill-down="handleDrillDown"
      @hover="statuslineText = $event"
      @hover-end="statuslineText = ''"
    />
    <Statusline :text="statuslineText" />
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #1e1e1e;
  color: #d4d4d4;
}

.app {
  max-width: 1400px;
  margin: 0 auto;
}

h1 {
  margin: 0 0 20px 0;
  font-size: 24px;
}
</style>
