# Ainalyzer Development Plan

**Format:** Now / Next / Later

This plan follows a focused approach where we work on exactly one thing at a time in the "Now" section. When that's complete, we pull from "Next." The "Later" section references our product brief for the full roadmap.

---

## Now

**Refactor aina_lib.py to improve cohesion** - Started 2025-11-24

Restructure aina_lib.py using OO design to improve cohesion without splitting into multiple files.

- Convert procedural code to class-based design
- Each class has single, clear responsibility
- Maintain all existing tests (21 passing tests)
- Stepwise refactoring with test verification at each step

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

See [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md) for full feature roadmap including:
- Git history analysis (Code Maat integration)
- Metric overlay system
- AI interpretation toolkit
- Activity metrics
- Performance optimization
