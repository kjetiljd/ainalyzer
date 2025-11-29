# Ainalyzer Development Plan

**Format:** Now / Next / Later

This plan follows a focused approach where we work on exactly one thing at a time in the "Now" section. When that's complete, we pull from "Next." The "Later" section references our product brief for the full roadmap.

---

## Now

**Exclusion Patterns (003)** - UI filtering of .clocignore files

### Phase 1: UI Filtering of .clocignore (TDD)

Analysis already includes all files. Frontend filters out files matching .clocignore patterns.

**Tests First:**

1. `clocignore.test.js` - Pattern parsing
   - `parseClocignore('')` returns empty array
   - `parseClocignore('*.lock')` returns `['*.lock']`
   - Comments (`#`) and blank lines ignored
   - Negation patterns (`!important.lock`) supported

2. `clocignore.test.js` - Pattern matching
   - `matchesPattern('package-lock.json', '*.lock')` → false (glob mismatch)
   - `matchesPattern('yarn.lock', '*.lock')` → true
   - `matchesPattern('test/fixtures/data.json', 'test/fixtures/**')` → true
   - `matchesPattern('src/app.js', 'test/**')` → false

3. `clocignore.test.js` - Tree filtering
   - `filterTree(tree, patterns)` removes matching files
   - Directories with no remaining children removed
   - Empty patterns returns tree unchanged
   - Negation patterns override exclusion

4. `App.vue` integration test
   - `.clocignore` fetched from `/api/clocignore?analysis=<name>`
   - Files matching patterns hidden from treemap
   - Stats recalculated excluding filtered files
   - Toggle "Show excluded files" overrides filter

**Implementation (after tests pass red):**

1. `frontend/src/utils/clocignore.js`
   - `parseClocignore(content)` - parse file content to pattern array
   - `matchesPattern(path, pattern)` - minimatch-style glob matching
   - `filterTree(tree, patterns)` - recursive tree filter

2. `frontend/vite.config.js`
   - API endpoint `/api/clocignore` reads `.clocignore` from analysis root_path

3. `frontend/src/App.vue`
   - Fetch `.clocignore` on analysis load
   - Apply `filterTree` before passing to Treemap
   - Add toggle to usePreferences

4. `frontend/src/components/StatsBar.vue`
   - Recalculate stats from filtered tree (not analysis JSON stats)

**Default:** Filter enabled (hide .clocignore matches)

---

### Phase 2: Backend .clocignore Support (Future)

Run cloc with filtered file list for accurate backend stats:
- `get_files_with_exclusions()` using git pathspec
- `run_cloc()` uses `--list-file` instead of `--vcs=git`

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
