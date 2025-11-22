<template>
  <div class="statusline" :class="{ active: text }">
    {{ displayText }}
  </div>
</template>

<script>
export default {
  name: 'Statusline',
  props: {
    text: {
      type: String,
      default: ''
    }
  },
  computed: {
    displayText() {
      return this.text || 'Hover over a file or directory to see its path'
    }
  }
}
</script>

<style scoped>
.statusline {
  padding: 8px clamp(12px, 2vw, 20px);
  background: #1e1e1e;
  border-top: 1px solid #3e3e3e;
  font-size: clamp(11px, 2vw, 13px);
  font-family: 'Monaco', 'Menlo', monospace;
  color: #888;
  min-height: 30px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.statusline.active {
  color: #d4d4d4;
}
</style>
