// Color utilities for file type coloring
// Based on ggthemes Classic_20 extended to 60 colors via tiered approach

// Classic_20 original colors (before saturation adjustment)
const CLASSIC_20_ORIGINAL = [
  '#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c',
  '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5',
  '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f',
  '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'
]

// HSL conversion utilities
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function reduceSaturation(hex, factor) {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex(h, s * factor, l)
}

// Generate tier 0: muted darks (70% sat), original lights
const CLASSIC_20 = CLASSIC_20_ORIGINAL.map((color, i) => {
  // Even indices are dark variants - reduce saturation
  // Odd indices are light variants - keep as-is
  return i % 2 === 0 ? reduceSaturation(color, 0.7) : color
})

// 10 base hues with HSV parameters (for generating tiers 1 and 2)
const BASE_HUES = [
  { h: 205, darkS: 83, darkV: 71, lightS: 25, lightV: 91 },  // Blue
  { h: 28,  darkS: 95, darkV: 100, lightS: 53, lightV: 100 }, // Orange
  { h: 120, darkS: 72, darkV: 63, lightS: 38, lightV: 87 },  // Green
  { h: 360, darkS: 82, darkV: 84, lightS: 41, lightV: 100 }, // Red
  { h: 271, darkS: 46, darkV: 74, lightS: 17, lightV: 84 },  // Purple
  { h: 10,  darkS: 46, darkV: 55, lightS: 24, lightV: 77 },  // Brown
  { h: 318, darkS: 48, darkV: 89, lightS: 26, lightV: 97 },  // Pink
  { h: 0,   darkS: 0,  darkV: 50, lightS: 0,  lightV: 78 },  // Gray
  { h: 60,  darkS: 82, darkV: 74, lightS: 36, lightV: 86 },  // Yellow
  { h: 186, darkS: 89, darkV: 81, lightS: 31, lightV: 90 }   // Cyan
]

function hsvToHex(h, s, v) {
  s /= 100
  v /= 100
  const c = v * s
  const hh = ((h % 360) / 60)
  const x = c * (1 - Math.abs(hh % 2 - 1))
  const m = v - c
  let r, g, b
  if (hh < 1) { r = c; g = x; b = 0 }
  else if (hh < 2) { r = x; g = c; b = 0 }
  else if (hh < 3) { r = 0; g = c; b = x }
  else if (hh < 4) { r = 0; g = x; b = c }
  else if (hh < 5) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return '#' + [r, g, b].map(v =>
    Math.round((v + m) * 255).toString(16).padStart(2, '0')
  ).join('')
}

function generateTier(base, tier) {
  let darkS, darkV, lightS, lightV

  if (tier === 0) {
    // Original Classic_20
    darkS = base.darkS
    darkV = base.darkV
    lightS = base.lightS
    lightV = base.lightV
  } else if (tier === 1) {
    // Darker/Lighter
    darkS = Math.min(100, base.darkS + 10)
    darkV = Math.max(30, base.darkV - 20)
    lightS = Math.max(10, base.lightS - 12)
    lightV = Math.min(98, base.lightV + 6)
  } else {
    // Darkest/Pastel
    darkS = Math.min(100, base.darkS + 5)
    darkV = Math.max(20, base.darkV - 35)
    lightS = Math.max(5, base.lightS - 18)
    lightV = Math.min(100, base.lightV + 10)
  }

  return {
    dark: hsvToHex(base.h, darkS, darkV),
    light: hsvToHex(base.h, lightS, lightV)
  }
}

function generatePalette() {
  const palette = []
  // 60 colors: 10 hues × 3 tiers × 2 variants (dark/light)
  // Structure: [Blue-dark, Blue-light, Orange-dark, Orange-light, ...] for tier 0
  //            then tier 1, then tier 2

  // Tier 0: Use exact Classic_20 colors
  palette.push(...CLASSIC_20)

  // Tiers 1 and 2: Generate darker/lighter variants
  for (let tier = 1; tier < 3; tier++) {
    for (const base of BASE_HUES) {
      const { dark, light } = generateTier(base, tier)
      palette.push(dark, light)
    }
  }
  return palette
}

export const PALETTE_60 = generatePalette()
export const OVERFLOW_COLOR = '#6f6f6f'  // Distinct from Classic_20 gray (#7f7f7f)

// Activity palette: Viridis (perceptually uniform, colorblind-safe)
// Dark purple/blue = stable (no recent changes), Yellow = hot (many changes)
// 9-step viridis for good differentiation
export const ACTIVITY_PALETTE = [
  '#440154',  // Dark purple (0 commits - most stable)
  '#482878',  // Purple
  '#3e4a89',  // Blue-purple
  '#31688e',  // Blue
  '#26838f',  // Teal
  '#1f9e89',  // Green-teal
  '#35b779',  // Green
  '#6ece58',  // Light green
  '#fde725'   // Yellow (highest activity - hot)
]

