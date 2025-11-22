<template>
  <div class="treemap">
  </div>
</template>

<script>
export default {
  name: 'Treemap',
  props: {
    data: {
      type: Object,
      required: true
    }
  }
}
</script>

<style scoped>
.treemap {
  width: 100%;
  height: 100%;
}
</style>
