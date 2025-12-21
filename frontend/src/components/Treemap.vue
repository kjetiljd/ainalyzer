<template>
  <svg class="treemap" ref="svg"></svg>
</template>

<script>
import { hierarchy, treemap } from 'd3-hierarchy'
import { assignColors, OVERFLOW_COLOR, COLOR_MODES } from '../utils/colorUtils'
import { countLeafValues, findMaxInTree, aggregateTree } from '../composables/useTreeStats'

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
    showRepoBorders: {
      type: Boolean,
      default: true
    },
    colorMode: {
      type: String,
      default: 'depth'  // 'depth' | 'filetype' | 'activity' | 'contributors'
    },
    activityTimeframe: {
      type: String,
      default: '1year'  // '3months' | '1year'
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
    // Returns the commits field name based on selected timeframe
    commitsField() {
      return this.activityTimeframe === '3months' ? 'last_3_months' : 'last_year'
    },
    computedColorMap() {
      if (this.colorMode !== 'filetype') return null

      // Count languages across entire tree (use root data, not currentNode)
      const counts = countLeafValues(this.data, n => n.language)
      return assignColors(counts)
    },
    maxCommits() {
      if (this.colorMode !== 'activity') return 0
      const field = this.commitsField
      return findMaxInTree(this.data, n => n.commits?.[field] || 0)
    },
    maxDepth() {
      if (this.colorMode !== 'depth') return 0
      return findMaxInTree(this.data, (n, depth) => depth)
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
    showRepoBorders() {
      this.render()
    },
    colorMode() {
      this.render()
    },
    activityTimeframe() {
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
      // Directories use neutral gray
      if (node.data.children) {
        return '#4a4a4a'
      }

      const mode = COLOR_MODES[this.colorMode]

      // Filetype mode uses colorMap lookup
      if (this.colorMode === 'filetype') {
        return this.computedColorMap?.[node.data.language] || OVERFLOW_COLOR
      }

      // Contributors mode - takes single value (no max normalization needed)
      if (this.colorMode === 'contributors') {
        const count = node.data.contributors?.count ?? 0
        return mode.colorFn(count)
      }

      // Use registry colorFn with mode-specific value/max
      if (mode?.colorFn) {
        const depthOffset = this.navigationStack.length > 0 ? this.navigationStack.length - 1 : 0
        const value = this.colorMode === 'activity'
          ? (node.data.commits?.[this.commitsField] || 0)
          : (node.depth + depthOffset)
        const max = this.colorMode === 'activity' ? this.maxCommits : this.maxDepth
        return mode.colorFn(value, max)
      }

      return OVERFLOW_COLOR
    },

    countChanges(node) {
      const field = this.commitsField
      return aggregateTree(node, n => n.commits?.[field] || 0)
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
      const COMPACT_WIDTH = 80
      const COMPACT_HEIGHT = 40
      const FULL_WIDTH = 80
      const FULL_HEIGHT = 60

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
      const hasCommits = node.data.commits && node.data.commits[this.commitsField] !== undefined

      // Create group to hold multiple text elements
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      group.setAttribute('pointer-events', 'none')
      group.setAttribute('class', 'treemap-label')

      // Calculate center position
      const centerX = node.x0 + width / 2
      const padding = 8

      if (showLanguage) {
        // Three-line layout: filename + line count + (language or commits)
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

        // Line 3: Commits (always shown if available, else language)
        const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        line3.setAttribute('x', centerX)
        line3.setAttribute('y', startY + lineHeight * 3)
        line3.setAttribute('text-anchor', 'middle')
        line3.setAttribute('fill', textColor)
        line3.setAttribute('font-size', '9')
        line3.setAttribute('opacity', '0.7')
        line3.style.textShadow = `0 1px 2px ${shadowColor}`
        if (hasCommits) {
          const commits = node.data.commits[this.commitsField]
          line3.textContent = `${commits} change${commits !== 1 ? 's' : ''}`
        } else {
          line3.textContent = node.data.language
        }
        group.appendChild(line3)

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
      // Exception: add padding around repo nodes if showRepoBorders is enabled
      const useCushionPadding = this.cushionMode && this.hideFolderBorders
      const layout = treemap()
        .size([this.width, this.height])

      if (useCushionPadding) {
        if (this.showRepoBorders) {
          // Per-node padding: only add padding inside repository nodes
          const repoPadding = node => node.data.type === 'repository' ? 4 : 0
          layout
            .paddingOuter(0)
            .paddingTop(repoPadding)
            .paddingBottom(repoPadding)
            .paddingLeft(repoPadding)
            .paddingRight(repoPadding)
        } else {
          // No padding - cells tile perfectly, cushion shading provides separation
          layout.padding(0)
        }
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
        const isRepoRoot = node.data.type === 'repository'

        // In cushion mode with hidden borders, skip rendering parent nodes (directories)
        // Only render leaf nodes - the cushion shading provides visual hierarchy
        // Exception: render repo roots if showRepoBorders is enabled (per-node padding creates space for border)
        if (this.cushionMode && this.hideFolderBorders && isFolder) {
          if (!(isRepoRoot && this.showRepoBorders)) {
            return // Skip directory rectangles
          }
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

        // In cushion mode with hidden folder borders, repo roots rendered for border only need transparent fill
        const isRepoBorderOnly = this.cushionMode && this.hideFolderBorders && isRepoRoot && this.showRepoBorders
        rect.setAttribute('fill', isRepoBorderOnly ? 'none' : fillValue)

        // Determine stroke based on node type and settings
        const shouldHideBorder = this.cushionMode && this.hideFolderBorders && isFolder

        // Repository border color depends on color scheme for good contrast
        const REPO_BORDER_COLOR = COLOR_MODES[this.colorMode]?.borderColor || '#e67e22'

        let strokeColor = '#1e1e1e'
        let strokeWidth = this.cushionMode ? '0.5' : '2'

        if (shouldHideBorder && !(isRepoRoot && this.showRepoBorders)) {
          strokeColor = 'none'
          strokeWidth = '0'
        } else if (isRepoRoot && this.showRepoBorders) {
          strokeColor = REPO_BORDER_COLOR
          strokeWidth = '2'
        }

        rect.setAttribute('stroke', strokeColor)
        rect.setAttribute('stroke-width', strokeWidth)
        rect.style.cursor = 'pointer'

        // Add tooltip for contributor names (if available)
        const contributors = node.data.contributors
        if (contributors?.names?.length > 0) {
          const names = contributors.names.join(', ')
          const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
          title.textContent = `${node.data.name}\n\nContributors: ${names}`
          rect.appendChild(title)
        }

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

          // Build stats string
          const parts = []
          const isRepo = node.data.type === 'repository'
          if (isRepo) {
            parts.push('repo')
          }
          if (node.value) {
            parts.push(`${node.value.toLocaleString()} lines`)
          }
          // For files, show commits directly; for directories, aggregate
          const changes = node.data.children
            ? this.countChanges(node.data)
            : (node.data.commits?.[this.commitsField] || 0)
          if (changes === 0) {
            parts.push('no file changes')
          } else {
            parts.push(`${changes.toLocaleString()} file change${changes !== 1 ? 's' : ''}`)
          }
          // Show contributor count for files (backwards compatible)
          const contributorCount = node.data.contributors?.count
          if (contributorCount !== undefined) {
            parts.push(`${contributorCount} contributor${contributorCount !== 1 ? 's' : ''}`)
          }
          const stats = parts.length > 0 ? ` (${parts.join(', ')})` : ''

          this.$emit('hover', {
            text: fullPath + stats,
            isRepo: node.data.type === 'repository'
          })
        })

        rect.addEventListener('mouseleave', () => {
          this.$emit('hover-end')
        })

        // Add context menu handler for exclusion
        rect.addEventListener('contextmenu', (event) => {
          event.preventDefault()
          event.stopPropagation()
          this.$emit('node-contextmenu', {
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
