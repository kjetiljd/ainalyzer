# Opportunity: Cushion Treemap (3D Visual Separation)

**Status:** Completed
**Last Updated:** 2025-11-24
**Parent:** 002 (Code Visibility)

## Desired Outcome

Treemap cells have visual depth using 3D cushion effect (like WinDirStat), eliminating need for stroke borders and providing better space utilization and visual hierarchy.

## Opportunity (Problem Space)

**Current State:**
- Flat colored rectangles with 2px strokes for separation
- Strokes consume space (2px per edge = 4px lost per cell)
- No visual depth or hierarchy beyond color
- Strokes can feel heavy/cluttered with many small cells
- All cells appear on same visual plane

**Impact:**
- Wasted space (strokes take ~5-10% of small cell area)
- Visual density limited by stroke width requirements
- Flat appearance lacks depth cues
- Difficult to distinguish depth levels at a glance
- Small cells become mostly border with little fill

**User Needs:**
- Clear visual separation without explicit borders
- Better space utilization (more fill, less stroke)
- Depth perception to understand hierarchy
- Cleaner, more refined aesthetic
- Distinguish parent/child relationships visually

**Reference:**
WinDirStat uses "cushion treemap" rendering where each cell has a gradient that simulates lighting on a curved surface, creating the illusion that rectangles bulge outward. This provides natural visual separation without borders.

## Solutions (Explored)

### Solution 1: CSS Gradient Cushions (Lightweight)

**Philosophy:** Use CSS gradients to simulate 3D effect. No canvas/WebGL required.

**Approach:**
- Replace flat fill with radial gradient
- Gradient lighter in center, darker at edges
- Creates illusion of curved/raised surface
- Remove or reduce stroke width
- Adjust gradient intensity based on cell size

**Implementation:**
```javascript
function getCushionGradient(node, x0, y0, width, height) {
  const baseColor = getNodeColor(node)
  const rgb = hexToRgb(baseColor)

  // Create lighter center, darker edges
  const centerLight = `rgb(${rgb.r + 30}, ${rgb.g + 30}, ${rgb.b + 30})`
  const edgeDark = `rgb(${rgb.r - 20}, ${rgb.g - 20}, ${rgb.b - 20})`

  // SVG gradient
  const gradientId = `cushion-${node.id}`

  return `
    <radialGradient id="${gradientId}" cx="50%" cy="50%">
      <stop offset="0%" stop-color="${centerLight}" />
      <stop offset="100%" stop-color="${edgeDark}" />
    </radialGradient>
  `
}

// Apply to rect
rect.setAttribute('fill', `url(#cushion-${node.id})`)
rect.setAttribute('stroke-width', '0.5')  // Minimal stroke
```

**Benefits:**
- Simple CSS/SVG implementation
- No additional libraries
- Performant (native browser rendering)
- Works with existing SVG treemap
- Easy to toggle on/off

**Trade-offs:**
- Basic effect (not as sophisticated as true cushion algorithm)
- Radial gradients may not look "natural"
- Limited control over light direction
- May not scale well to very small cells

---

### Solution 2: Cushion Treemap Algorithm (Authentic)

**Philosophy:** Implement proper cushion treemap algorithm. True to original research.

**Approach:**
- Use Jarke J. van Wijk's cushion treemap algorithm
- Generate height field (displacement map) for each cell
- Simulate lighting with directional light source
- Render as canvas (pixel-level control)
- Hierarchical cushions (children nested in parent surface)

**Algorithm Overview:**
```javascript
// Cushion treemap uses polynomial surface functions
// Surface height at point (x,y): f(x,y) = ax*x² + ay*y²

class CushionTreemap {
  constructor(width, height) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d')

    // Light direction (normalized)
    this.light = { x: -0.5, y: -0.5, z: 1.0 }
  }

  renderNode(node, x0, y0, x1, y1, parentCushion) {
    // Inherit parent's cushion function
    const cushion = this.addCushion(parentCushion, x0, y0, x1, y1)

    // Render this node's surface
    for (let x = x0; x < x1; x++) {
      for (let y = y0; y < y1; y++) {
        const color = this.calculatePixelColor(x, y, cushion, node.baseColor)
        this.ctx.fillStyle = color
        this.ctx.fillRect(x, y, 1, 1)
      }
    }

    // Recursively render children
    if (node.children) {
      node.children.forEach(child => {
        this.renderNode(child, child.x0, child.y0, child.x1, child.y1, cushion)
      })
    }
  }

  addCcushion(parentCushion, x0, y0, x1, y1) {
    // Add new quadratic surface to parent surface
    const width = x1 - x0
    const height = y1 - y0

    return {
      ax: parentCushion.ax + 4 / (width * width),
      ay: parentCushion.ay + 4 / (height * height),
      ...parentCushion
    }
  }

  calculatePixelColor(x, y, cushion, baseColor) {
    // Calculate surface normal at this pixel
    const nx = cushion.ax * x
    const ny = cushion.ay * y
    const nz = 1

    // Normalize
    const length = Math.sqrt(nx*nx + ny*ny + nz*nz)
    const normal = { x: nx/length, y: ny/length, z: nz/length }

    // Dot product with light direction (Lambert shading)
    const intensity = Math.max(0,
      normal.x * this.light.x +
      normal.y * this.light.y +
      normal.z * this.light.z
    )

    // Modulate base color by intensity
    return this.modulateColor(baseColor, intensity)
  }

  modulateColor(baseColor, intensity) {
    const rgb = hexToRgb(baseColor)
    const ambient = 0.3  // Minimum brightness
    const final = ambient + (1 - ambient) * intensity

    return `rgb(${rgb.r * final}, ${rgb.g * final}, ${rgb.b * final})`
  }
}
```

**Benefits:**
- Authentic cushion treemap (matches WinDirStat aesthetic)
- Beautiful, natural-looking depth
- Hierarchical depth (children visually nested in parents)
- Proper lighting simulation
- Research-backed algorithm (van Wijk & van de Wetering, 1999)

**Trade-offs:**
- Complex implementation (canvas pixel manipulation)
- Performance concerns (render every pixel)
- Requires canvas instead of SVG (different rendering model)
- Labels become more complex (overlaying on canvas)
- Larger code footprint

---

### Solution 3: Box Shadow Pseudo-3D

**Philosophy:** Fake 3D using CSS shadows. No algorithm, just visual tricks.

**Approach:**
- Add inset box-shadow to rectangles
- Shadow darker at edges, lighter in center
- Use multiple shadow layers for smooth gradient
- Reduce or remove stroke borders

**CSS Implementation:**
```css
.treemap-cell {
  box-shadow:
    inset 2px 2px 4px rgba(255,255,255,0.3),
    inset -2px -2px 4px rgba(0,0,0,0.3);
  border: none;
}

