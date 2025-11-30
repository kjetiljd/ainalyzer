<template>
  <div v-if="visible" class="exclusion-backdrop" @click="$emit('close')" @keydown.escape="$emit('close')">
    <div ref="menuRef" class="exclusion-menu" :style="menuStyle" @click.stop>
      <div class="menu-item" @click="exclude('file')">
        Exclude this file
      </div>
      <div class="menu-item" @click="exclude('folder')">
        Exclude this folder
      </div>
      <div class="menu-divider" />
      <div class="menu-item" @click="exclude('name-repo')">
        Exclude {{ filename }} in this repo
      </div>
      <div class="menu-item" @click="exclude('name-all')">
        Exclude {{ filename }} everywhere
      </div>
      <div class="menu-divider" />
      <div class="menu-item" @click="exclude('ext-repo')">
        Exclude *.{{ extension }} in this repo
      </div>
      <div class="menu-item" @click="exclude('ext-all')">
        Exclude *.{{ extension }} everywhere
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  x: {
    type: Number,
    default: 0
  },
  y: {
    type: Number,
    default: 0
  },
  node: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['exclude', 'close'])

const menuRef = ref(null)
const adjustedX = ref(0)
const adjustedY = ref(0)

// Adjust position when menu becomes visible or position changes
watch([() => props.visible, () => props.x, () => props.y], async ([visible]) => {
  if (!visible) return

  // Start with requested position
  adjustedX.value = props.x
  adjustedY.value = props.y

  // Wait for DOM update to measure menu
  await nextTick()

  if (!menuRef.value) return

  const rect = menuRef.value.getBoundingClientRect()
  const padding = 8

  // Clamp to viewport boundaries
  if (adjustedX.value + rect.width > window.innerWidth - padding) {
    adjustedX.value = window.innerWidth - rect.width - padding
  }
  if (adjustedY.value + rect.height > window.innerHeight - padding) {
    adjustedY.value = window.innerHeight - rect.height - padding
  }
  if (adjustedX.value < padding) {
    adjustedX.value = padding
  }
  if (adjustedY.value < padding) {
    adjustedY.value = padding
  }
}, { immediate: true })

const menuStyle = computed(() => ({
  left: `${adjustedX.value}px`,
  top: `${adjustedY.value}px`
}))

const filename = computed(() => {
  if (!props.node) return ''
  return props.node.name
})

const extension = computed(() => {
  if (!props.node?.name) return ''
  const parts = props.node.name.split('.')
  return parts.length > 1 ? parts.pop() : ''
})

const repoName = computed(() => {
  if (!props.node?.path) return ''
  return props.node.path.split('/')[0]
})

const parentFolder = computed(() => {
  if (!props.node?.path) return ''
  const parts = props.node.path.split('/')
  parts.pop() // Remove filename
  return parts.join('/')
})

function exclude(type) {
  let pattern = ''

  switch (type) {
    case 'file':
      pattern = props.node.path
      break
    case 'folder':
      pattern = `${parentFolder.value}/**`
      break
    case 'name-repo':
      pattern = `${repoName.value}/**/${filename.value}`
      break
    case 'name-all':
      pattern = `**/${filename.value}`
      break
    case 'ext-repo':
      pattern = `${repoName.value}/**/*.${extension.value}`
      break
    case 'ext-all':
      pattern = `**/*.${extension.value}`
      break
  }

  emit('exclude', pattern)
  emit('close')
}
</script>

<style scoped>
.exclusion-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
}

.exclusion-menu {
  position: fixed;
  background: #2a2a2a;
  border: 1px solid #3e3e3e;
  border-radius: 6px;
  padding: 4px 0;
  min-width: 220px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 201;
}

.menu-item {
  padding: 8px 16px;
  color: #d4d4d4;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.menu-item:hover {
  background: #3e3e3e;
}

.menu-divider {
  height: 1px;
  background: #3e3e3e;
  margin: 4px 0;
}
</style>
