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
    getNodeColor(node) {
      // If node has children, it's a directory - use neutral gray
      if (node.data.children) {
        return '#4a4a4a'
      }

      // It's a file - color by depth using ColorBrewer Set2
      const fileColors = ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f']
      return fileColors[node.depth % fileColors.length]
    },

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
        rect.setAttribute('fill', this.getNodeColor(node))
        rect.setAttribute('stroke', '#1e1e1e')
        rect.setAttribute('stroke-width', '2')
        rect.style.cursor = 'pointer'

        // Add click handler - all nodes are clickable
        rect.addEventListener('click', () => {
          // Build full path from root to this node
          const pathNodes = []
          let currentNode = node
          while (currentNode) {
            pathNodes.unshift(currentNode.data)
            currentNode = currentNode.parent
          }
          this.$emit('drill-down', { node: node.data, path: pathNodes })
        })

        // Add hover handlers
        rect.addEventListener('mouseenter', () => {
          // Build full path from root to this node
          const pathParts = []
          let currentNode = node
          while (currentNode) {
            pathParts.unshift(currentNode.data.name)
            currentNode = currentNode.parent
          }
          const fullPath = pathParts.join(' / ')
          const lines = node.value ? ` (${node.value.toLocaleString()} lines)` : ''

          this.$emit('hover', fullPath + lines)
        })

        rect.addEventListener('mouseleave', () => {
          this.$emit('hover-end')
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
