<template>
  <div class="stats-bar">
    <span class="stat-item">
      <strong>{{ totalLines.toLocaleString() }}</strong> lines
    </span>
    <span class="stat-separator">•</span>
    <span class="stat-item">
      <strong>{{ fileCount }}</strong> files
    </span>
    <span class="stat-separator">•</span>
    <span class="stat-item">
      <strong>{{ dirCount }}</strong> directories
    </span>
    <span class="stat-separator">•</span>
    <span class="stat-item">
      <strong>{{ totalChanges.toLocaleString() }}</strong> file changes
    </span>
  </div>
</template>

<script setup>
import { toRef } from 'vue'
import { useTreeStats } from '../composables/useTreeStats'

const props = defineProps({
  currentNode: {
    type: Object,
    required: true
  }
})

const { totalLines, fileCount, directoryCount: dirCount, changes: totalChanges } = useTreeStats(toRef(props, 'currentNode'))
</script>

<style scoped>
.stats-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: clamp(12px, 2vw, 14px);
  color: #888;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
  scrollbar-color: #3e3e3e #1e1e1e;
}

.stats-bar::-webkit-scrollbar {
  height: 6px;
}

.stats-bar::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.stats-bar::-webkit-scrollbar-thumb {
  background: #3e3e3e;
  border-radius: 3px;
}

.stat-item {
  color: #888;
}

.stat-item strong {
  color: #d4d4d4;
  font-weight: 600;
}

.stat-separator {
  color: #888;
}
</style>
