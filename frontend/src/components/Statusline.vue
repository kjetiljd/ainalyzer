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
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 20px;
  background: #1e1e1e;
  border-top: 1px solid #3e3e3e;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', monospace;
  color: #888;
  height: 30px;
  line-height: 30px;
}

.statusline.active {
  color: #d4d4d4;
}
</style>
