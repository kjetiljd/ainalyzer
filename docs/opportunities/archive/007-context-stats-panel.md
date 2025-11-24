# Opportunity: Context-Aware Statistics Panel

**Status:** Identified
**Last Updated:** 2025-11-24
**Parent:** 002 (Code Visibility)

## Desired Outcome

Users see aggregate statistics for the current treemap view (total lines, file count, directory count) that updates when drilling down, providing context about what they're looking at.

## Opportunity (Problem Space)

**Current State:**
- Treemap shows visual proportions but no numerical summary
- No way to know total lines of code in current view
- Cannot see file count without manually counting cells
- Analysis stats shown in dropdown are global (entire analysis set)
- Stats don't update when drilling down into directories

**Impact:**
- Hard to quantify what you're looking at ("How big is this directory?")
- Cannot quickly answer "How many files are in this module?"
- Visual size estimation is imprecise
- No reference numbers for comparison
- Difficult to communicate findings ("The backend is X lines")

**User Needs:**
- See total lines of code in current view
- Know how many files are displayed
- Understand directory/module sizes numerically
- Compare sizes between different parts of codebase
- Have stats update dynamically as navigation changes

**Reference:**
The D3 spike (`spikes/treemap-d3/index.html:348-357`) implemented this with:
```javascript
function updateStats(root) {
    const totalLines = root.value;
    const fileCount = root.leaves().length;
    stats.innerHTML = `
        <span><strong>Total Lines:</strong> ${totalLines.toLocaleString()}</span>
        <span><strong>Files:</strong> ${fileCount}</span>
        <span><strong>Level:</strong> ${currentNode.name}</span>
    `;
}
```

## Solutions (Explored)

### Solution 1: Horizontal Stats Bar (Spike Style)

**Philosophy:** Simple info bar. Minimal vertical space. Always visible.

**Approach:**
- Horizontal bar between breadcrumb and treemap
- Shows: Total Lines | Files | Directories
- Updates when `currentNode` changes
- Styled like breadcrumb (same visual weight)

**Layout:**
```
┌────────────────────────────────────────┐
│ Ainalyzer - Code Visibility            │
├────────────────────────────────────────┤
│ my-set / backend / src                 │  ← Breadcrumb
├────────────────────────────────────────┤
│ 15,234 lines  •  47 files  •  8 dirs   │  ← Stats bar
├────────────────────────────────────────┤
│                                        │
│          Treemap                       │
│                                        │
└────────────────────────────────────────┘
```

**Implementation:**
```vue
<template>
  <div class="stats-bar">
    <span class="stat-item">
      <strong>{{ totalLines.toLocaleString() }}</strong> lines
    </span>
    <span class="stat-separator">•</span>
    <span class="stat-item">
      <strong>{{ fileCount }}</strong> files
    </span>
    <span class="stat-separator">•</span>
    <span class="stat-item">
      <strong>{{ dirCount }}</strong> directories
    </span>
  </div>
</template>

<script>
export default {
  name: 'StatsBar',
  props: {
    currentNode: {
      type: Object,
      required: true
    }
  },
  computed: {
    totalLines() {
      return this.calculateTotalLines(this.currentNode)
    },
    fileCount() {
      return this.countFiles(this.currentNode)
    },
    dirCount() {
      return this.countDirectories(this.currentNode)
    }
  },
  methods: {
    calculateTotalLines(node) {
      if (node.value) return node.value
      if (!node.children) return 0
      return node.children.reduce((sum, child) =>
        sum + this.calculateTotalLines(child), 0)
    },
    countFiles(node) {
      if (!node.children) return node.value ? 1 : 0
      return node.children.reduce((sum, child) =>
        sum + this.countFiles(child), 0)
    },
    countDirectories(node) {
      if (!node.children) return 0
      return 1 + node.children.reduce((sum, child) =>
        sum + this.countDirectories(child), 0)
    }
  }
}
</script>
```

**Benefits:**
- Matches spike design (proven UX)
- Minimal space usage (single line)
- Always visible (no scrolling)
- Clean, simple implementation
- Familiar pattern

**Trade-offs:**
- Takes vertical space (reduces treemap height slightly)
- Horizontal layout limits number of stats
- May feel crowded on mobile

---

### Solution 2: Floating Stats Card

**Philosophy:** Non-intrusive. Appears on demand. Positioned over treemap.

**Approach:**
- Floating card in corner of treemap (top-right)
- Semi-transparent background
- Toggle show/hide with keyboard shortcut (S key)
- Can be dragged to different corner
- Minimizes to small icon when hidden

**Layout:**
```
┌────────────────────────────────────────┐
│                         ┌────────────┐ │
│                         │ 15,234 L   │ │ ← Floating card
│       Treemap           │ 47 files   │ │
│                         │ 8 dirs     │ │
│                         └────────────┘ │
└────────────────────────────────────────┘
```

**Benefits:**
- Doesn't take layout space
- Can be hidden when not needed
- Moveable (user preference)
- Can show more stats (not width-limited)

**Trade-offs:**
- Overlaps treemap (blocks view slightly)
- More complex UI (dragging, positioning)
- Discoverability (users may not find it)
- State management (position, visibility)

---

### Solution 3: Stats in Statusline

**Philosophy:** Use existing UI element. No new component.

**Approach:**
- Show stats in statusline when not hovering
- Default text: "15,234 lines • 47 files • 8 directories"
- Hover replaces with file path (existing behavior)
- No additional UI elements needed

**Layout:**
```
┌────────────────────────────────────────┐
│                                        │
│          Treemap                       │
│                                        │
├────────────────────────────────────────┤
│ 15,234 lines • 47 files • 8 dirs       │ ← Statusline
└────────────────────────────────────────┘
```

