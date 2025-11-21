# Ainalyzer Development Plan

**Format:** Now / Next / Later

This plan follows a focused approach where we work on exactly one thing at a time in the "Now" section. When that's complete, we pull from "Next." The "Later" section references our product brief for the full roadmap.

---

## Now

**Repository Configuration System**

Build the foundation for managing multiple repositories using `.meta` format (compatible with harmony-labs/meta CLI). Sub-repositories will be checked out under this repo. Implement validation and repository listing functionality.

**Why this first:** Everything else depends on knowing which repositories to analyze. This is the entry point for all analysis workflows.

---

## Next

1. **Code Volume Analysis**
   - Implement language-agnostic line counting
   - Generate structured JSON output with file/directory/repository metrics
   - Validate against cloc for accuracy

2. **Basic Vue Frontend Setup**
   - Initialize Vue.js project structure
   - Create layout for report viewing
   - Implement data loading from JSON files

3. **Interactive Treemap Visualization**
   - Integrate D3.js or similar library
   - Implement WinDirStat-style treemap rendering
   - Add click-to-drill-down navigation

---

## Later

See [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md) for full feature roadmap including:
- Git history analysis (Code Maat integration)
- Metric overlay system
- AI interpretation toolkit
- Activity metrics
- Performance optimization
