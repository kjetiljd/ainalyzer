# 013: Analysis Report

**Impact:** 3 | **Effort:** 2 | **Complexity:** 2 | **Score:** 1.50

**Status:** Identified | **Parent:** 002 (Code Visibility)

## Opportunity

Generate a shareable Markdown report from the web UI that summarizes analysis results with key statistics.

## Why This Matters

- Teams need to share analysis insights with stakeholders
- A static report captures a point-in-time snapshot
- Markdown format works everywhere (GitHub, Slack, email)
- No presentation prep needed - instant summary

## Proposed Solution

### Report Sections

**1. Metadata Header**
- Analysis set name
- Generated date
- Root path analyzed

**2. Configuration**
- List of repositories included
- .clocignore patterns (from all repos)
- Custom exclusion patterns (user-defined)

**3. Repository Summary Table**

| Repository | Lines | Files | Unchanged Files | % Unchanged |
|------------|-------|-------|-----------------|-------------|
| repo-a     | 45,230 | 312  | 287             | 92%         |
| repo-b     | 12,100 | 89   | 45              | 51%         |
| **Total**  | 57,330 | 401  | 332             | 83%         |

**4. Aggregate Statistics**
- Total lines of code
- Total files
- Files by language (top 10)
- Files without changes (last 3 months, last year)
- Average file size (lines)

### Implementation

**Frontend (Vue):**
- "Export Report" button in UI (settings panel or toolbar)
- Gather data from current analysis JSON
- Generate Markdown string
- Download as `.md` file or copy to clipboard

**No backend changes needed** - all data already available in analysis JSON.

## Open Questions

- [ ] Include file type breakdown?
- [ ] Show top 10 largest files?
- [ ] Activity summary (hotspots)?
- [ ] Time range filter for "unchanged" definition?

## Acceptance Criteria

- [ ] Export button generates valid Markdown
- [ ] Report includes all configured exclusions
- [ ] Repository table shows correct statistics
- [ ] Report opens correctly in GitHub/VS Code preview
