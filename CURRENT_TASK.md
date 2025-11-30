# Current Task

> **Purpose:** This file points to the opportunity we're currently working on and tracks its status. Keep this file updated as work progresses.

**Last Updated:** 2025-11-30

## Active Task

**Git Change Statistics (012)** - Phase 1: Backend Data Collection

> [docs/opportunities/012-git-change-statistics.md](./docs/opportunities/012-git-change-statistics.md)

**Goal:** Add per-file commit statistics to `aina analyze` output to reveal where changes are happening.

**Spike completed:** `spikes/git-stats/` - validated algorithm and performance

### Progress

- [x] Research git statistics approaches (spike)
- [x] Validate bulk query performance (~0.3s for 9.5k files)
- [x] Validate rename detection with --follow
- [x] Create opportunity document (012)
- [ ] Port `get_file_stats()` to `aina_lib.py`
- [ ] Write tests for git stats collection
- [ ] Integrate with `analyze_repos()`
- [ ] Update JSON output schema
- [ ] Test with cos and eessi-pensjon

### Data to collect per file

```json
{
  "commits": {
    "last_3_months": 5,
    "last_year": 23,
    "last_commit_date": "2025-11-15T14:32:00+01:00"
  }
}
```

### Reference Implementation

See `spikes/git-stats/git_file_stats.py` for the validated algorithm.

---

## Recently Completed

**Exclusion Patterns (003)** - Complete 2025-11-30

> [docs/opportunities/003-analysis-exclusion-patterns.md](./docs/opportunities/003-analysis-exclusion-patterns.md)

**Delivered (Phase 1 + Phase 2):**
- Parse .clocignore patterns from analysis root and all repo subdirectories
- Client-side tree filtering via Vue computed property
- Settings toggle "Hide .clocignore files" (default: on)
- Right-click context menu with 6 exclusion options (stays within viewport)
- Custom exclusions stored in preferences (localStorage, scoped per analysis)
- Settings panel with scrollable exclusion list (toggle/remove/add)
- Patterns editable inline (click to edit, blur to save)
- Combined filtering of .clocignore + custom exclusions
- picomatch-browser for proper gitignore-style glob matching (`**/test/resources/**/*.json` etc.)
- 185 passing frontend tests

**Implementation:**
- Pattern utilities: `frontend/src/utils/clocignore.js` (picomatch-browser)
- ExclusionMenu: `frontend/src/components/ExclusionMenu.vue` (viewport-aware positioning)
- API endpoint: `/api/clocignore` in `frontend/vite.config.js`
- Preferences: `filters.hideClocignore`, `filters.customExclusions`
- Helpers: `addExclusion`, `removeExclusion`, `toggleExclusion`, `updateExclusion`
- Integration: Context menu + combined pattern filtering in App.vue

---

**Code Viewing (006)** - Completed 2025-11-29

> [docs/opportunities/archive/006-code-viewing.md](./docs/opportunities/archive/006-code-viewing.md)

**Delivered:**
- FileViewer modal with syntax highlighting (highlight.js)
- API endpoint `/api/file` with path validation (prevents directory traversal)
- Double-click to open: first click zooms to file, second click opens viewer
- Full breadcrumb path display in viewer header
- 83 passing tests

---

**Color by File Type (010)** - Completed 2025-11-29

> [docs/opportunities/archive/010-color-by-filetype.md](./docs/opportunities/archive/010-color-by-filetype.md)

**Delivered:**
- Toggle between depth-based and file type-based coloring in Settings
- 60-color tiered palette (Classic_20 extended with darker/lighter variants)
- Frequency-based color assignment with tier escalation
- Colors stable across navigation within an analysis

---

For broader context, see [PLAN.md](./PLAN.md) and [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md).
