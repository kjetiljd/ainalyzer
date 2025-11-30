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

<script>
export default {
  name: 'StatsBar',
  props: {
    currentNode: {
      type: Object,
      required: true
    }
  },
  computed: {
    totalLines() {
      return this.calculateTotalLines(this.currentNode)
    },
    fileCount() {
      return this.countFiles(this.currentNode)
    },
    dirCount() {
      return this.countDirectories(this.currentNode)
    },
    totalChanges() {
      return this.countChanges(this.currentNode)
    }
  },
  methods: {
    calculateTotalLines(node) {
      if (!node) return 0
      if (node.value) return node.value
      if (!node.children) return 0
      return node.children.reduce((sum, child) =>
        sum + this.calculateTotalLines(child), 0)
    },
    countFiles(node) {
      if (!node) return 0
      if (!node.children) return node.value ? 1 : 0
      return node.children.reduce((sum, child) =>
        sum + this.countFiles(child), 0)
    },
    countDirectories(node) {
      if (!node) return 0
      if (!node.children) return 0
      return 1 + node.children.reduce((sum, child) =>
        sum + this.countDirectories(child), 0)
    },
    countChanges(node) {
      if (!node) return 0
      if (!node.children) {
        return node.commits?.last_year || 0
      }
      return node.children.reduce((sum, child) =>
        sum + this.countChanges(child), 0)
    }
  }
}
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
