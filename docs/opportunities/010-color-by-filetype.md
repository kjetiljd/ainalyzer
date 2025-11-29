# Opportunity: Color by File Type

**Status:** Completed
**Last Updated:** 2025-11-29

## Desired Outcome

Users can color treemap cells by file type (language) instead of depth, making it easy to see language distribution at a glance.

## Opportunity (Problem Space)

**Current State:**
- Treemap colors files by depth using ColorBrewer Set2 (6 colors)
- No visual indication of file type/language in color
- Language only visible in labels (requires large cells) or hover

**Impact:**
- Can't quickly identify where different languages live
- Hard to see polyglot patterns (e.g., "all Python in backend, all TypeScript in frontend")
- Visual comparison of language distribution requires reading labels

**User Needs:**
- Toggle between color modes (depth vs file type)
- Stable colors for file types across navigation and sessions
- Distinguish 20+ common file types visually

## Color Palette

**Selected:** ggthemes Classic_20 (Tableau-style 20-color palette)

```javascript
const classic20 = [
  '#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c',
  '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5',
  '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f',
  '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'
]
```

**Rationale:**
- 20 distinct colors (vs 6 in Set2)
- Designed for categorical data with many categories
- Perceptually distinct pairs (dark/light variants)
- Well-tested in data visualization

## Stable Color Allocation

**Challenge:** With 20 colors and 50+ possible file types, need deterministic assignment that:
1. Keeps same type → same color within an analysis (across navigation)
2. Prioritizes common languages for best (curated) colors
3. Scales beyond 20 file types gracefully

### Approach: Frequency-Based Hash with Tier Escalation

**Algorithm:**

1. **Sort by frequency** - Most common file types get first pick
2. **Hash to base slot** - `hash(language) % 20` → one of 20 base hues
3. **Tier escalation on collision** - Try same hue in darker/lighter tiers:
   - slot (Original) → slot+20 (Darker/Lighter) → slot+40 (Darkest/Pastel)
4. **Salt & rehash on hue exhaustion** - If all 3 tiers taken, add salt and rehash to find new base hue
5. **Overflow** - After multiple salt rounds, use gray (#7f7f7f)

**Example:**
```
Hash("JavaScript") → slot 7 (Blue Original) ✓
Hash("TypeScript") → slot 7 (collision!)
  → try slot 27 (Blue Darker) ✓
Hash("Python")     → slot 7 (collision!)
  → try slot 27 (collision!)
  → try slot 47 (Blue Darkest) ✓
Hash("Ruby")       → slot 7 (collision!)
  → try slot 27, 47 (all taken!)
  → salt & rehash → slot 12 (Green Original) ✓
```

**Benefits:**
- Colliding types stay in same color family (visually related)
- Similar codebases get similar color assignments (hash stability)
- Most common types get best (Original tier) colors
- Graceful degradation through tiers before rehashing

```javascript
function assignColors(languageCounts) {
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
      colorMap[language] = '#7f7f7f'  // Overflow
    }
  }
  return colorMap
}

function findSlot(language, usedSlots, saltRound = 0) {
  if (saltRound > 10) return null  // Give up after 10 salt rounds

  const salted = saltRound === 0 ? language : `${language}#${saltRound}`
  const baseSlot = simpleHash(salted) % 20

  // Try all 3 tiers of this hue
  for (const tierOffset of [0, 20, 40]) {
    const slot = baseSlot + tierOffset
    if (!usedSlots.has(slot)) {
      return slot
    }
  }

  // All tiers taken, salt and try different hue
  return findSlot(language, usedSlots, saltRound + 1)
}

function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}
```

### Tiered Palette (60 colors)

Extends Classic_20's dark/light pair pattern with additional tiers:

**Structure:** 10 base hues × 6 variants = 60 colors

| Hue | Original Dark | Original Light | Darker | Lighter | Darkest | Pastel |
|-----|---------------|----------------|--------|---------|---------|--------|
| Blue (205°) | #1f77b4 | #aec7e8 | #095081 | #d7eaf7 | #0b3a5a | #edf7ff |
| Orange (28°) | #ff7f0e | #ffbb78 | #cc5f00 | #f9c393 | #a54e00 | #ffcfa5 |
| Green (120°) | #2ca02c | #98df8a | #136d13 | #b0eeb0 | #0f460f | #c6f8c6 |
| Red (360°) | #d62728 | #ff9896 | #a30d0e | #f9b0b1 | #7c1011 | #ffc3c4 |
| Purple (271°) | #9467bd | #c5b0d5 | #653d8a | #d9cde4 | #4b3163 | #e8e2ee |
| Brown (10°) | #8c564b | #c49c94 | #592f26 | #d3bdb8 | #331d18 | #ddd1cf |
| Pink (318°) | #e377c2 | #f7b6d2 | #b04a91 | #f9d6ee | #894173 | #ffe9f8 |
| Gray (0°) | #7f7f7f | #c7c7c7 | #4c4c4c | #d6d6d6 | #333333 | #e0e0e0 |
| Yellow (60°) | #bcbd22 | #dbdb8d | #898a0b | #e9eab2 | #63630c | #f4f4c9 |
| Cyan (186°) | #17becf | #9edae5 | #018d9b | #c5f0f4 | #076b75 | #ddfbfe |

**Tier generation (HSV-based):**

```javascript
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

