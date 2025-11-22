# Current Task

> **Purpose:** This file points to the opportunity we're currently working on and tracks its status. Keep this file updated as work progresses.

**Last Updated:** 2025-11-21

## Active Opportunity

**Code Visibility** - Started 2025-11-21

→ [docs/opportunities/002-code-visibility.md](./docs/opportunities/002-code-visibility.md)

**Goal:** Teams can see where code lives across repositories at a glance.

**Approach:** Vue.js single-page app with static deployment (see [ADR 0002](./docs/adr/0002-vue-static-deployment-for-visualization.md))

**Status:** In progress - running spikes to validate technical approach.

**Progress:**
- [x] Spike B: D3 treemap prototype (validated interaction model)
- [x] JSON schema defined (relative paths, file attributes)
- [x] Spike C: cloc integration (validated with todo-meta: 10 repos, 5898 files, 1.5M LOC)
- [ ] Backend implementation: `aina analyze`
- [ ] Frontend implementation: Vue app with treemap

**Current focus:** Backend implementation - build `aina analyze` command.

## Recently Completed

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
