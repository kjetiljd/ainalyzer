<script setup>
import { ref, computed } from 'vue'
import Treemap from './Treemap.vue'
import Breadcrumb from './Breadcrumb.vue'
import StatsBar from './StatsBar.vue'
import Statusline from './Statusline.vue'
import { findNodeByPath } from '../composables/useTreeStats'

const props = defineProps({
  data: { type: Object, required: true },
  navigationStack: { type: Array, required: true },
  preferences: { type: Object, required: true }
})

const emit = defineEmits(['update:navigationStack', 'file-open', 'contextmenu'])

// Internal state
const statuslineText = ref('')
const statuslineIsRepo = ref(false)

// Computed from navigationStack
const breadcrumbPath = computed(() => props.navigationStack.map(n => n.name))
const currentNode = computed(() => props.navigationStack[props.navigationStack.length - 1])

// Look up current node in filtered tree to ensure exclusions apply when drilled down
const filteredCurrentNode = computed(() => {
  if (!props.data || !currentNode.value) return null
  const path = currentNode.value.path
  if (!path) return props.data
  return findNodeByPath(props.data, path) || props.data
})

// Handle drill-down from Treemap
function handleDrillDown(event) {
  const node = event.node

  // Check if this is a file
  if (node.type === 'file') {
    // If already zoomed into this file, open FileViewer
    if (currentNode.value?.path === node.path && node.path) {
      emit('file-open', node.path)
      return
    }
    // Otherwise drill into the file
    emit('update:navigationStack', event.path)
    return
  }

  // If clicking the same directory we're already at, ignore
  if (node.path && currentNode.value?.path === node.path) {
    return
  }

  // Navigate to directory
  emit('update:navigationStack', event.path)
}

// Handle breadcrumb navigation
function handleBreadcrumbNavigate(index) {
  const newStack = props.navigationStack.slice(0, index + 1)
  emit('update:navigationStack', newStack)
}

// Handle hover events from Treemap
function handleHover(event) {
  statuslineText.value = event.text
  statuslineIsRepo.value = event.isRepo
}

function handleHoverEnd() {
  statuslineText.value = ''
  statuslineIsRepo.value = false
}

// Repo border color depends on color scheme
const REPO_BORDER_COLORS = {
  depth: '#009688',    // Teal
  activity: '#ff7043', // Coral
  filetype: '#ffffff'  // White
}
const repoColor = computed(() => {
  const colorMode = props.preferences.appearance?.colorMode || 'depth'
  return REPO_BORDER_COLORS[colorMode] || '#e67e22'
})
</script>

<template>
  <div class="treemap-explorer">
    <Breadcrumb :path="breadcrumbPath" @navigate="handleBreadcrumbNavigate" />
    <StatsBar :currentNode="filteredCurrentNode" />
    <div class="treemap-container">
      <Treemap
        :data="data"
        :currentNode="filteredCurrentNode"
        :navigationStack="navigationStack"
        :cushionMode="preferences.appearance?.cushionTreemap"
        :hideFolderBorders="preferences.appearance?.hideFolderBorders"
        :showRepoBorders="preferences.appearance?.showRepoBorders"
        :colorMode="preferences.appearance?.colorMode || 'depth'"
        @drill-down="handleDrillDown"
        @hover="handleHover"
        @hover-end="handleHoverEnd"
        @node-contextmenu="$emit('contextmenu', $event)"
      />
    </div>
    <Statusline :text="statuslineText" :isRepo="statuslineIsRepo" :repoColor="repoColor" />
  </div>
</template>

<style scoped>
.treemap-explorer {
  display: contents;
}

.treemap-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
  overflow: hidden;
}
</style>