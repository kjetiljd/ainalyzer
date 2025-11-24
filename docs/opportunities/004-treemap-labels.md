# Opportunity: Treemap In-Cell Labels

**Status:** Next
**Last Updated:** 2025-11-23
**Parent:** 002 (Code Visibility)

## Desired Outcome

Users can read file names and metrics directly in the treemap without hovering.

## Opportunity (Problem Space)

**Current State:**
- Treemap shows only colored rectangles
- No text labels visible on cells
- File names and line counts only appear on hover (statusline)
- Must hover over each cell to identify it
- Large cells have empty space that could show information

**Impact:**
- Slow exploration (hover required for every cell)
- Cannot see multiple file names simultaneously
- Difficulty comparing files visually
- Wasted space in large cells
- Need to remember what you saw after moving mouse

**User Needs:**
- See file names directly in cells when space permits
- See line counts for quick comparison
- Identify files without hovering
- Compare multiple files at a glance
- Understand what you're looking at immediately

**Examples of wasted space:**
- Large repository cells (200x150px) showing nothing
- Directory cells with room for "src/ (12,450 lines)"
- File cells 100x50px that could show "auth.py\n1,234"

## Solutions (Explored)

### Solution 1: Static Text Labels with Size Thresholds

**Philosophy:** Show text when there's room. Hide when too small.

**Approach:**
- Calculate cell dimensions after treemap layout
- Apply size thresholds: show labels only if width > 60px && height > 40px
- Position text centered in rectangle
- Truncate long filenames with ellipsis
- Use multiple size tiers for different detail levels

**Size Tiers:**
```javascript
const LABEL_TIERS = {
  NONE: { minWidth: 0, minHeight: 0 },      // No label
  MINIMAL: { minWidth: 60, minHeight: 30 }, // "auth.py"
  COMPACT: { minWidth: 100, minHeight: 50 }, // "auth.py\n1,234"
  FULL: { minWidth: 150, minHeight: 80 }    // "auth.py\n1,234 lines\nPython"
}

function getLabelContent(node, width, height) {
  if (width < 60 || height < 30) return null

  let lines = []

  // Always show name if we have space
  lines.push(truncate(node.name, width))

  // Add line count if compact or larger
  if (width >= 100 && height >= 50 && node.value) {
    lines.push(node.value.toLocaleString())
  }

  // Add language if full size
  if (width >= 150 && height >= 80 && node.language) {
    lines.push(node.language)
  }

  return lines.join('\n')
}
```

**Visual Treatment:**
```css
.treemap-label {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none; /* Don't block click events */
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  font-size: 11px;
  line-height: 1.3;
  text-align: center;
  overflow: hidden;
  padding: 4px;
}

.treemap-label-name {
  font-weight: 600;
  font-size: 12px;
}

.treemap-label-value {
  font-size: 10px;
  opacity: 0.9;
}

.treemap-label-meta {
  font-size: 9px;
  opacity: 0.7;
}
```

**Benefits:**
- Progressive disclosure (more info for larger cells)
- Respects available space
- Readable labels (no tiny text)
- Clean fallback (no label clutter on small cells)

**Trade-offs:**
- Fixed thresholds may not suit all screen sizes
- Need to recalculate labels on zoom/drill-down
- Text truncation may hide important info

---

### Solution 2: Responsive Font Scaling

**Philosophy:** Always show labels. Scale text to fit.

**Approach:**
- Always render labels
- Calculate font size based on cell dimensions: `fontSize = Math.max(8, Math.min(width / 10, 16))`
- Dynamically adjust text content based on available space
- Use SVG text with `textLength` attribute for automatic scaling

**Implementation:**
```javascript
function renderLabel(node, x0, y0, width, height) {
  const fontSize = calculateFontSize(width, height)

  if (fontSize < 8) return null // Too small to read

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  text.setAttribute('x', x0 + width / 2)
  text.setAttribute('y', y0 + height / 2)
  text.setAttribute('text-anchor', 'middle')
  text.setAttribute('dominant-baseline', 'middle')
  text.setAttribute('font-size', fontSize)
  text.setAttribute('fill', getContrastColor(node.color))

  // Smart truncation based on available width
  const maxChars = Math.floor(width / (fontSize * 0.6))
  text.textContent = truncate(node.name, maxChars)

  return text
}

function calculateFontSize(width, height) {
  // Scale font to fit container
  const widthBased = width / 8
  const heightBased = height / 3
  return Math.max(8, Math.min(widthBased, heightBased, 16))
}
```

