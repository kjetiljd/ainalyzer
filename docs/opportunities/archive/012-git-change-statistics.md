# Opportunity 012: Git Change Statistics

**Status:** Identified
**Parent:** 002 (Code Visibility)
**Created:** 2025-11-30

## Problem

Teams cannot see where changes are happening in their codebase. The current treemap shows code volume (lines of code), but doesn't reveal:
- Which files change frequently (hotspots)
- Which areas have been recently active
- Which files are stable vs volatile

This information is critical for understanding technical risk, planning refactoring, and onboarding new developers.

## Solution

Add per-file commit statistics to the analysis output and visualize change frequency in the treemap.

### Data Collection

For each file, collect:
- `commits_3m`: Number of commits in last 3 months
- `commits_1y`: Number of commits in last year
- `last_commit_date`: ISO 8601 timestamp of most recent commit

### Algorithm (from spike)

1. Run bulk query for 1-year period with rename detection:
   ```bash
   git log -M --name-status --format=COMMIT|%aI --since="1 year ago"
   ```

2. Parse output, count commits per file, derive 3-month counts from timestamps

3. For renamed files (detected via `R` status), run `--follow` to get accurate pre-rename history:
   ```bash
   git log --follow --format=%aI --since="1 year ago" -- path/to/file
   ```

### Performance (validated in spike)

| Dataset | Files | Renames (1y) | Time |
|---------|-------|--------------|------|
| cos | 9,592 | 1 | 0.34s |
| eessi-pensjon (20 repos) | 2,287 | 17 | 0.5s |

Renames add ~250ms each, but are rare in 1-year window (typically 0-17).

### Visualization Options

**Phase 1: Data only**
- Add `commits` object to each file node in JSON output
- No frontend changes yet

**Phase 2: Treemap overlay**
- Toggle between "Size" and "Activity" views
- Activity view: color intensity based on commit frequency
- Gradient from cool (stable) to hot (active)

**Phase 3: Combined view**
- Size = area (lines of code)
- Color = activity (commits)
- Identify large + active files (high-risk hotspots)

## JSON Schema Addition

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

## Implementation Plan

### Phase 1: Backend (aina analyze)

1. Add `get_file_stats()` function to `aina_lib.py` (port from spike)
2. Call during `analyze_repos()` after cloc processing
3. Merge git stats into tree nodes by file path
4. Update JSON output to include commits field

**Files:**
- `aina_lib.py`: Add git stats collection
- `spikes/git-stats/git_file_stats.py`: Reference implementation

### Phase 2: Frontend Display

1. Show commit stats in hover tooltip
2. Show commit stats in file labels (large cells)
3. Add to FileViewer header

**Files:**
- `Treemap.vue`: Update tooltip and labels
- `FileViewer.vue`: Add commit stats display

### Phase 3: Activity Overlay

1. Add `colorMode: 'activity'` option to preferences
2. Implement activity-based color scale
3. Toggle in Settings panel

**Files:**
- `usePreferences.js`: Add colorMode option
- `colorUtils.js`: Add activity color scale
- `Treemap.vue`: Apply activity colors
- `SettingsPanel.vue`: Add colorMode toggle

## Scoring

**Impact:** 4 (High) - Reveals hidden patterns, enables hotspot identification
**Effort:** 3 (Moderate) - Backend integration + frontend visualization
**Complexity:** 2 (Slightly simplifies) - Adds data dimension, reuses existing color infrastructure

**Score:** 4/3 = 1.33

## Dependencies

- Requires 002 (Code Visibility) - Complete
- Benefits from 010 (Color by File Type) - Reuse color infrastructure

## Risks

- **Git performance on very large repos**: Mitigated by bulk query approach (validated in spike)
- **Rename detection overhead**: Mitigated by limiting to 1-year window (few renames)
- **Multi-repo complexity**: Validated in spike with eessi-pensjon (20 repos)

## Acceptance Criteria

**Phase 1:**
- [ ] `aina analyze` collects commit stats for all files
- [ ] JSON output includes commits field on file nodes
- [ ] Renamed files show accurate pre-rename history
- [ ] Analysis completes in <5s additional time for typical repos

**Phase 2:**
- [ ] Hover tooltip shows commit counts
- [ ] Large file labels show last commit info

**Phase 3:**
- [ ] Settings toggle for activity color mode
- [ ] Activity view shows gradient from stable to active
- [ ] Combined view: size=area, color=activity

## References

- Spike: `spikes/git-stats/` (completed 2025-11-30)
- PRODUCT_BRIEF.md: Git History Analysis, Metric Overlay System
- Code Maat: Future integration for deeper analysis (churn, coupling)