function generateTier(base, tier) {
  let darkS, darkV, lightS, lightV

  if (tier === 0) {  // Original Classic_20
    darkS = base.darkS; darkV = base.darkV
    lightS = base.lightS; lightV = base.lightV
  } else if (tier === 1) {  // Darker/Lighter
    darkS = Math.min(100, base.darkS + 10)
    darkV = Math.max(30, base.darkV - 20)
    lightS = Math.max(10, base.lightS - 12)
    lightV = Math.min(98, base.lightV + 6)
  } else {  // Darkest/Pastel
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

// Generate PALETTE_60
const PALETTE_60 = []
for (const base of BASE_HUES) {
  for (let tier = 0; tier < 3; tier++) {
    const { dark, light } = generateTier(base, tier)
    PALETTE_60.push(dark, light)
  }
}
```

**Benefits:**
- Cohesive color families (same hue across tiers)
- 60 distinct colors covers most codebases
- Graceful overflow to gray for rare types
- Extends Classic_20 pattern naturally

## Implementation

### Settings Panel

Add color mode selector to SettingsPanel.vue:

```vue
<label class="radio-label">
  <input type="radio" v-model="colorMode" value="depth" />
  <span>Color by depth</span>
</label>
<label class="radio-label">
  <input type="radio" v-model="colorMode" value="filetype" />
  <span>Color by file type</span>
</label>
```

### Preferences

Extend usePreferences.js:

```javascript
appearance: {
  cushionTreemap: false,
  hideFolderBorders: true,
  colorMode: 'depth'  // 'depth' | 'filetype'
}
```

### Treemap.vue Changes

Add colorMap as computed property (recalculated when data changes):

```javascript
computed: {
  colorMap() {
    if (this.colorMode !== 'filetype') return null

    // Count languages across entire tree (use root data, not currentNode)
    const counts = {}
    const countLanguages = (node) => {
      if (!node.children && node.language) {
        counts[node.language] = (counts[node.language] || 0) + 1
      }
      node.children?.forEach(countLanguages)
    }
    countLanguages(this.data)

    return assignColors(counts)  // Uses PALETTE_60 + gray overflow
  }
},

methods: {
  getNodeColor(node) {
    if (node.data.children) {
      return '#4a4a4a'  // directories stay gray
    }

    if (this.colorMode === 'filetype' && this.colorMap) {
      return this.colorMap[node.data.language] || '#7f7f7f'
    }

    // existing depth-based coloring
    return this.getDepthColor(node)
  }
}
```

### colorUtils.js (new module)

```javascript
// 10 base hues × 6 variants = 60 colors
const BASE_HUES = [
  { h: 205, darkS: 83, darkV: 71, lightS: 25, lightV: 91 },
  { h: 28,  darkS: 95, darkV: 100, lightS: 53, lightV: 100 },
  { h: 120, darkS: 72, darkV: 63, lightS: 38, lightV: 87 },
  { h: 360, darkS: 82, darkV: 84, lightS: 41, lightV: 100 },
  { h: 271, darkS: 46, darkV: 74, lightS: 17, lightV: 84 },
  { h: 10,  darkS: 46, darkV: 55, lightS: 24, lightV: 77 },
  { h: 318, darkS: 48, darkV: 89, lightS: 26, lightV: 97 },
  { h: 0,   darkS: 0,  darkV: 50, lightS: 0,  lightV: 78 },
  { h: 60,  darkS: 82, darkV: 74, lightS: 36, lightV: 86 },
  { h: 186, darkS: 89, darkV: 81, lightS: 31, lightV: 90 }
]

export const PALETTE_60 = generatePalette()
export const OVERFLOW_COLOR = '#7f7f7f'

export function assignColors(languageCounts) {
  const sorted = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)

  const colorMap = {}
  const usedSlots = new Set()

  for (const language of sorted) {
    const hash = simpleHash(language)
    let slot = hash % 60
    let probes = 0

    while (usedSlots.has(slot) && probes < 60) {
      slot = (slot + 1) % 60
      probes++
    }

    if (probes < 60) {
      usedSlots.add(slot)
      colorMap[language] = PALETTE_60[slot]
    } else {
      colorMap[language] = OVERFLOW_COLOR
    }
  }
  return colorMap
}
```

### Legend (Future Enhancement)

Consider adding a color legend showing which colors map to which languages. Could be:
- Collapsible panel
- Hover tooltip on cells
- Footer bar with colored chips

## Phases

1. **MVP:** Toggle in settings, frequency-based color assignment, no legend
2. **Enhancement:** Color legend showing active file types
3. **Future:** Custom color assignments, save per-analysis overrides

## Dependencies

- Settings panel (009) - completed
- User preferences system (009) - completed

## Assumption Tests

- [ ] 60 tiered colors are visually distinct
- [ ] Frequency-based hash assignment gives good results for typical codebases
- [ ] Color mapping computed once per analysis (not per render)
- [ ] Gray overflow is acceptable for codebases with 60+ file types
