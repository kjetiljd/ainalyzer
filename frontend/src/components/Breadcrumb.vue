<template>
  <div class="breadcrumb">
    <span
      v-for="(segment, index) in path"
      :key="index"
      class="breadcrumb-item"
    >
      <span
        class="breadcrumb-segment"
        @click="navigate(index)"
      >
        {{ segment }}
      </span>
      <span v-if="index < path.length - 1" class="separator"> / </span>
    </span>
  </div>
</template>

<script>
export default {
  name: 'Breadcrumb',
  props: {
    path: {
      type: Array,
      required: true
    }
  },
  methods: {
    navigate(index) {
      this.$emit('navigate', index)
    }
  }
}
</script>

<style scoped>
.breadcrumb {
  margin: 0;
  font-size: clamp(12px, 2vw, 14px);
  color: #888;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
  scrollbar-color: #3e3e3e #1e1e1e;
}

.breadcrumb::-webkit-scrollbar {
  height: 6px;
}

.breadcrumb::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.breadcrumb::-webkit-scrollbar-thumb {
  background: #3e3e3e;
  border-radius: 3px;
}

.breadcrumb-segment {
  cursor: pointer;
  color: #4fc3f7;
}

.breadcrumb-segment:hover {
  text-decoration: underline;
}

.separator {
  margin: 0 8px;
  color: #888;
}
</style>
