# Opportunity: Code Visibility

**Status:** Next
**Last Updated:** 2025-11-21

## Desired Outcome

Teams can see where code lives across repositories at a glance.

## Opportunity (Problem Space)

**Current State:**
- Unknown code distribution across repositories
- Manual exploration required to understand codebase size
- No visual overview of code structure
- Difficult to identify areas of concentration

**Impact:**
- Time wasted exploring codebases
- Poor understanding of technical investment areas
- Can't communicate structure to stakeholders
- Tribal knowledge required

**User Needs:**
- Quick visual overview of code volume
- Understand relative sizes of components
- Drill down from repository to file level
- Language-agnostic counting

## Solutions (Explored)

**Decision:** Solution 3 (Vue.js with Static Deployment) selected. See [ADR 0002](../adr/0002-vue-static-deployment-for-visualization.md).

---

### Solution 1: Terminal-Native Visualization

**Philosophy:** Zero web dependencies, instant feedback, works over SSH.

**Approach:**
- Pure CLI tool using rich terminal capabilities
- No browser required, no server, no HTML/JS/CSS
- Inline visualization using Unicode block characters and ANSI colors
- Tree-style hierarchical output with size indicators

**Components:**
- Line counter (same as other solutions - walk repos, count lines)
- Terminal renderer using Unicode box drawing (├─ ║ ╚ etc.)
- Color-coded output (size thresholds: green→yellow→red)
- Horizontal bar charts using block characters (█ ▓ ▒ ░)
- Interactive navigation via less/more-style paging

**Example output:**
```
my-analysis-set (1.2M lines)
├─ backend-api (850k, 71%) ████████████████████▓▓▓░░░
│  ├─ src/services (420k)  ████████████░░░
│  ├─ src/controllers (230k) ██████░
│  └─ tests (200k)          █████░
├─ frontend (280k, 23%)    ██████░░░
│  ├─ components (180k)     ████░
│  └─ utils (100k)          ██░
└─ shared (70k, 6%)        ██░
```

**Benefits:**
- Zero build step, zero dependencies beyond Python stdlib
- Works everywhere: local terminal, SSH sessions, CI logs
- Instant startup (<100ms)
- Accessible to screen readers
- Copy-paste friendly (plain text)
- Scriptable output for automation

**Trade-offs:**
- Limited visual richness compared to graphical treemap
- Terminal width constraints (need wrapping strategy)
- No mouse interaction (keyboard only)
- Color display requires ANSI support

**Implementation:**
- Extend aina_lib.py with counting logic
- New module: terminal_viz.py for rendering
- Use Python's curses or raw ANSI codes
- Pagination for large outputs

---

### Solution 2: Static HTML Generator (Zero Runtime)

**Philosophy:** Pre-compute everything, deploy anywhere, no server needed.

**Approach:**
- Generate self-contained HTML files at analysis time
- All visualization logic baked into static files
- No JavaScript framework, no build process
- Open directly in browser (file:// protocol works)

**Components:**
- Line counter (same counting engine)
- HTML template generator
- Embedded SVG treemap (pre-rendered, not dynamic)
- CSS for styling and simple interactions
- Minimal vanilla JS for drill-down (optional, degrades gracefully)

**Output structure:**
```
~/.aina/reports/
├─ my-analysis-set-2025-11-21.html  (self-contained, 200KB)
├─ backend-services-2025-11-21.html
└─ archive/...
```

**Generated HTML features:**
- SVG treemap with rectangles sized by LOC
- Color gradient: small files (cool) → large files (warm)
- Clickable regions link to detail sections
- Table view: sortable repository/directory/file list
- Sidebar: summary stats (total LOC, file count, language breakdown)
- No external dependencies (all CSS/SVG inline)

**Benefits:**
- Share via email, Slack, wiki attachments
- Version controlled (commit reports to repo)
- Works offline indefinitely
- No hosting infrastructure required
- Diff-able (track visualization changes over time)
- Security: no code execution, just static HTML

**Trade-offs:**
- No live updates (must regenerate)
- Limited interactivity compared to web app
- File size grows with codebase size
- No server-side filtering/search

**Implementation:**
- Template: Jinja2 or plain string formatting
- SVG generation: Python xml.etree or manual string building
- Treemap algorithm: squarified layout (ported to Python)
- Optional: minimal vanilla JS for expand/collapse

---

### Solution 3: Single-Page Web App with Live Analysis

**Philosophy:** Maximum interactivity, modern UX, progressive loading.

**Approach:**
- Lightweight web server serves analysis data via HTTP API
- Modern frontend framework (Vue/React/Svelte)
- Stream analysis results as they're computed
- Client-side filtering, sorting, searching

**Components:**

**Backend (Python):**
- HTTP server (Flask or aiohttp)
- REST API endpoints:
  - GET /analysis-sets → list registered sets
  - GET /analyze/{name} → trigger analysis, return stream
  - GET /results/{name} → cached results
- WebSocket for live progress updates
- Background worker for analysis jobs

**Frontend:**
- Vue.js or Svelte (lightweight)
- D3.js for treemap visualization
- Real-time progress indicator during analysis
- Interactive features:
  - Click to drill down
  - Hover for tooltips
  - Search/filter files
  - Compare two analysis sets side-by-side
  - Time-series view (if multiple snapshots)

**Visualization:**
- Zoomable treemap (smooth transitions)
- Color coding: by language, by size, by change frequency (later)
- Size legend and controls
- Export to PNG/SVG

**Benefits:**
- Rich interactivity (zoom, pan, filter, search)
- Live feedback during long analysis runs
- Compare multiple analyses
- Shareable URLs (if deployed)
- Modern, polished UX

**Trade-offs:**
- Requires running server (localhost or deployed)
- Build step for frontend (npm/vite)
- More complex architecture
- Dependency on JavaScript ecosystem
- Not usable via SSH/terminal only

**Implementation:**
- Backend: Flask + SQLite (reuse existing DB)
- Frontend: Vite + Vue + D3
- Development: concurrent dev servers (Python + Vite)
- Production: bundle frontend, serve via Flask static files

---

## Comparison Matrix

| Criterion | Terminal | Static HTML | Web App |
|-----------|----------|-------------|---------|
| Setup complexity | Minimal | Low | High |
| Runtime dependencies | None | Browser | Browser + Server |
| Interactivity | Low | Medium | High |
| Visual richness | Low | Medium | High |
| Works over SSH | Yes | No | No |
| Shareable | Copy-paste | File sharing | URL or file |
| Version controllable | N/A (terminal output) | Yes | Frontend only |
| Analysis speed feedback | Immediate | Post-analysis | Live streaming |
| Accessibility | High | Medium | Medium |
| Maintenance burden | Low | Low | High |

## Assumption Tests

- [ ] Line counting accuracy within 5% of cloc
- [ ] Treemap renders 1M+ LOC codebase
- [ ] Drill-down interaction feels intuitive
- [ ] New user generates first visualization in <5 minutes

## Implementation Notes

**Dependencies:** Repository management (001)
**Blocks:** Git history overlay, metric visualization
