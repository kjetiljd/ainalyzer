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
    <!-- Generic mode headline (G3): active color mode supplies its own honest summary -->
    <template v-if="modeHeadline">
      <span class="stat-separator">•</span>
      <span class="stat-item mode-headline" :title="modeHeadline.title">
        {{ modeHeadline.label }}
        <strong :class="modeHeadline.netClass">{{ modeHeadline.netText }}</strong>
        net <span class="mode-headline-note">({{ modeHeadline.note }})</span>
      </span>
    </template>
  </div>
</template>

<script setup>
import { toRef, computed } from 'vue'
import { useTreeStats, aggregateTree } from '../composables/useTreeStats'
import { COLOR_MODES } from '../utils/colorUtils'

const props = defineProps({
  currentNode: {
    type: Object,
    required: true
  },
  colorMode: {
    type: String,
    default: 'depth'
  },
  activityTimeframe: {
    type: String,
    default: '1year'
  }
})

const { totalLines, fileCount, directoryCount: dirCount, changes: totalChanges } = useTreeStats(toRef(props, 'currentNode'))

// Honest, deletion-inclusive headline supplied by the active color mode descriptor.
// Rolled up over the CURRENT node (not the whole analysis) so the net is scoped exactly
// like the lines/files/changes beside it. Growth declares per-leaf add/delete extractors;
// modes without a headline render nothing.
const modeHeadline = computed(() => {
  const mode = COLOR_MODES[props.colorMode]
  const h = mode?.headline
  const node = props.currentNode
  if (!h || !node) return null

  const tf = props.activityTimeframe
  const added = aggregateTree(node, n => h.leafAdded(n, tf))
  const deleted = aggregateTree(node, n => h.leafDeleted(n, tf))
  // No growth activity under this node — keep the slot empty.
  if (added === 0 && deleted === 0) return null

  const net = added - deleted
  const sign = net > 0 ? '+' : ''
  const windowLabel = tf === '3months' ? 'last 3 months' : 'last year'
  return {
    label: `${mode.label}:`,
    netText: `${sign}${net.toLocaleString()}`,
    netClass: net > 0 ? 'net-grow' : (net < 0 ? 'net-shrink' : 'net-flat'),
    note: 'net change incl. deletions, not size',
    title: `+${added.toLocaleString()} added, −${deleted.toLocaleString()} deleted over the ${windowLabel}`
  }
})
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

.mode-headline-note {
  color: #777;
  font-style: italic;
}

.net-grow {
  color: #fd8d3c;
}

.net-shrink {
  color: #6baed6;
}

.net-flat {
  color: #8a8a8a;
}
</style>
