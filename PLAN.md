# Ainalyzer Development Plan

**Format:** Now / Next / Later

This plan follows a focused approach where we work on exactly one thing at a time in the "Now" section. When that's complete, we pull from "Next." The "Later" section references our product brief for the full roadmap.

---

## Now

*No active task. Pull from Next when ready.*

---

## Next

1. **Change pattern awareness** - Hidden hotspots and change frequency buried in Git history
   - Git history overlays for treemap
   - Integration with Code Maat for churn analysis
   - Color-coded visualization of change hotspots

2. **Codebase comprehension** - Teams need AI assistance to understand unfamiliar code areas
   - AI-powered prompt toolkit
   - Pattern discovery and architecture insights
   - Natural language exploration of analysis data

---

## Later

**Refactor aina_lib.py to improve cohesion** (paused)
- OO redesign: Database class done, remaining phases: RepositoryScanner, ClocRunner, TreeBuilder, Analyzer, AnalysisIndex
- Maintain 21 passing tests

See [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md) for full feature roadmap including:
- Git history analysis (Code Maat integration)
- Metric overlay system
- AI interpretation toolkit
- Activity metrics
- Performance optimization
