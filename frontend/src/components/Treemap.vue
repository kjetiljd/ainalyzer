<template>
  <svg class="treemap" ref="svg"></svg>
</template>

<script>
import { hierarchy, treemap } from 'd3-hierarchy'
import { assignColors, OVERFLOW_COLOR } from '../utils/colorUtils'

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
    },
    cushionMode: {
      type: Boolean,
      default: false
    },
    hideFolderBorders: {
      type: Boolean,
      default: true
    },
    colorMode: {
      type: String,
      default: 'depth'  // 'depth' | 'filetype'
    }
  },
  data() {
    return {
      width: 0,
      height: 0,
      resizeObserver: null,
      colorMap: null
    }
  },
  computed: {
    computedColorMap() {
      if (this.colorMode !== 'filetype') return null

      // Count languages across entire tree (use root data, not currentNode)
      const counts = {}
      const countLanguages = (node) => {
        if (!node.children && node.language) {
          counts[node.language] = (counts[node.language] || 0) + 1
        }
        if (node.children) {
          node.children.forEach(countLanguages)
        }
      }
      countLanguages(this.data)

      return assignColors(counts)
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
    },
    cushionMode() {
      this.render()
    },
    hideFolderBorders() {
      this.render()
    },
    colorMode() {
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

      // If colorMode is filetype, use the computed colorMap
      if (this.colorMode === 'filetype' && this.computedColorMap) {
        return this.computedColorMap[node.data.language] || OVERFLOW_COLOR
      }

      // Default: color by absolute depth from original root using ColorBrewer Set2
      // navigationStack length gives depth offset from drill-down navigation
      const depthOffset = this.navigationStack.length > 0 ? this.navigationStack.length - 1 : 0
      const absoluteDepth = node.depth + depthOffset

      // ColorBrewer Set2 palette
      const fileColors = ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f']
      return fileColors[absoluteDepth % fileColors.length]
    },

    hexToRgb(hex) {
      const h = hex.replace('#', '')
      return {
        r: parseInt(h.substr(0, 2), 16),
        g: parseInt(h.substr(2, 2), 16),
        b: parseInt(h.substr(4, 2), 16)
      }
    },

    getTextColor(bgColor) {
      // Phase 3: Calculate text color based on background for contrast
      const { r, g, b } = this.hexToRgb(bgColor)

      // Calculate relative luminance (WCAG formula)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

      // Return black for light backgrounds, white for dark backgrounds
      return luminance > 0.5 ? '#000000' : '#ffffff'
    },

    getCushionColors(baseColor) {
      const { r, g, b } = this.hexToRgb(baseColor)
      const lighter = `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`
      const darker = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`
      return { lighter, darker }
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
      // In cushion mode with hidden borders, remove all padding since shading provides separation
      const useCushionPadding = this.cushionMode && this.hideFolderBorders
      const layout = treemap()
        .size([this.width, this.height])

      if (useCushionPadding) {
        // No padding - cells tile perfectly, cushion shading provides separation
        layout.padding(0)
      } else {
        // Standard padding for bordered mode
        layout.paddingOuter(3).paddingInner(1)
      }

      layout(root)

      // Create defs element for gradients if in cushion mode
      const gradientMap = new Map()
      let defs = null
      if (this.cushionMode) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
        svg.appendChild(defs)
      }

      // Render rectangles
      const nodes = root.descendants()

      nodes.forEach(node => {
        // Calculate cell dimensions
        const width = node.x1 - node.x0
        const height = node.y1 - node.y0
        const isFolder = node.data.children && node.data.children.length > 0

        // In cushion mode with hidden borders, skip rendering parent nodes (directories)
        // Only render leaf nodes - the cushion shading provides visual hierarchy
        if (this.cushionMode && this.hideFolderBorders && isFolder) {
          return // Skip directory rectangles
        }

        const baseColor = this.getNodeColor(node)
        let fillValue = baseColor

        // Create gradient for cushion mode
        if (this.cushionMode) {
          if (!gradientMap.has(baseColor)) {
            const gradientId = `cushion-${baseColor.replace('#', '')}`
            const { lighter, darker } = this.getCushionColors(baseColor)

            const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient')
            gradient.setAttribute('id', gradientId)
            gradient.setAttribute('cx', '50%')
            gradient.setAttribute('cy', '50%')
            gradient.setAttribute('r', '70%')

            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
            stop1.setAttribute('offset', '0%')
            stop1.setAttribute('stop-color', lighter)

            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
            stop2.setAttribute('offset', '100%')
            stop2.setAttribute('stop-color', darker)

            gradient.appendChild(stop1)
            gradient.appendChild(stop2)
            defs.appendChild(gradient)

            gradientMap.set(baseColor, gradientId)
          }
          fillValue = `url(#${gradientMap.get(baseColor)})`
        }

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rect.setAttribute('x', node.x0)
        rect.setAttribute('y', node.y0)
        rect.setAttribute('width', width)
        rect.setAttribute('height', height)
        rect.setAttribute('fill', fillValue)
        // Determine stroke based on cushion mode and folder border settings
        // Note: isFolder already defined above for early return check
        const shouldHideBorder = this.cushionMode && this.hideFolderBorders && isFolder

        rect.setAttribute('stroke', shouldHideBorder ? 'none' : '#1e1e1e')
        rect.setAttribute('stroke-width', shouldHideBorder ? '0' : (this.cushionMode ? '0.5' : '2'))
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

        // Add context menu handler for exclusion
        rect.addEventListener('contextmenu', (event) => {
          event.preventDefault()
          this.$emit('contextmenu', {
            node: node.data,
            x: event.clientX,
            y: event.clientY
          })
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