/* Variation: More pronounced effect */
.treemap-cell-deep {
  box-shadow:
    inset 3px 3px 6px rgba(255,255,255,0.4),
    inset -3px -3px 6px rgba(0,0,0,0.4),
    inset 0 0 12px rgba(255,255,255,0.1);
}
```

**Benefits:**
- Trivial to implement (just CSS)
- No JavaScript changes needed
- Works with SVG foreignObject
- Instant visual improvement
- Toggle-able with class

**Trade-offs:**
- Not true cushion effect (just shadows)
- May look artificial/cheap
- Box shadows can hurt performance with many cells
- Less control over light direction
- Doesn't scale with zoom

---

### Solution 4: WebGL Shader-Based Cushions

**Philosophy:** Use GPU for real-time cushion rendering. Maximum performance and quality.

**Approach:**
- Render treemap as texture in WebGL
- Fragment shader computes cushion lighting per pixel
- Hardware-accelerated (60fps guaranteed)
- Can add additional effects (ambient occlusion, etc.)

**Benefits:**
- Best performance (GPU rendering)
- Highest quality (true per-pixel lighting)
- Real-time updates (smooth animations)
- Can add advanced effects

**Trade-offs:**
- Massive complexity (WebGL programming)
- Requires shader expertise
- Harder to debug and maintain
- Accessibility concerns (canvas-based)
- Overkill for static visualization

---

### Solution 5: Pre-Rendered Cushion Textures

**Philosophy:** Generate cushion textures once, reuse for similar cells.

**Approach:**
- Pre-generate cushion textures at common aspect ratios
- Cache textures (1:1, 2:1, 3:1, etc.)
- Apply as background image to rectangles
- Tint texture with cell color
- Scale and crop as needed

**Benefits:**
- Good performance (texture reuse)
- Authentic cushion look
- Simpler than full algorithm
- Can be pre-computed offline

**Trade-offs:**
- Texture atlas management complexity
- May not fit all cell dimensions perfectly
- Memory overhead (texture cache)
- Scaling artifacts on extreme aspect ratios

---

## Comparison Matrix

| Criterion | CSS Gradient | Full Algorithm | Box Shadow | WebGL | Pre-Rendered |
|-----------|-------------|----------------|------------|-------|--------------|
| Visual quality | Medium | Highest | Low | Highest | High |
| Performance | Good | Fair | Fair | Excellent | Good |
| Implementation | Simple | Complex | Trivial | Very Complex | Medium |
| Authenticity | Low | Highest | Low | High | High |
| Maintenance | Easy | Hard | Easy | Very Hard | Medium |
| Bundle size | +0KB | +5KB | +0KB | +50KB | +10KB |

## Recommendation

**Start with Solution 1 (CSS Gradient Cushions)** for MVP:
- Quick win (minimal code)
- Immediate visual improvement
- Easy to iterate
- If successful, upgrade to Solution 2 (full algorithm) later

**Fallback:** If gradients don't feel right, use Solution 3 (box shadows) temporarily.

**Long-term:** Implement Solution 2 (authentic cushion algorithm) if user feedback demands it. WinDirStat's visual appeal is largely due to this.

## Implementation Plan

**Phase 1: CSS Gradient MVP** (Estimated: 2-3 hours)
- [ ] Add `createCushionGradient()` method to Treemap.vue
- [ ] Generate unique gradient IDs per node
- [ ] Apply gradients to rect fills
- [ ] Reduce stroke width to 0.5px or remove entirely
- [ ] Adjust gradient intensity based on cell size
- [ ] Test with various color schemes

**Phase 2: Refinement** (Estimated: 1-2 hours)
- [ ] Fine-tune gradient stops for best appearance
- [ ] Add user preference toggle (flat vs cushion)
- [ ] Optimize gradient generation (cache by color)
- [ ] Test on different screen sizes and DPI

**Phase 3: Full Algorithm** (Optional, 8-12 hours)
- [ ] Research van Wijk's paper (1999)
- [ ] Implement cushion surface functions
- [ ] Convert treemap rendering to canvas
- [ ] Add lighting calculation
- [ ] Integrate with existing navigation/labels
- [ ] Performance optimization (Web Workers?)

**Testing Strategy:**
- Test with small cells (<30px) - gradients should be subtle
- Test with large cells (>200px) - gradients should be pronounced
- Test color contrast (light colors vs dark colors)
- Test on retina displays (gradient smoothness)
- A/B test with users (flat vs cushion preference)

**Success Metrics:**
- Borders removed or reduced to <1px
- Visual separation still clear
- User preference: 60%+ prefer cushion over flat
- No performance degradation (<16ms render)

## Visual Examples

**Flat (Current):**
```
┌────┬────┬────┐
│ A  │ B  │ C  │  ← Clear borders, flat fill
├────┼────┼────┤
│ D       │ E  │
└─────────┴────┘
```

**Cushion (WinDirStat Style):**
```
  ╭─╮  ╭─╮  ╭─╮
 │ A │ │ B │ │ C │  ← Rounded edges, gradient fill
  ╰─╯  ╰─╯  ╰─╯     ← Visual separation from shading
  ╭───────╮  ╭─╮
 │   D     │ │ E │
  ╰───────╯  ╰─╯
