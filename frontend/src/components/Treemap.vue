<template>
  <svg class="treemap" ref="svg"></svg>
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
    navigationStack: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      width: 0,
      height: 0,
      resizeObserver: null
    }
  },
  mounted() {
    this.updateDimensions()
    this.render()

    this.resizeObserver = new ResizeObserver(() => {
      this.updateDimensions()
      this.render()
    })
    this.resizeObserver.observe(this.$el)
  },
  unmounted() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
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
    updateDimensions() {
      if (!this.$el) return
      this.width = this.$el.clientWidth
      this.height = this.$el.clientHeight
    },

    getNodeColor(node) {
      // If node has children, it's a directory - use neutral gray
      if (node.data.children) {
        return '#4a4a4a'
      }

      // It's a file - color by depth using ColorBrewer Set2
      const fileColors = ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f']
      return fileColors[node.depth % fileColors.length]
    },

    getTextColor(bgColor) {
      // Phase 3: Calculate text color based on background for contrast
      // Convert hex to RGB
      const hex = bgColor.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16)
      const g = parseInt(hex.substr(2, 2), 16)
      const b = parseInt(hex.substr(4, 2), 16)

      // Calculate relative luminance (WCAG formula)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

      // Return black for light backgrounds, white for dark backgrounds
      return luminance > 0.5 ? '#000000' : '#ffffff'
    },

    truncateText(text, maxWidth, fontSize) {
      // Phase 3: Truncate text with ellipsis if it exceeds maxWidth
      // Rough estimate: character width is ~0.6 * fontSize
      const charWidth = fontSize * 0.6
      const maxChars = Math.floor(maxWidth / charWidth)

      if (text.length <= maxChars) {
        return text
      }

      return text.substring(0, maxChars - 1) + '…'
    },

    createLabel(node, width, height) {
      // Thresholds for different label tiers
      const MIN_WIDTH = 60
      const MIN_HEIGHT = 30
      const COMPACT_WIDTH = 100
      const COMPACT_HEIGHT = 50
      const FULL_WIDTH = 150
      const FULL_HEIGHT = 80

      if (width < MIN_WIDTH || height < MIN_HEIGHT) {
        return null
      }

      // Phase 3: Get appropriate text color based on background
      const bgColor = this.getNodeColor(node)
      const textColor = this.getTextColor(bgColor)
      const shadowColor = textColor === '#ffffff' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'

      // Determine label tier
      const showMultiLine = width >= COMPACT_WIDTH && height >= COMPACT_HEIGHT && node.value
      const showLanguage = width >= FULL_WIDTH && height >= FULL_HEIGHT && node.data.language

      // Create group to hold multiple text elements
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      group.setAttribute('pointer-events', 'none')
      group.setAttribute('class', 'treemap-label')

      // Calculate center position
      const centerX = node.x0 + width / 2
      const padding = 8

      if (showLanguage) {
        // Three-line layout: filename + line count + language
        const lineHeight = 14
        const totalHeight = lineHeight * 3
        const startY = node.y0 + (height - totalHeight) / 2

        // Line 1: Filename (truncated)
        const nameLine = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        nameLine.setAttribute('x', centerX)
        nameLine.setAttribute('y', startY + lineHeight)
        nameLine.setAttribute('text-anchor', 'middle')
        nameLine.setAttribute('fill', textColor)
        nameLine.setAttribute('font-size', '12')
        nameLine.setAttribute('font-weight', '600')
        nameLine.style.textShadow = `0 1px 2px ${shadowColor}`
        nameLine.textContent = this.truncateText(node.data.name, width - padding * 2, 12)
        group.appendChild(nameLine)

        // Line 2: Line count
        const countLine = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        countLine.setAttribute('x', centerX)
        countLine.setAttribute('y', startY + lineHeight * 2)
        countLine.setAttribute('text-anchor', 'middle')
        countLine.setAttribute('fill', textColor)
        countLine.setAttribute('font-size', '10')
        countLine.setAttribute('opacity', '0.9')
        countLine.style.textShadow = `0 1px 2px ${shadowColor}`
        countLine.textContent = `${node.value.toLocaleString()} lines`
        group.appendChild(countLine)

        // Line 3: Language
        const langLine = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        langLine.setAttribute('x', centerX)
        langLine.setAttribute('y', startY + lineHeight * 3)
        langLine.setAttribute('text-anchor', 'middle')
        langLine.setAttribute('fill', textColor)
        langLine.setAttribute('font-size', '9')
        langLine.setAttribute('opacity', '0.7')
        langLine.style.textShadow = `0 1px 2px ${shadowColor}`
        langLine.textContent = node.data.language
        group.appendChild(langLine)

      } else if (showMultiLine) {
        // Two-line layout: filename + line count
        const lineHeight = 14
        const totalHeight = lineHeight * 2
        const startY = node.y0 + (height - totalHeight) / 2

        // Line 1: Filename (truncated)
        const nameLine = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        nameLine.setAttribute('x', centerX)
        nameLine.setAttribute('y', startY + lineHeight)
        nameLine.setAttribute('text-anchor', 'middle')
        nameLine.setAttribute('fill', textColor)
        nameLine.setAttribute('font-size', '12')
        nameLine.setAttribute('font-weight', '600')
        nameLine.style.textShadow = `0 1px 2px ${shadowColor}`
        nameLine.textContent = this.truncateText(node.data.name, width - padding * 2, 12)
        group.appendChild(nameLine)

        // Line 2: Line count
        const countLine = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        countLine.setAttribute('x', centerX)
        countLine.setAttribute('y', startY + lineHeight * 2)
        countLine.setAttribute('text-anchor', 'middle')
        countLine.setAttribute('fill', textColor)
        countLine.setAttribute('font-size', '10')
        countLine.setAttribute('opacity', '0.9')
        countLine.style.textShadow = `0 1px 2px ${shadowColor}`
        countLine.textContent = node.value.toLocaleString()
        group.appendChild(countLine)

      } else {
        // Single-line layout: filename only (Phase 1, with truncation)
        const centerY = node.y0 + height / 2
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', centerX)
        text.setAttribute('y', centerY)
        text.setAttribute('text-anchor', 'middle')
        text.setAttribute('dominant-baseline', 'middle')
        text.setAttribute('fill', textColor)
        text.setAttribute('font-size', '12')
        text.setAttribute('font-weight', '600')
        text.style.textShadow = `0 1px 2px ${shadowColor}`
        text.textContent = this.truncateText(node.data.name, width - padding * 2, 12)
        group.appendChild(text)
      }

      return group
    },

    render() {
      if (this.width === 0 || this.height === 0) return
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
        // Calculate cell dimensions
        const width = node.x1 - node.x0
        const height = node.y1 - node.y0

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rect.setAttribute('x', node.x0)
        rect.setAttribute('y', node.y0)
        rect.setAttribute('width', width)
        rect.setAttribute('height', height)
        rect.setAttribute('fill', this.getNodeColor(node))
        rect.setAttribute('stroke', '#1e1e1e')
        rect.setAttribute('stroke-width', '2')
        rect.style.cursor = 'pointer'

        // Add click handler - all nodes are clickable
        rect.addEventListener('click', () => {
          // Build path from current hierarchy root to this node
          const pathNodes = []
          let currentNode = node
          while (currentNode) {
            pathNodes.unshift(currentNode.data)
            currentNode = currentNode.parent
          }

          // Prepend ancestors from navigation stack (excluding current node which is the hierarchy root)
          const fullPath = this.navigationStack.length > 0
            ? [...this.navigationStack.slice(0, -1), ...pathNodes]
            : pathNodes

          this.$emit('drill-down', { node: node.data, path: fullPath })
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

        // Create and append label if cell is large enough
        const label = this.createLabel(node, width, height)
        if (label) {
          svg.appendChild(label)
        }
      })
    }
  }
}
</script>

<style scoped>
.treemap {
  width: 100%;
  height: 100%;
  display: block;
}

/* Phase 3: Fade-in animation for labels */
:deep(.treemap-label) {
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
