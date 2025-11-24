# Current Task

> **Purpose:** This file points to the opportunity we're currently working on and tracks its status. Keep this file updated as work progresses.

**Last Updated:** 2025-11-24

## Active Task

**Refactor aina_lib.py to improve cohesion** - Started 2025-11-24

→ [PLAN.md](./PLAN.md)

**Goal:** Restructure aina_lib.py using OO design to improve cohesion without splitting into multiple files.

**Approach:** Stepwise refactoring with test verification at each step

**Phase 1: Database class** (NEXT)
- Extract Database class with context manager
- Replace all init_database/cursor patterns
- Run tests → verify 21 passing

**Phase 2: RepositoryScanner & ClocRunner**
- Extract RepositoryScanner.discover()
- Extract ClocRunner.analyze()
- Run tests → verify 21 passing

**Phase 3: TreeBuilder class**
- Extract TreeBuilder with build() and to_schema()
- Run tests → verify 21 passing

**Phase 4: Analyzer class**
- Extract Analyzer with progress callback
- Run tests → verify 21 passing

**Phase 5: AnalysisIndex class**
- Extract AnalysisIndex
- Run tests → verify 21 passing

**Phase 6: Update cmd_* functions**
- Simplify to thin wrappers using new classes
- Run tests → verify 21 passing

**Success criteria:**
- All 21 tests pass at every step
- Improved cohesion (each class has single responsibility)
- No behavioral changes (same CLI interface)
- Single file (no file sprawl)

---

## Recently Completed

**User Preferences and Configuration (009)** - Completed 2025-11-24

→ [docs/opportunities/009-user-preferences.md](./docs/opportunities/009-user-preferences.md)

**Delivered:**
- usePreferences composable (localStorage + URL params hybrid)
- 12 passing tests for preferences system
- Analysis selection persistence via localStorage
- URL param `?analysis=name` overrides stored preference
- URL updates automatically when selection changes
- General-purpose design for future preferences

**Implementation:**
- Composable: `frontend/src/composables/usePreferences.js`
- Tests: `frontend/src/__tests__/usePreferences.test.js`
- Integration: `frontend/src/App.vue`

---

**Context-Aware Statistics Panel** - Completed 2025-11-24

→ [docs/opportunities/archive/007-context-stats-panel.md](./docs/opportunities/archive/007-context-stats-panel.md)

**Goal:** Show aggregate statistics for current treemap view that updates when drilling down.

**Delivered:**
- StatsBar.vue component with reactive computed properties
- Horizontal layout between breadcrumb and treemap (matches spike design)
- Three statistics: total lines (formatted), file count, directory count
- Recursive calculations that work at any tree depth
- Automatic updates on navigation (drill-down and breadcrumb)
- Styling consistent with breadcrumb (colors, font size, scrollbar)
- Bullet separators between stats

**Implementation:**
- Component: `frontend/src/components/StatsBar.vue`
- Integration: `frontend/src/App.vue` (updated grid layout to accommodate stats bar)

---

**Treemap In-Cell Labels** - Completed 2025-11-24

→ [docs/opportunities/004-treemap-labels.md](./docs/opportunities/004-treemap-labels.md)

**Goal:** Add readable labels directly in treemap cells to reduce hover dependency.

**Delivered:**
- Three-tier progressive disclosure based on cell size
- 60x30px: Filename only (truncated if needed)
- 100x50px: Filename + line count formatted with toLocaleString()
- 150x80px: Filename + line count + language
- Automatic text color contrast (black/white) based on background luminance
- Ellipsis truncation for long filenames
- Smooth fade-in animation (0.2s)
- Performance: O(n) rendering, no additional overhead

**Impact:** Users can now identify files without hovering. Large cells display rich information at a glance.

---

**Code Visibility** - Completed 2025-11-23

→ [docs/opportunities/002-code-visibility.md](./docs/opportunities/002-code-visibility.md)

**Goal:** Teams can see where code lives across repositories at a glance.

**Approach:** Vue.js single-page app with static deployment (see [ADR 0002](./docs/adr/0002-vue-static-deployment-for-visualization.md))

**Status:** ✅ Complete - MVP delivered and working end-to-end.

**Progress:**
- [x] Spike B: D3 treemap prototype (validated interaction model)
- [x] JSON schema defined (relative paths, file attributes)
- [x] Spike C: cloc integration (validated with todo-meta: 10 repos, 5898 files, 1.5M LOC)
- [x] Backend implementation: `aina analyze`
- [x] Frontend implementation: Vue app with treemap
- [x] Automatic analysis discovery (no manual copying)

**Delivered:**
- `aina analyze` command with cloc integration (respects .gitignore)
- Hierarchical directory tree building (repos → dirs → files)
- JSON output to `~/.aina/analysis/<name>.json`
- Automatic index.json generation listing all analyses
- Vue.js frontend with D3 treemap visualization
- Responsive layout using CSS container queries
- Interactive drill-down navigation with breadcrumbs
- Real-time hover tooltips showing paths and line counts
- Analysis selector dropdown with auto-discovery
- Vite middleware serving analyses via /api/analyses
- **Zero manual steps** - complete automation

**Usage:**
```bash
# 1. Register and analyze
./aina add my-projects ~/code
./aina analyze my-projects

# 2. View in browser
open http://localhost:5173

# 3. Select analysis from dropdown and explore!
```

**Next:** Ready to pull next opportunity from PLAN.md

---

**Analysis Set Registration** - Completed 2025-11-21

→ [docs/opportunities/archive/001-analysis-set-registration.md](./docs/opportunities/archive/001-analysis-set-registration.md)

**Delivered:**
- CLI tool (`aina`) with add, list, remove commands
- SQLite database for persistent storage
- Repository discovery with depth limit
- 21 tests (all passing)
- Zero external dependencies

Pull next task from [PLAN.md](./PLAN.md) when ready.

---

For broader context, see [PLAN.md](./PLAN.md) and [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md).
