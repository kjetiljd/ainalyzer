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
      <span
        class="stat-item mode-headline"
        tabindex="0"
        :aria-label="modeHeadline.title"
        @mouseenter="showTip"
        @mouseleave="hideTip"
        @focus="showTip"
        @blur="hideTip"
      >
        <strong :class="modeHeadline.netClass">{{ modeHeadline.netText }}</strong>
        lines
      </span>
    </template>
    <Teleport to="body">
      <div v-if="tipVisible && modeHeadline" class="mode-headline-tip" :style="tipStyle">
        {{ modeHeadline.title }}
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { toRef, computed, ref, onBeforeUnmount } from 'vue'
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
    netText: `${sign}${net.toLocaleString()}`,
    netClass: net > 0 ? 'net-grow' : (net < 0 ? 'net-shrink' : 'net-flat'),
    title: `Net change incl. deletions, not code size: `
      + `+${added.toLocaleString()} added, −${deleted.toLocaleString()} deleted over the ${windowLabel}. `
      + `Counts every changed line in git history (including blank and comment lines), `
      + `so it differs from the cloc code-line count shown as "lines".`
  }
})

// Lightweight custom tooltip: native title has a ~1s browser delay and a help
// cursor. We render our own fixed-position bubble (teleported to body so the
// stats-bar's overflow can't clip it) with a short, snappy show delay.
const tipVisible = ref(false)
const tipStyle = ref({})
const TIP_DELAY_MS = 120
const TIP_MAX_WIDTH = 340
let tipTimer = null

function showTip(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  clearTimeout(tipTimer)
  tipTimer = setTimeout(() => {
    const margin = 8
    let left = rect.left
    if (left + TIP_MAX_WIDTH + margin > window.innerWidth) {
      left = Math.max(margin, window.innerWidth - TIP_MAX_WIDTH - margin)
    }
    tipStyle.value = { top: `${rect.bottom + 6}px`, left: `${left}px`, maxWidth: `${TIP_MAX_WIDTH}px` }
    tipVisible.value = true
  }, TIP_DELAY_MS)
}

function hideTip() {
  clearTimeout(tipTimer)
  tipVisible.value = false
}

onBeforeUnmount(() => clearTimeout(tipTimer))
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

.mode-headline {
  cursor: default;
  text-decoration: underline dotted #555;
  text-underline-offset: 3px;
  outline: none;
}

.mode-headline-tip {
  position: fixed;
  z-index: 1000;
  background: #2d2d2d;
  color: #d4d4d4;
  border: 1px solid #3e3e3e;
  border-radius: 4px;
  padding: 6px 9px;
  font-size: 12px;
  line-height: 1.4;
  white-space: normal;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  pointer-events: none;
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
