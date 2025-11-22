<template>
  <div class="treemap" ref="container">
    <svg ref="svg" :width="width" :height="height"></svg>
  </div>
</template>

<script>
import { hierarchy, treemap } from 'd3-hierarchy'

export default {
  name: 'Treemap',
  props: {
    data: {
      type: Object,
      required: true
    },
    currentNode: {
      type: Object,
      default: null
    },
    width: {
      type: Number,
      default: 800
    },
    height: {
      type: Number,
      default: 600
    }
  },
  mounted() {
    this.render()
  },
  watch: {
    data() {
      this.render()
    },
    currentNode() {
      this.render()
    }
  },
  methods: {
    render() {
      const svg = this.$refs.svg
      if (!svg) return

      // Clear previous rendering
      svg.innerHTML = ''

      // Use currentNode if provided, otherwise use data
      const nodeToRender = this.currentNode || this.data

      // Create hierarchy
      const root = hierarchy(nodeToRender)
        .sum(d => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0))

      // Create treemap layout
      const layout = treemap()
        .size([this.width, this.height])
        .paddingOuter(3)
        .paddingInner(1)

      layout(root)

      // Render rectangles
      const nodes = root.descendants()

      nodes.forEach(node => {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rect.setAttribute('x', node.x0)
        rect.setAttribute('y', node.y0)
        rect.setAttribute('width', node.x1 - node.x0)
        rect.setAttribute('height', node.y1 - node.y0)
        rect.setAttribute('fill', '#4a4a4a')
        rect.setAttribute('stroke', '#1e1e1e')
        rect.setAttribute('stroke-width', '2')
        rect.style.cursor = 'pointer'

        // Add click handler
        rect.addEventListener('click', () => {
          if (node.data.children) {
            this.$emit('drill-down', node.data)
          }
        })

        svg.appendChild(rect)
      })
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