**Benefits:**
- Zero layout changes
- Reuses existing component
- Always visible
- Simple implementation
- No mobile concerns

**Trade-offs:**
- Competes with hover information
- Less prominent (bottom of screen)
- Limited space for additional stats
- May feel like "wrong place" for this info

---

### Solution 4: Stats in Breadcrumb

**Philosophy:** Context info belongs with navigation.

**Approach:**
- Show stats inline with breadcrumb
- Format: `my-set / backend / src (15,234 lines, 47 files)`
- Updates with navigation
- Compact, integrated

**Layout:**
```
┌────────────────────────────────────────┐
│ my-set / backend / src                 │
│ (15,234 lines • 47 files • 8 dirs)     │ ← Second line
├────────────────────────────────────────┤
```

**Benefits:**
- Co-located with navigation context
- No separate component
- Clearly associated with current view
- Clean visual hierarchy

**Trade-offs:**
- Makes breadcrumb taller (uses more space)
- May clutter breadcrumb on long paths
- Less scannable than dedicated stats bar

---

### Solution 5: Stats on Hover (Tooltip)

**Philosophy:** Show on demand. Keep UI clean by default.

**Approach:**
- No visible stats by default
- Hover on breadcrumb current segment shows tooltip
- Tooltip contains full stats breakdown
- Keyboard shortcut (I key) toggles persistent tooltip

**Benefits:**
- Zero space when not needed
- Can show detailed breakdown (lines by language, etc.)
- Clean default UI
- Discoverability through natural interaction

**Trade-offs:**
- Hidden by default (may be missed)
- Requires action to see
- Tooltip positioning complexity
- Not always-visible like spike

---

## Comparison Matrix

| Criterion | Horizontal Bar | Floating Card | Statusline | Breadcrumb | Tooltip |
|-----------|----------------|---------------|------------|------------|---------|
| Visibility | Always | Toggle | Always | Always | On-demand |
| Space usage | Fixed (1 line) | Overlays | Existing | Existing+ | None |
| Discoverability | High | Low | Medium | High | Low |
| Implementation | Simple | Complex | Simple | Simple | Medium |
| Mobile friendly | Good | Poor | Good | Good | Fair |
| Matches spike | Yes | No | No | No | No |

## Recommendation

**Solution 1 (Horizontal Stats Bar)** for MVP:
- Matches proven spike design
- Highest discoverability
- Clean implementation
- Mobile-friendly
- Always visible (no interaction needed)

**Enhancement:** Add tooltip on stat items showing detailed breakdown:
- Hover "15,234 lines" → "12,450 Python • 2,784 JavaScript"
- Hover "47 files" → "32 .py • 15 .js"

## Implementation Plan

**Phase 1: StatsBar Component** (Estimated: 1-2 hours)
- [ ] Create `StatsBar.vue` component
- [ ] Accept `currentNode` prop
- [ ] Compute: totalLines, fileCount, dirCount
- [ ] Format numbers with toLocaleString()
- [ ] Style to match breadcrumb aesthetic
- [ ] Add separator dots between stats

**Phase 2: Integration** (Estimated: 30 min)
- [ ] Import StatsBar in App.vue
- [ ] Position between Breadcrumb and Treemap
- [ ] Pass currentNode prop
- [ ] Test updates when drilling down
- [ ] Verify stats match treemap content

**Phase 3: Enhancements** (Optional, 1 hour)
- [ ] Add language breakdown on hover
- [ ] Show largest file/directory
- [ ] Add "average lines per file" stat
- [ ] Animate number changes (count-up effect)

**Testing Strategy:**
- Test with empty directory (0 files)
- Test with single file
- Test with deeply nested structure
- Test with large numbers (millions of lines)
- Verify stats update on drill-down
- Verify stats update on breadcrumb navigation

**Success Metrics:**
- Stats display correctly for all tree depths
- Numbers update smoothly (<50ms after navigation)
- toLocaleString formatting works in all locales
- Component renders in <10ms

## Stats Calculation Logic

```javascript
// Total lines: Sum of all descendant file values
function calculateTotalLines(node) {
  if (node.value) return node.value  // Leaf node
  if (!node.children) return 0        // Empty directory
  return node.children.reduce((sum, child) =>
    sum + calculateTotalLines(child), 0)
}

// File count: Count all leaf nodes
function countFiles(node) {
  if (!node.children) return node.value ? 1 : 0  // Leaf = file
  return node.children.reduce((sum, child) =>
    sum + countFiles(child), 0)
}

// Directory count: Count all nodes with children
function countDirectories(node) {
  if (!node.children) return 0  // Leaf nodes aren't directories
  return 1 + node.children.reduce((sum, child) =>
    sum + countDirectories(child), 0)
}

// Language breakdown (for tooltip enhancement)
function getLanguageBreakdown(node) {
  const languages = {}

  function traverse(n) {
    if (n.language && n.value) {
      languages[n.language] = (languages[n.language] || 0) + n.value
    }
    if (n.children) {
      n.children.forEach(traverse)
    }
  }

  traverse(node)
  return languages
}
```

## Dependencies

**Blocks:** None
**Blocked by:** None (can implement immediately)

## Notes

- Stats should match exactly what's visible in treemap
- When at root, stats should match global analysis stats
- Consider caching computed stats to avoid recalculation on every render
- Numbers should animate smoothly on change (use Vue transitions)
- Stats bar should have same responsive behavior as breadcrumb

## Future Enhancements

- Show percentage of total (e.g., "15,234 lines (23% of codebase)")
- Add filters: "Show only Python files" updates stats
- Export stats to clipboard (JSON format)
- Comparison mode: Show stats for two different paths side-by-side
- Historical stats: "This directory grew by 2,340 lines this month"
