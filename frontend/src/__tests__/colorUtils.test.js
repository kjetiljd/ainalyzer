import { describe, it, expect } from 'vitest'
import { PALETTE_60, OVERFLOW_COLOR, simpleHash, assignColors } from '../utils/colorUtils'

// Classic_20 reference - light variants only (odd indices)
const CLASSIC_20_LIGHTS = [
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
  '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5'
]

describe('colorUtils', () => {
  describe('PALETTE_60', () => {
    it('exports 60 colors', () => {
      expect(PALETTE_60).toHaveLength(60)
    })

    it('light variants (odd indices) match Classic_20 lights', () => {
      // Odd indices in tier 0 are light variants - should match exactly
      for (let i = 0; i < 10; i++) {
        const paletteIdx = i * 2 + 1  // 1, 3, 5, 7, ...
        expect(PALETTE_60[paletteIdx].toLowerCase()).toBe(CLASSIC_20_LIGHTS[i].toLowerCase())
      }
    })

    it('dark variants (even indices) are muted from Classic_20', () => {
      // Even indices should be different from original Classic_20 (reduced saturation)
      // Exception: gray (#7f7f7f) has 0% saturation so it's unchanged
      const CLASSIC_20_DARKS = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
      ]
      for (let i = 0; i < 10; i++) {
        if (i === 7) continue  // Skip gray - has 0 saturation
        const paletteIdx = i * 2  // 0, 2, 4, 6, ...
        // Should NOT match original (they're muted)
        expect(PALETTE_60[paletteIdx].toLowerCase()).not.toBe(CLASSIC_20_DARKS[i].toLowerCase())
      }
    })

    it('all colors are valid hex codes', () => {
      const hexPattern = /^#[0-9a-f]{6}$/i
      for (const color of PALETTE_60) {
        expect(color).toMatch(hexPattern)
      }
    })
  })

  describe('simpleHash', () => {
    it('returns consistent values for same input', () => {
      const hash1 = simpleHash('JavaScript')
      const hash2 = simpleHash('JavaScript')
      expect(hash1).toBe(hash2)
    })

    it('returns different values for different inputs', () => {
      const hashJS = simpleHash('JavaScript')
      const hashPy = simpleHash('Python')
      expect(hashJS).not.toBe(hashPy)
    })

    it('returns non-negative numbers', () => {
      const languages = ['JavaScript', 'Python', 'Rust', 'Go', 'TypeScript']
      for (const lang of languages) {
        expect(simpleHash(lang)).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('assignColors', () => {
    it('returns object mapping languages to colors', () => {
      const counts = { JavaScript: 100, Python: 50 }
      const colorMap = assignColors(counts)

      expect(typeof colorMap).toBe('object')
      expect(colorMap.JavaScript).toMatch(/^#[0-9a-f]{6}$/i)
      expect(colorMap.Python).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('assigns most frequent language first (gets priority)', () => {
      const counts = { JavaScript: 100, Python: 50, Ruby: 25 }
      const colorMap = assignColors(counts)

      // Most frequent should get a slot in first 20 (Classic_20)
      expect(PALETTE_60.slice(0, 20)).toContain(colorMap.JavaScript)
    })

    it('handles collision with tier escalation', () => {
      // Create languages that will collide on same base slot
      // We need to find languages that hash to same slot
      const counts = {}
      const languages = []

      // Generate enough languages to force collisions
      for (let i = 0; i < 5; i++) {
        const lang = `Lang${i}`
        counts[lang] = 100 - i
        languages.push(lang)
      }

      const colorMap = assignColors(counts)

      // All should get unique colors
      const colors = Object.values(colorMap)
      const uniqueColors = new Set(colors)
      expect(uniqueColors.size).toBe(colors.length)
    })

    it('salts and rehashes when all 3 tiers exhausted', () => {
      // Create 61 languages to force salt+rehash behavior
      const counts = {}
      for (let i = 0; i < 61; i++) {
        counts[`Language${i}`] = 1000 - i
      }

      const colorMap = assignColors(counts)

      // First 60 should get palette colors, 61st gets overflow
      const colors = Object.values(colorMap)
      const paletteColors = colors.filter(c => c !== OVERFLOW_COLOR)
      expect(paletteColors.length).toBe(60)
    })

    it('returns gray for overflow (60+ languages)', () => {
      const counts = {}
      for (let i = 0; i < 65; i++) {
        counts[`Language${i}`] = 1000 - i
      }

      const colorMap = assignColors(counts)
      const overflowColors = Object.values(colorMap).filter(c => c === OVERFLOW_COLOR)

      expect(overflowColors.length).toBe(5) // 65 - 60 = 5 overflow
    })

    it('is deterministic (same input gives same output)', () => {
      const counts = { JavaScript: 100, Python: 80, TypeScript: 60, Rust: 40 }

      const colorMap1 = assignColors(counts)
      const colorMap2 = assignColors(counts)

      expect(colorMap1).toEqual(colorMap2)
    })

    it('returns empty object for empty input', () => {
      const colorMap = assignColors({})
      expect(colorMap).toEqual({})
    })

    it('assigns unique colors to each language within palette capacity', () => {
      const counts = {
        JavaScript: 100,
        Python: 90,
        TypeScript: 80,
        Rust: 70,
        Go: 60,
        Java: 50,
        Ruby: 40,
        PHP: 30,
        Swift: 20,
        Kotlin: 10
      }

      const colorMap = assignColors(counts)
      const colors = Object.values(colorMap)
      const uniqueColors = new Set(colors)

      expect(uniqueColors.size).toBe(10)
    })
  })

  describe('OVERFLOW_COLOR', () => {
    it('is gray (#6f6f6f)', () => {
      expect(OVERFLOW_COLOR.toLowerCase()).toBe('#6f6f6f')
    })
  })
})
