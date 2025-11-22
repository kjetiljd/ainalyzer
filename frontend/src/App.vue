<script setup>
import { ref } from 'vue'
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

// Handle drill-down
function handleDrillDown(node) {
  navigationStack.value.push(node)
  breadcrumbPath.value.push(node.name)
  currentNode.value = node
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
      :width="1200"
      :height="800"
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
