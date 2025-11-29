// Color utilities for file type coloring
// Based on ggthemes Classic_20 extended to 60 colors via tiered approach

// Classic_20 exact colors (tier 0) - hardcoded for precision
const CLASSIC_20 = [
  '#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c',
  '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5',
  '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f',
  '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'
]

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
