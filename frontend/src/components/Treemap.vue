<template>
  <svg class="treemap" ref="svg"></svg>
</template>

<script>
import { hierarchy, treemap } from 'd3-hierarchy'
import { assignColors, OVERFLOW_COLOR, COLOR_MODES } from '../utils/colorUtils'
import { countLeafValues, extentInTree, aggregateTree } from '../composables/useTreeStats'

const DIRECTORY_COLOR = '#4a4a4a'

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
      default: 'depth'  // 'depth' | 'filetype' | 'activity' | 'contributors' | 'growth'
    },
    activityTimeframe: {
      type: String,
      default: '1year'  // '3months' | '1year'
    },
    coupling: {
      type: Object,
      default: null  // { threshold: 3, pairs: [{files: ['a.py', 'b.py'], count: 5}, ...] }
    },
    showCouplingHighlights: {
      type: Boolean,
      default: false
    },
    showRepoView: {
      type: Boolean,
      default: false
    },
    expandedRepoPath: {
      type: String,
      default: null  // Path of repo that should show contents instead of single tile
    }
  },
  data() {
    return {
      width: 0,
      height: 0,
      resizeObserver: null,
      colorMap: null,
      hoveredFilePath: null  // Track which file is being hovered for coupling highlight
    }
  },
  computed: {
    // Returns the commits field name based on selected timeframe
    commitsField() {
      return this.activityTimeframe === '3months' ? 'last_3_months' : 'last_year'
    },
    // Returns the growth (net lines) field name based on selected timeframe
    growthField() {
      return this.activityTimeframe === '3months' ? 'last_3_months' : 'last_year'
    },
    // Active color-mode descriptor (generic dispatch source for getNodeColor)
    colorModeDescriptor() {
      return COLOR_MODES[this.colorMode] || null
    },
    // Shared context passed to a descriptor's value accessors
    colorContext() {
      const depthOffset = this.navigationStack.length > 0 ? this.navigationStack.length - 1 : 0
      const mode = this.colorModeDescriptor
      const field = mode?.fieldFor ? mode.fieldFor(this.activityTimeframe) : null
      return { depthOffset, field }
    },
    computedColorMap() {
      if (this.colorMode !== 'filetype') return null

      // Count languages across entire tree (use root data, not currentNode)
      const counts = countLeafValues(this.data, n => n.language)
      return assignColors(counts)
    },
    // Generic normalization max derived from the descriptor's normalize strategy.
    // Replaces the per-mode maxCommits/maxDepth with one extent pass (G2).
    colorMax() {
      const mode = this.colorModeDescriptor
      if (!mode || mode.type === 'categorical' || mode.normalize === 'none') return 0
      const ctx = this.colorContext
      const ext = extentInTree(this.data, (n, depth) => mode.treeValue(n, depth, ctx))
      if (mode.normalize === 'symmetric') {
        return Math.max(Math.abs(ext.min), Math.abs(ext.max))
      }
      return ext.max
    },
    // Build coupling lookup: filePath → [{path, count}, ...]
    couplingMap() {
      if (!this.coupling?.pairs) return new Map()
      const map = new Map()
      for (const pair of this.coupling.pairs) {
        const [fileA, fileB] = pair.files
        // Add bidirectional entries
        if (!map.has(fileA)) map.set(fileA, [])
        if (!map.has(fileB)) map.set(fileB, [])
        map.get(fileA).push({ path: fileB, count: pair.count })
        map.get(fileB).push({ path: fileA, count: pair.count })
      }
      return map
    },
    // Whether to show folder/repo aggregation view
    // Active at root (show repo tiles) or inside a repo (show that repo as single tile)
    isRepoViewActive() {
      if (!this.showRepoView) return false
      // At root (no current node or nav stack has only root)
      const atRoot = !this.currentNode || this.navigationStack.length <= 1
      if (atRoot) return true
      // Inside a repo (current node is a repository) - show it as single tile
      // Unless this repo has been "expanded" to show its contents
      if (this.currentNode?.type === 'repository') {
        if (this.expandedRepoPath && this.currentNode.path === this.expandedRepoPath) {
          return false  // Show repo contents, not single tile
        }
        return true
      }
      return false
    },
    // Whether we're inside a single repo (not at root)
    isInsideRepo() {
      return this.currentNode?.type === 'repository'
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
    },
    showRepoView() {
      this.render()
    },
    expandedRepoPath() {
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
      const mode = this.colorModeDescriptor
      const isDirectory = !!node.data.children

      // Categorical modes (filetype) color leaves via a language colorMap.
      if (mode?.type === 'categorical') {
        if (isDirectory) return DIRECTORY_COLOR
        return this.computedColorMap?.[node.data.language] || OVERFLOW_COLOR
      }

      // Directories are neutral gray unless the mode colors them by rollup (growth).
      if (isDirectory) {
        if (!mode?.colorDirectories || !mode.colorFn) return DIRECTORY_COLOR
        const ctx = this.colorContext
        const rollup = aggregateTree(node.data, n => mode.dirLeafValue(n, ctx))
        return mode.colorFn(rollup, this.colorMax)
      }

      // Leaves: generic registry dispatch over the descriptor.
      if (mode?.colorFn) {
        const value = mode.scalarValue(node, this.colorContext)
        return mode.colorFn(value, this.colorMax)
      }

      return OVERFLOW_COLOR
    },

    countChanges(node) {
      const field = this.commitsField
      return aggregateTree(node, n => n.commits?.[field] || 0)
    },

    // Highlight files that are coupled to the given file path
    highlightCoupledFiles(filePath, hoveredRect) {
      const svg = this.$refs.svg
      if (!svg) return

      // Use the current color mode's border color for coupling highlights
      const highlightColor = COLOR_MODES[this.colorMode]?.borderColor || '#ffffff'

      // Create overlay group for highlight strokes (renders on top of everything)
      const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      overlay.setAttribute('class', 'coupling-overlay')
      svg.appendChild(overlay)

      // Helper to create highlight rect in overlay
      const addHighlightRect = (sourceRect) => {
        const highlightRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        highlightRect.setAttribute('x', sourceRect.getAttribute('x'))
        highlightRect.setAttribute('y', sourceRect.getAttribute('y'))
        highlightRect.setAttribute('width', sourceRect.getAttribute('width'))
        highlightRect.setAttribute('height', sourceRect.getAttribute('height'))
        highlightRect.setAttribute('fill', 'none')
        highlightRect.setAttribute('stroke', highlightColor)
        highlightRect.setAttribute('stroke-width', '3')
        highlightRect.setAttribute('pointer-events', 'none')
        highlightRect.style.filter = `drop-shadow(0 0 4px ${highlightColor})`
        overlay.appendChild(highlightRect)
      }

      // Highlight the hovered file itself
      if (hoveredRect) {
        addHighlightRect(hoveredRect)
      }

      const coupledFiles = this.couplingMap.get(filePath)
      if (!coupledFiles || coupledFiles.length === 0) return

      // Create a Set of coupled paths for fast lookup
      const coupledPaths = new Set(coupledFiles.map(f => f.path))

      // Find and highlight coupled file rects
      svg.querySelectorAll('rect[data-file-path]').forEach(rect => {
        const rectPath = rect.getAttribute('data-file-path')
        if (coupledPaths.has(rectPath)) {
          addHighlightRect(rect)
        }
      })
    },

    // Remove coupling highlights
    clearCouplingHighlights() {
      const svg = this.$refs.svg
      if (!svg) return

      const overlay = svg.querySelector('.coupling-overlay')
      if (overlay) {
        overlay.remove()
      }
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
        if (this.colorMode === 'growth') {
          const net = node.data.growth?.[this.growthField] || 0
          line3.textContent = `${net > 0 ? '+' : ''}${net.toLocaleString()} net`
        } else if (hasCommits) {
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

    // Count files in a tree node recursively
    countFiles(node) {
      if (!node.children) return node.type === 'file' ? 1 : 0
      return node.children.reduce((sum, child) => sum + this.countFiles(child), 0)
    },

    // Get aggregated commits for a node
    getAggregatedCommits(node) {
      const field = this.commitsField
      return aggregateTree(node, n => n.commits?.[field] || 0)
    },

    // Collect unique contributors with their commit counts across a repo subtree
    getRepoContributors(node) {
      const counts = {}
      function walk(n) {
        if (!n) return
        if (!n.children) {
          if (n.contributors?.names) {
            for (const name of n.contributors.names) {
              counts[name] = (counts[name] || 0) + 1
            }
          }
          return
        }
        n.children.forEach(walk)
      }
      walk(node)
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, files]) => `${name} (${files})`)
    },

    // Create label for repo tiles (adaptive based on size)
    createRepoLabel(node, width, height) {
      // Thresholds for repo labels (slightly larger since we show more info)
      const MIN_WIDTH = 60
      const MIN_HEIGHT = 30
      const MEDIUM_WIDTH = 100
      const MEDIUM_HEIGHT = 50
      const LARGE_WIDTH = 120
      const LARGE_HEIGHT = 80

      if (width < MIN_WIDTH || height < MIN_HEIGHT) {
        return null
      }

      // Get text color based on background (use activity color for repo tiles)
      const bgColor = this.getRepoColor(node)
      const textColor = this.getTextColor(bgColor)
      const shadowColor = textColor === '#ffffff' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      group.setAttribute('pointer-events', 'none')
      group.setAttribute('class', 'treemap-label')

      const centerX = node.x0 + width / 2
      const padding = 8

      // Aggregate stats for this repo (use original children since they were stripped for D3)
      const totalLines = node.value
      const originalData = node.data._originalChildren
        ? { ...node.data, children: node.data._originalChildren }
        : node.data
      const totalFiles = this.countFiles(originalData)
      const totalCommits = this.getAggregatedCommits(originalData)
      const totalNet = aggregateTree(originalData, n => n.growth?.[this.growthField] || 0)

      const isLarge = width >= LARGE_WIDTH && height >= LARGE_HEIGHT
      const isMedium = width >= MEDIUM_WIDTH && height >= MEDIUM_HEIGHT

      if (isLarge) {
        // Four-line layout: name + lines + files + commits
        const lineHeight = 14
        const totalHeight = lineHeight * 4
        const startY = node.y0 + (height - totalHeight) / 2

        // Line 1: Repo name
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

        // Line 2: Lines count
        const linesLine = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        linesLine.setAttribute('x', centerX)
        linesLine.setAttribute('y', startY + lineHeight * 2)
        linesLine.setAttribute('text-anchor', 'middle')
        linesLine.setAttribute('fill', textColor)
        linesLine.setAttribute('font-size', '10')
        linesLine.setAttribute('opacity', '0.9')
        linesLine.style.textShadow = `0 1px 2px ${shadowColor}`
        linesLine.textContent = `${totalLines.toLocaleString()} lines`
        group.appendChild(linesLine)

        // Line 3: Files count
        const filesLine = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        filesLine.setAttribute('x', centerX)
        filesLine.setAttribute('y', startY + lineHeight * 3)
        filesLine.setAttribute('text-anchor', 'middle')
        filesLine.setAttribute('fill', textColor)
        filesLine.setAttribute('font-size', '10')
        filesLine.setAttribute('opacity', '0.9')
        filesLine.style.textShadow = `0 1px 2px ${shadowColor}`
        filesLine.textContent = `${totalFiles.toLocaleString()} files`
        group.appendChild(filesLine)

        // Line 4: net growth (growth mode) or change count
        const commitsLine = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        commitsLine.setAttribute('x', centerX)
        commitsLine.setAttribute('y', startY + lineHeight * 4)
        commitsLine.setAttribute('text-anchor', 'middle')
        commitsLine.setAttribute('fill', textColor)
        commitsLine.setAttribute('font-size', '9')
        commitsLine.setAttribute('opacity', '0.7')
        commitsLine.style.textShadow = `0 1px 2px ${shadowColor}`
        commitsLine.textContent = this.colorMode === 'growth'
          ? `${totalNet > 0 ? '+' : ''}${totalNet.toLocaleString()} net`
          : `${totalCommits} change${totalCommits !== 1 ? 's' : ''}`
        group.appendChild(commitsLine)

      } else if (isMedium) {
        // Two-line layout: name + lines
        const lineHeight = 14
        const totalHeight = lineHeight * 2
        const startY = node.y0 + (height - totalHeight) / 2

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

        const linesLine = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        linesLine.setAttribute('x', centerX)
        linesLine.setAttribute('y', startY + lineHeight * 2)
        linesLine.setAttribute('text-anchor', 'middle')
        linesLine.setAttribute('fill', textColor)
        linesLine.setAttribute('font-size', '10')
        linesLine.setAttribute('opacity', '0.9')
        linesLine.style.textShadow = `0 1px 2px ${shadowColor}`
        linesLine.textContent = `${totalLines.toLocaleString()} lines`
        group.appendChild(linesLine)

      } else {
        // Single-line layout: name only
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

    // Get color for a repo tile by aggregating the active mode's metric over the
    // whole repo, normalized against sibling repos. Generic dispatch over the
    // color-mode descriptor so repo view honors growth (and any future windowed
    // mode), not just activity.
    getRepoColor(node) {
      const mode = this.colorModeDescriptor
      const ctx = this.colorContext
      // Modes without an additive per-leaf metric (filetype, depth, contributors)
      // can't meaningfully color a whole-repo tile — fall back to a neutral tone.
      if (!mode || !mode.colorFn || !mode.dirLeafValue) return DIRECTORY_COLOR

      // Use original children since they were stripped for D3
      const originalData = node.data._originalChildren
        ? { ...node.data, children: node.data._originalChildren }
        : node.data
      const repoValue = aggregateTree(originalData, n => mode.dirLeafValue(n, ctx))
      return mode.colorFn(repoValue, this.repoColorMax(mode, ctx))
    },

    // Normalization max for repo tiles: extent of per-repo aggregates across sibling
    // repositories, reduced per the descriptor's normalize strategy (symmetric for
    // growth, plain max for activity). Matches how colorMax normalizes leaf colors.
    repoColorMax(mode, ctx) {
      if (mode.normalize === 'none') return 0
      const sourceNode = this.currentNode || this.data
      let min = 0
      let max = 0
      if (sourceNode?.children) {
        for (const child of sourceNode.children) {
          if (child.type === 'repository') {
            const v = aggregateTree(child, n => mode.dirLeafValue(n, ctx))
            if (v < min) min = v
            if (v > max) max = v
          }
        }
      }
      return mode.normalize === 'symmetric' ? Math.max(Math.abs(min), Math.abs(max)) : max
    },

    render() {
      if (this.width === 0 || this.height === 0) return
      const svg = this.$refs.svg
      if (!svg) return

      // Clear previous rendering
      svg.innerHTML = ''

      // Use currentNode if provided, otherwise use data
      const nodeToRender = this.currentNode || this.data

      // For repo view, create a simplified tree
      let dataForHierarchy = nodeToRender
      if (this.isRepoViewActive) {
        if (this.isInsideRepo) {
          // Inside a repo: show the repo itself as a single tile
          // Create a wrapper with the repo as the only child (as a leaf)
          const repoAsLeaf = {
            ...nodeToRender,
            children: undefined,
            _originalChildren: nodeToRender.children,
            _originalData: nodeToRender,
            value: aggregateTree(nodeToRender, n => n.value || 0)
          }
          dataForHierarchy = {
            name: '_wrapper',
            type: 'wrapper',
            children: [repoAsLeaf]
          }
        } else if (nodeToRender.children) {
          // At root: show repos as tiles
          const aggregatedChildren = nodeToRender.children
            .filter(child => child.type === 'repository')
            .map(child => ({
              ...child,
              children: undefined,
              _originalChildren: child.children,
              _originalData: child,
              value: aggregateTree(child, n => n.value || 0)
            }))

          dataForHierarchy = {
            ...nodeToRender,
            children: aggregatedChildren
          }
        }
      }

      // Create hierarchy
      const root = hierarchy(dataForHierarchy)
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

        // In repo view mode, handle repo tiles specially
        if (this.isRepoViewActive) {
          // Skip the root node itself
          if (node.depth === 0) return

          // Render repo tile
          const baseColor = this.getRepoColor(node)
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
          rect.setAttribute('stroke', COLOR_MODES[this.colorMode]?.borderColor || COLOR_MODES['activity'].borderColor)
          rect.setAttribute('stroke-width', '2')
          rect.style.cursor = 'pointer'

          // Click handler - drill into the repo
          rect.addEventListener('click', () => {
            // Get original data with children restored
            const originalData = node.data._originalData || node.data

            if (this.isInsideRepo) {
              // Already inside repo (single tile view) - expand to show contents
              this.$emit('expand-repo', originalData.path)
            } else {
              // At root - navigate into the repo (will show as single tile)
              const pathNodes = [this.data, originalData]
              this.$emit('drill-down', { node: originalData, path: pathNodes })
            }
          })

          // Hover handler - show aggregated stats
          rect.addEventListener('mouseenter', () => {
            const originalData = node.data._originalChildren
              ? { ...node.data, children: node.data._originalChildren }
              : node.data
            const totalLines = node.value
            const totalFiles = this.countFiles(originalData)
            const totalCommits = this.getAggregatedCommits(originalData)

            const parts = ['repo']
            parts.push(`${totalLines.toLocaleString()} lines`)
            parts.push(`${totalFiles.toLocaleString()} files`)
            if (totalCommits === 0) {
              parts.push('no file changes')
            } else {
              parts.push(`${totalCommits.toLocaleString()} file change${totalCommits !== 1 ? 's' : ''}`)
            }

            this.$emit('hover', {
              text: `${node.data.name} (${parts.join(', ')})`,
              isRepo: true
            })
          })

          rect.addEventListener('mouseleave', () => {
            this.$emit('hover-end')
          })

          // Add tooltip with contributor breakdown
          const repoData = node.data._originalChildren
            ? { ...node.data, children: node.data._originalChildren }
            : node.data
          const contributors = this.getRepoContributors(repoData)
          if (contributors.length > 0) {
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
            title.textContent = `${node.data.name}\n\nContributors (files touched):\n${contributors.join('\n')}`
            rect.appendChild(title)
          }

          svg.appendChild(rect)

          // Create repo-specific label
          const label = this.createRepoLabel(node, width, height)
          if (label) {
            svg.appendChild(label)
          }

          return // Skip normal rendering for repo view tiles
        }

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

        // Add data-file-path for coupling highlight lookup (files only)
        if (node.data.type === 'file' && node.data.path) {
          rect.setAttribute('data-file-path', node.data.path)
        }

        // Add tooltip with contributor names and coupled files
        const tooltipParts = [node.data.name]
        const contributors = node.data.contributors
        if (contributors?.names?.length > 0) {
          tooltipParts.push('')
          tooltipParts.push(`Contributors: ${contributors.names.join(', ')}`)
        }
        // Add coupled files info for file nodes
        if (node.data.type === 'file' && node.data.path) {
          const coupledFiles = this.couplingMap.get(node.data.path)
          if (coupledFiles && coupledFiles.length > 0) {
            tooltipParts.push('')
            tooltipParts.push('Changes with:')
            // Sort by count descending, show top 10
            const sorted = [...coupledFiles].sort((a, b) => b.count - a.count).slice(0, 10)
            for (const cf of sorted) {
              const filename = cf.path.split('/').pop()
              tooltipParts.push(`  ${filename} (${cf.count}x)`)
            }
            if (coupledFiles.length > 10) {
              tooltipParts.push(`  ...and ${coupledFiles.length - 10} more`)
            }
          }
        }
        if (tooltipParts.length > 1) {
          const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
          title.textContent = tooltipParts.join('\n')
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
          // In growth mode, surface the honest +added/-deleted/=net for the window
          if (this.colorMode === 'growth') {
            const suffix = this.activityTimeframe === '3months' ? '3m' : '1y'
            let added, deleted
            if (node.data.children) {
              added = aggregateTree(node.data, n => n.growth?.[`added_${suffix}`] || 0)
              deleted = aggregateTree(node.data, n => n.growth?.[`deleted_${suffix}`] || 0)
            } else {
              added = node.data.growth?.[`added_${suffix}`] || 0
              deleted = node.data.growth?.[`deleted_${suffix}`] || 0
            }
            const net = added - deleted
            const sign = net >= 0 ? '+' : ''
            parts.push(`+${added.toLocaleString()} / -${deleted.toLocaleString()} = ${sign}${net.toLocaleString()} net`)
          }
          const stats = parts.length > 0 ? ` (${parts.join(', ')})` : ''

          this.$emit('hover', {
            text: fullPath + stats,
            isRepo: node.data.type === 'repository'
          })

          // Highlight coupled files if enabled and this is a file node
          if (this.showCouplingHighlights && node.data.type === 'file' && node.data.path) {
            this.highlightCoupledFiles(node.data.path, rect)
          }
        })

        rect.addEventListener('mouseleave', () => {
          this.$emit('hover-end')
          if (this.showCouplingHighlights) {
            this.clearCouplingHighlights()
          }
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

/* Coupling highlight - files that change together
   Color is set dynamically via inline style based on color mode's borderColor */
:deep(.coupling-highlight) {
  stroke-width: 3px !important;
  filter: drop-shadow(0 0 4px currentColor);
}
</style>