```

## Research References

- **Original Paper:** "Cushion Treemaps: Visualization of Hierarchical Information"
  Jarke J. van Wijk, Huub van de Wetering (1999)
  InfoVis '99 Proceedings

- **Implementation:** WinDirStat (open source)
  https://github.com/windirstat/windirstat

- **D3 Examples:** Some D3 cushion treemap implementations exist
  (Though not in core D3 library)

## Dependencies

**Blocks:** None
**Blocked by:** None (visual enhancement only)

**Alternative Libraries:**
- `d3-hierarchy` - Already using (base treemap)
- `cushion-treemap` - NPM package (if exists)
- Manual implementation (van Wijk algorithm)

## Notes

- Cushion effect is purely cosmetic (doesn't change data or layout)
- Should be opt-in initially (user preference)
- Consider accessibility: ensure sufficient contrast even with gradients
- Gradients may not print well (offer print-friendly flat mode)
- Mobile users may not perceive 3D effect on small screens

## Future Enhancements

- Adjustable light direction (UI control)
- Different shading models (Phong, Blinn-Phong)
- Ambient occlusion at cell edges (deeper shadows)
- Animated lighting (rotating light source)
- Depth exaggeration slider (flatten or emphasize)

## Design Considerations

**Gradient Direction:**
- Top-left to bottom-right light source (standard)
- Consistent across all cells (unified light direction)
- Adjustable in preferences?

**Stroke Width:**
- Full cushion: 0px stroke (rely on shading)
- Subtle cushion: 0.5px stroke (hybrid approach)
- User preference: toggle strokes on/off

**Color Adjustment:**
- Lighter colors: reduce gradient intensity (avoid blowout)
- Darker colors: increase gradient intensity (maintain visibility)
- Formula: `intensity = baseIntensity * (1 - luminance * 0.5)`