// Depth palette: ColorBrewer YlOrBr (Yellow-Orange-Brown) - inverted
// Shallow (root) = dark brown, Deep (leaves) = bright yellow
// Dark trunk, lighter leaves - tree metaphor
export const DEPTH_PALETTE = [
  '#662506',  // Dark brown (root/shallow)
  '#993404',  // Brown
  '#cc4c02',  // Burnt orange
  '#ec7014',  // Dark orange
  '#fe9929',  // Orange
  '#fec44f',  // Gold
  '#fee391',  // Yellow
  '#fff7bc',  // Light yellow
  '#ffffe5'   // Pale yellow (deepest/leaves)
]

/**
 * Get color for a file based on its commit activity.
 * @param {number} commits - Number of commits in the time period
 * @param {number} maxCommits - Maximum commits across all files (for normalization)
 * @returns {string} Hex color
 */
export function getActivityColor(commits, maxCommits) {
  // No commits or missing data = darkest (most stable) - bucket 0
  if (commits === undefined || commits === null || commits === 0) {
    return ACTIVITY_PALETTE[0]
  }

  // No active files to compare against
  if (maxCommits <= 1) {
    return ACTIVITY_PALETTE[1]  // Has activity but nothing to compare
  }

  // Scale only active files (1+ commits) across remaining buckets (1-8)
  // log(1) = 0, log(maxCommits) = max
  const logMax = Math.log(maxCommits)
  const logValue = Math.log(commits)
  const normalized = logMax > 0 ? logValue / logMax : 0

  // Map to buckets 1-8 (bucket 0 reserved for 0 commits)
  const index = 1 + Math.min(Math.floor(normalized * (ACTIVITY_PALETTE.length - 1)), ACTIVITY_PALETTE.length - 2)
  return ACTIVITY_PALETTE[index]
}

/**
 * Get color for a node based on its depth in the tree.
 * @param {number} depth - Current depth of the node
 * @param {number} maxDepth - Maximum depth in the tree (for normalization)
 * @returns {string} Hex color
 */
export function getDepthColor(depth, maxDepth) {
  if (maxDepth <= 0) {
    return DEPTH_PALETTE[0]
  }

  const normalized = Math.min(depth / maxDepth, 1)
  const index = Math.min(
    Math.floor(normalized * DEPTH_PALETTE.length),
    DEPTH_PALETTE.length - 1
  )
  return DEPTH_PALETTE[index]
}

export function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function findSlot(language, usedSlots, saltRound = 0) {
  if (saltRound > 10) return null // Give up after 10 salt rounds

  const salted = saltRound === 0 ? language : `${language}#${saltRound}`
  const baseSlot = simpleHash(salted) % 20

  // Try all 3 tiers of this hue (slot, slot+20, slot+40)
  for (const tierOffset of [0, 20, 40]) {
    const slot = baseSlot + tierOffset
    if (!usedSlots.has(slot)) {
      return slot
    }
  }

  // All tiers taken, salt and try different hue
  return findSlot(language, usedSlots, saltRound + 1)
}

// Color mode registry - single source of truth for all mode configuration
export const COLOR_MODES = {
  depth: {
    key: 'depth',
    label: 'Code size',
    description: 'Shows lines of code. Color indicates directory depth.',
    borderColor: '#009688',  // Teal - contrasts with yellow-orange-brown
    colorFn: getDepthColor   // (depth, maxDepth) => color
  },
  activity: {
    key: 'activity',
    label: 'Change activity',
    description: 'Shows file change frequency in last year.',
    borderColor: '#ff7043',  // Coral - contrasts with viridis purple-yellow
    colorFn: getActivityColor  // (commits, maxCommits) => color
  },
  filetype: {
    key: 'filetype',
    label: 'File types',
    description: 'Shows lines of code. Color indicates language.',
    borderColor: '#ffffff',  // White - stands out against mixed colors
    colorFn: null  // Uses colorMap lookup, handled differently
  }
}

export function assignColors(languageCounts) {
  // Sort by frequency (most common first)
  const sorted = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)

  const colorMap = {}
  const usedSlots = new Set()

  for (const language of sorted) {
    const slot = findSlot(language, usedSlots)
    if (slot !== null) {
      usedSlots.add(slot)
      colorMap[language] = PALETTE_60[slot]
    } else {
      colorMap[language] = OVERFLOW_COLOR
    }
  }

  return colorMap
}
