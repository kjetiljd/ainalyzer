# Ainalyzer Development Plan

**Format:** Now / Next / Later

This plan follows a focused approach where we work on exactly one thing at a time in the "Now" section. When that's complete, we pull from "Next." The "Later" section references our product brief for the full roadmap.

---

## Now

**Git Change Statistics (012)** - Phase 1: Backend Data Collection

Reveal where changes are happening in the codebase by adding per-file commit statistics.

### Phase 1: Backend Integration

**Goal:** Add git statistics to `aina analyze` output

**Data to collect per file:**
- `commits_3m`: Number of commits in last 3 months
- `commits_1y`: Number of commits in last year
- `last_commit_date`: ISO 8601 timestamp of most recent commit

**Algorithm (validated in spike):**
1. Bulk query: `git log -M --name-status --format=COMMIT|%aI --since="1 year ago"`
2. Parse output, count commits per file, derive 3-month from timestamps
3. For renamed files (R status), use `--follow` for accurate history

**Implementation:**

1. Port `get_file_stats()` from `spikes/git-stats/git_file_stats.py` to `aina_lib.py`
2. Call during `analyze_repos()` after cloc processing
3. Merge git stats into tree nodes by matching file paths
4. Update JSON output to include `commits` field on file nodes

**JSON Schema Addition:**
```json
{
  "name": "file.py",
  "type": "file",
  "value": 150,
  "language": "Python",
  "commits": {
    "last_3_months": 5,
    "last_year": 23,
    "last_commit_date": "2025-11-15T14:32:00+01:00"
  }
}
```

**Tests:**
- `test_get_file_stats_returns_commit_counts()`
- `test_get_file_stats_handles_renamed_files()`
- `test_get_file_stats_empty_repo()`
- `test_analyze_includes_commit_stats_in_output()`

**Acceptance Criteria:**
- [ ] `aina analyze` collects commit stats for all files
- [ ] JSON output includes commits field on file nodes
- [ ] Renamed files show accurate pre-rename history
- [ ] Analysis completes in <5s additional time for typical repos
- [ ] All tests pass

---

## Next

1. **Git Change Statistics (012)** - Phase 2: Frontend Display
   - Show commit stats in hover tooltip
   - Show commit stats in file labels (large cells)
   - Add to FileViewer header

2. **Git Change Statistics (012)** - Phase 3: Activity Overlay
   - Add `colorMode: 'activity'` option to preferences
   - Implement activity-based color scale (cool=stable, hot=active)
   - Toggle in Settings panel

3. **Browser Back Button (011)**
   - Push state on drill-down navigation
   - Listen for popstate events
   - Deep linking support

---

## Later

**Refactor aina_lib.py to improve cohesion** (paused)
- OO redesign: Database class done, remaining phases: RepositoryScanner, ClocRunner, TreeBuilder, Analyzer, AnalysisIndex
- Maintain 21 passing tests

See [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md) for full feature roadmap including:
- Code Maat integration (deeper churn analysis, coupling detection)
- AI interpretation toolkit
- Activity metrics (contributor statistics, PR patterns)
- Performance optimization
