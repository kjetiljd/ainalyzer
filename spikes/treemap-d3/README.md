# Spike B: D3 Treemap Prototype

**Purpose:** Validate D3.js treemap approach for code visualization before building the full Vue frontend.

## Testing

```bash
# Open in browser
open spikes/treemap-d3/index.html
```

Works with `file://` protocol (no server required).

## What We're Testing

### Assumption Tests (from Opportunity 002)
- [ ] Treemap renders hierarchical code structure clearly
- [ ] Drill-down interaction feels intuitive
- [ ] Color coding helps distinguish hierarchy levels
- [ ] Labels readable for reasonably-sized boxes
- [ ] Click navigation works smoothly

### Technical Validation
- [ ] D3.js v7 treemap layout (squarified algorithm)
- [ ] Hierarchical data structure (name + children/value)
- [ ] Static HTML works without build step
- [ ] Performance feels instant for sample data (~20 files)

## Sample Data Structure

```json
{
  "name": "root",
  "children": [
    {
      "name": "repo1",
      "children": [
        {
          "name": "src",
          "children": [
            { "name": "file.py", "value": 1234 }
          ]
        }
      ]
    }
  ]
}
```

- **Branches:** `name` + `children` array
- **Leaves:** `name` + `value` (line count)
- D3 hierarchy expects this format for `.sum()` and `.sort()`

## Features Implemented

- **Squarified treemap:** Space-efficient rectangle packing
- **Color by depth:** Hierarchy levels use distinct colors
- **Click to drill down:** Navigate into directories/repos
- **Breadcrumb navigation:** Click path segments to go back up
- **Smart labels:** Only show text if box is large enough
- **Stats panel:** Total lines, file count, current level

## Interaction Pattern

1. **Initial view:** Top-level overview (all repos)
2. **Click a rectangle:** Drill into that repo/directory
3. **Click breadcrumb:** Navigate back to parent levels
4. **Hover:** Highlight with blue border

## Findings

**Tested: 2025-11-21**

### What Works Well

- ✅ **Drill-down interaction is intuitive** - Click to navigate into directories, breadcrumb to go back
- ✅ **Squarified layout** - Efficient space usage, clear visual hierarchy
- ✅ **Statusline provides context** - Hover shows full path + line count
- ✅ **Color strategy validated** - Directories neutral (gray), files colored by depth
  - Decision: Save color for future overlays (change frequency, size thresholds)
- ✅ **Text readability** - Dark text (#1a1a1a) readable against all palette colors
- ✅ **D3.js v7 treemap** - Stable, performant, well-documented API
- ✅ **Static HTML works** - No build step, opens directly in browser (file://)

### Issues Encountered & Fixed

- ❌ **Bug: Breadcrumb duplication** - Clicking files repeatedly added parent name
  - **Fix:** Only drill down on nodes with children (directories)
- ❌ **Bug: Nothing to drill into** - Initial version only rendered leaves (files)
  - **Fix:** Render all descendants, not just leaves
- ⚠️ **Text contrast** - Initial white text unreadable on light colors (green, yellow)
  - **Fix:** Dark text with bold weight

### D3.js Learnings

- `root.leaves()` only returns leaf nodes - use `root.descendants()` for full hierarchy
- `treemap.paddingInner()` / `paddingOuter()` control spacing between rectangles
- Click handlers need to find node in original data tree, not D3 hierarchy object
- Path traversal: `while (node.parent)` to build full path from leaf to root

### Assumptions Validated

- [x] Treemap renders hierarchical code structure clearly
- [x] Drill-down interaction feels intuitive
- [x] Color coding strategy decided (neutral dirs, colored files)
- [x] Labels readable for reasonably-sized boxes
- [x] Click navigation works smoothly
- [x] D3.js v7 treemap layout (squarified algorithm) is solid choice
- [x] Static HTML works without build step
- [x] Performance feels instant for sample data (~23 files)

## Next Steps

If spike validates the approach:
1. Design final JSON schema based on this data structure
2. Build Vue component that wraps this D3 logic
3. Implement backend (`aina analyze`) to generate this JSON from cloc output
