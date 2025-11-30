# Current Task

> **Purpose:** This file points to the opportunity we're currently working on and tracks its status. Keep this file updated as work progresses.

**Last Updated:** 2025-12-01

## Active Task

None - ready for next task.

**Candidates:**
- Browser Back Button (011) - Push state on drill-down, deep linking

---

## Recently Completed

**Git Change Statistics (012)** - Complete 2025-12-01

> [docs/opportunities/012-git-change-statistics.md](./docs/opportunities/012-git-change-statistics.md)

**Delivered (Phase 1 + Phase 2):**
- Per-file commit statistics in `aina analyze` output
- Bulk git log query with rename detection (--follow for renamed files)
- commits field on all file nodes: `{last_3_months, last_year, last_commit_date}`
- Files with no changes get 0 values (not omitted)
- Activity color mode with Viridis palette (purple=stable, yellow=hot)
- Log scale excluding zeros for better color distribution
- Commit count shown in large cell labels (activity mode)
- Status bar shows "X lines, Y changes" on hover
- 33 backend tests, 185 frontend tests

**Implementation:**
- Backend: `get_file_stats()`, `get_file_stats_with_follow()` in `aina_lib.py`
- Frontend: `getActivityColor()` in `colorUtils.js`, activity mode in Treemap.vue
- Settings: Color mode radio buttons (depth/filetype/activity)

---

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
- picomatch-browser for proper gitignore-style glob matching

---

**Code Viewing (006)** - Completed 2025-11-29

> [docs/opportunities/archive/006-code-viewing.md](./docs/opportunities/archive/006-code-viewing.md)

**Delivered:**
- FileViewer modal with syntax highlighting (highlight.js)
- API endpoint `/api/file` with path validation (prevents directory traversal)
- Double-click to open: first click zooms to file, second click opens viewer
- Full breadcrumb path display in viewer header

---

For broader context, see [PLAN.md](./PLAN.md) and [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md).