**Benefits:**
- Labels on all cells (better coverage)
- Smooth scaling (no sharp thresholds)
- Adapts to any screen size automatically

**Trade-offs:**
- Tiny text on small cells (unreadable)
- Can feel cluttered
- Performance impact (many text elements)

---

### Solution 3: Hierarchical Label Strategy

**Philosophy:** Show context-aware labels. Different content at different zoom levels.

**Approach:**
- At root level: Show repository/directory names only
- After drill-down: Show file names and metrics
- On hover: Show full details (existing statusline)
- Adjust based on current depth in navigation

**Depth-Based Labels:**
```javascript
function getLabelByDepth(node, depth) {
  switch (depth) {
    case 0: // Root view (analysis set)
      return node.type === 'repository'
        ? `${node.name}\n${formatRepoStats(node)}`
        : null

    case 1: // Repository view
      return node.type === 'directory'
        ? node.name
        : `${node.name}\n${node.value}`

    case 2: // Directory view
      return node.type === 'file'
        ? `${node.name}\n${node.value} lines`
        : node.name

    default:
      return node.name
  }
}
```

**Benefits:**
- Context-appropriate information
- Less clutter at high levels
- More detail at low levels (where you care)
- Natural progressive disclosure

**Trade-offs:**
- Requires tracking navigation depth
- Complex logic to maintain
- Inconsistent information across views

---

## Comparison Matrix

| Criterion | Size Thresholds | Font Scaling | Hierarchical |
|-----------|----------------|--------------|--------------|
| Readability | High | Medium | High |
| Coverage | Medium | High | Medium |
| Performance | Good | Fair | Good |
| Consistency | High | Medium | Low |
| Maintenance | Low | Medium | High |
| User confusion | Low | Medium | Medium |

## Recommendation

**Solution 1 (Size Thresholds)** for MVP:
- Clear, readable labels
- Good performance
- Simple implementation
- Predictable behavior

**Enhancement:** Add language color coding in labels (colored dot next to filename)

## Implementation Plan

**Phase 1: Basic Labels**
1. Modify `Treemap.vue` render function
2. Calculate cell dimensions (x1-x0, y1-y0)
3. Apply 60x30px minimum threshold
4. Render centered text with filename
5. Style with text-shadow for contrast

**Phase 2: Multi-Line Labels**
1. Add 100x50px threshold for two-line labels
2. Show filename + line count
3. Format numbers with `toLocaleString()`
4. Adjust vertical centering for multiple lines

**Phase 3: Visual Enhancements**
1. Add color contrast calculation (white vs black text)
2. Add ellipsis truncation for long filenames
3. Add language indicator (colored dot or text)
4. Smooth fade-in animation on render

**Phase 4: Performance Optimization**
1. Debounce label recalculation on resize
2. Use CSS transforms instead of recalculating positions
3. Virtual rendering (only render visible labels)

## Assumption Tests

- [ ] 60x30px threshold provides readable labels
- [ ] Text contrast is sufficient on all cell colors
- [ ] Labels don't significantly impact render performance
- [ ] Users prefer labels over hover-only information

## Success Metrics

- Reduced time to identify specific files (hover count decreases)
- User reports of improved navigation
- Positive feedback on information density
- No performance degradation (maintain 60fps on drill-down)

## Design Mockups

**Large cell (200x120px):**
```
┌─────────────────────┐
│                     │
│   authentication.py │
│     2,456 lines     │
│       Python        │
│                     │
└─────────────────────┘
```

**Medium cell (100x60px):**
```
┌──────────────┐
│              │
│  auth.py     │
│  1,234       │
│              │
└──────────────┘
```

**Small cell (60x35px):**
```
┌────────┐
│ api.js │
└────────┘
```

**Tiny cell (<60x30px):**
```
┌──┐
│  │  (no label, hover to see)
└──┘
```
