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

**Record learnings here after testing:**

- Does the interaction feel intuitive?
- Are labels readable?
- Is color coding helpful or distracting?
- Does it scale to more files?
- Any D3.js surprises or gotchas?

## Next Steps

If spike validates the approach:
1. Design final JSON schema based on this data structure
2. Build Vue component that wraps this D3 logic
3. Implement backend (`aina analyze`) to generate this JSON from cloc output
