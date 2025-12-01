# Ainalyzer Development Plan

**Format:** Now / Next / Later

This plan follows a focused approach where we work on exactly one thing at a time in the "Now" section. When that's complete, we pull from "Next." The "Later" section references our product brief for the full roadmap.

---

## Now

Ready for next task.

---

## Next

1. **Browser Back Button (011)**
   - Push state on drill-down navigation
   - Listen for popstate events
   - Deep linking support

---

## Later

**Refactor aina_lib.py to improve cohesion** (paused)
- OO redesign: Database class done, remaining phases: RepositoryScanner, ClocRunner, TreeBuilder, Analyzer, AnalysisIndex
- Maintain 33 passing tests

See [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md) for full feature roadmap including:
- Code Maat integration (deeper churn analysis, coupling detection)
- AI interpretation toolkit
- Activity metrics (contributor statistics, PR patterns)
- Performance optimization

---

## Completed

**Git Change Statistics (012)** - Complete 2025-12-01
- Per-file commit statistics in `aina analyze` output
- Activity color mode with Viridis palette
- Status bar and labels show change counts

**Exclusion Patterns (003)** - Complete 2025-11-30
- .clocignore parsing and client-side filtering
- Custom exclusions with context menu

**Code Viewing (006)** - Complete 2025-11-29
- FileViewer modal with syntax highlighting

**Color by File Type (010)** - Complete 2025-11-29
- 60-color tiered palette, stable across navigation

**User Preferences (009)** - Complete 2025-11-29
- localStorage + URL params hybrid

**Cushion Treemap (008)** - Complete 2025-11-29
- 3D gradient effect toggle

**Context Stats Panel (007)** - Complete 2025-11-24
- StatsBar with reactive computed properties

**Treemap Labels (004)** - Complete 2025-11-24
- Three-tier progressive disclosure

**Code Visibility (002)** - Complete 2025-11-23
- Vue.js frontend with D3 treemap
