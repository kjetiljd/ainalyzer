# Opportunities Index

**Purpose:** Catalog and prioritize feature opportunities using Impact/Effort scoring.

**Last Updated:** 2025-11-24

## Prioritization Framework

Each opportunity is scored on three dimensions:

**Impact** (1-5): User value delivered
- 5 = Critical / Game-changing
- 4 = High value / Significant improvement
- 3 = Moderate value / Nice to have
- 2 = Low value / Minor improvement
- 1 = Negligible value

**Effort** (1-5): Time and resources required
- 5 = Very high / Multiple weeks
- 4 = High / 1-2 weeks
- 3 = Moderate / 3-5 days
- 2 = Low / 1-2 days
- 1 = Very low / Hours

**Complexity** (1-5): Impact on future development
- 5 = Significantly complicates / Adds tight coupling, tech debt
- 4 = Moderately complicates / Increases maintenance burden
- 3 = Neutral / Neither simplifies nor complicates
- 2 = Slightly simplifies / Reduces some coupling or duplication
- 1 = Significantly simplifies / Enables future features, reduces debt

**Priority Score** = Impact / Effort
- Higher score = higher priority
- Balances user value against implementation cost
- Complexity tracked separately as risk indicator

## Active Opportunities

| # | Opportunity | Impact | Effort | Complexity | Score | Status |
|---|-------------|--------|--------|------------|-------|--------|
| 007 | [Context Stats Panel](#007-context-stats-panel) | 4 | 2 | 2 | 2.00 | Identified |
| 003 | [Exclusion Patterns](#003-exclusion-patterns) | 3 | 2 | 2 | 1.50 | Identified |
| 004 | [Treemap Labels](#004-treemap-labels) | 4 | 3 | 3 | 1.33 | ✅ Complete |
| 002 | [Code Visibility](#002-code-visibility) | 5 | 4 | 3 | 1.25 | ✅ Complete |
| 009 | [User Preferences](#009-user-preferences) | 4 | 4 | 1 | 1.00 | Identified |
| 006 | [Code Viewing](#006-code-viewing) | 3 | 3 | 3 | 1.00 | Identified |
| 008 | [Cushion Treemap](#008-cushion-treemap) | 2 | 2 | 4 | 1.00 | Identified |
| 005 | [Deep Module Refactoring](#005-deep-module-refactoring) | 2 | 3 | 1 | 0.67 | Identified |

**Sorted by priority score (descending)**

**Notes:**
- Complexity measures future impact, not implementation difficulty
- Low complexity (1-2) = simplifies future development (good)
- High complexity (4-5) = complicates future development (bad)
- When choosing between equal-priority: prefer low complexity
- High effort + low complexity = hard now, easier later (invest in foundation)

## Opportunity Details

### 007: Context Stats Panel

**Impact:** 4 | **Effort:** 2 | **Complexity:** 2 | **Score:** 2.00

**Status:** Identified | **Parent:** 002 (Code Visibility)

Show aggregate statistics (total lines, file count, directory count) that update when drilling down. Based on D3 spike design.

**Why High Priority:**
- Quick win (2-3 hours implementation)
- High user value (quantifies what you're looking at)
- Proven design from spike
- No dependencies

**Next Steps:** Implement horizontal stats bar (Solution 1)

[View opportunity →](007-context-stats-panel.md)

---

### 004: Treemap Labels

**Impact:** 4 | **Effort:** 3 | **Complexity:** 3 | **Score:** 1.33

**Status:** ✅ Complete (2025-11-24) | **Parent:** 002 (Code Visibility)

Add readable labels directly in treemap cells with three-tier progressive disclosure.

**Delivered:**
- 60x30px: Filename only
- 100x50px: Filename + line count
- 150x80px: Filename + line count + language
- Automatic text color contrast
- Ellipsis truncation
- Fade-in animation

[View opportunity →](004-treemap-labels.md)

---

### 003: Exclusion Patterns

**Impact:** 3 | **Effort:** 2 | **Complexity:** 2 | **Score:** 1.50

**Status:** Identified | **Parent:** 002 (Code Visibility)

Allow users to exclude files/directories from analysis using .gitignore-style patterns.

**Why High Priority:**
- Common pain point (node_modules, .git clutter)
- Moderate impact (cleaner visualizations)
- Low effort (pattern matching logic)
- Blockers: None

**Next Steps:** Implement backend exclusion logic in `aina analyze`

[View opportunity →](003-analysis-exclusion-patterns.md)

---

### 009: User Preferences

**Impact:** 4 | **Effort:** 4 | **Complexity:** 1 | **Score:** 1.00

**Status:** Identified | **Parent:** Infrastructure

Persistent user configuration for visualization behavior, appearance, filters, and navigation.

**Why Important:**
- Foundation for many other features (toggles cushion treemap, stats panel, etc.)
- Enables customization and personalization
- Required by: 007, 008, future features
- **Low complexity:** Simplifies future features (just add preference toggle)

**Trade-off:** Higher effort upfront, but dramatically simplifies future development

**Next Steps:** Implement hybrid approach (localStorage + URL params)

[View opportunity →](009-user-preferences.md)

---

### 006: Code Viewing

**Impact:** 3 | **Effort:** 3 | **Complexity:** 3 | **Score:** 1.00

**Status:** Identified | **Parent:** 002 (Code Visibility)

View source code when clicking file nodes in treemap.

**Why Moderate Priority:**
- Useful but not critical (can open files in editor)
- Moderate effort (backend API + modal component)
- Moderate impact (nice to have, not essential)

**Next Steps:** Implement modal overlay with syntax highlighting

[View opportunity →](006-code-viewing.md)

---

### 008: Cushion Treemap

**Impact:** 2 | **Effort:** 2 | **Complexity:** 4 | **Score:** 1.00

**Status:** Identified | **Parent:** 002 (Code Visibility)

WinDirStat-style 3D visual effect using gradient shading for depth perception.

**Why Lower Priority:**
- Cosmetic enhancement (doesn't add functionality)
- Low impact (aesthetic preference)
- **High complexity:** Alternative rendering approach complicates treemap logic
- Can be done incrementally (CSS gradients → full algorithm)

**Dependencies:** Should implement after 009 (preferences) for toggle control

**Next Steps:** Experiment with CSS radial gradients

[View opportunity →](008-cushion-treemap.md)

---

### 002: Code Visibility

**Impact:** 5 | **Effort:** 4 | **Complexity:** 3 | **Score:** 1.25

**Status:** ✅ Complete (2025-11-23) | **Parent:** Root

Teams can see where code lives across repositories at a glance.

**Delivered:**
- `aina analyze` command with cloc integration
- Vue.js frontend with D3 treemap visualization
- Interactive drill-down navigation
- Real-time hover tooltips
- Analysis selector dropdown
- Zero manual steps - complete automation

[View opportunity →](002-code-visibility.md)

---

### 005: Deep Module Refactoring

**Impact:** 2 | **Effort:** 3 | **Complexity:** 1 | **Score:** 0.67

**Status:** Identified | **Parent:** Technical Debt

Refactor backend to follow Ousterhout's deep module principles.

**Why Moderate Priority:**
- Internal quality improvement (no user-facing features)
- Moderate effort (10-14 hours across 4 phases)
- Low immediate impact (maintenance benefit)
- **Low complexity:** Explicitly reduces future complexity (that's the goal!)
- No user-visible changes

**Note:** Score reflects internal quality work, but low complexity means it pays dividends long-term

**When to Tackle:** When adding features that would benefit from better architecture, or during dedicated refactoring time

[View opportunity →](005-deep-module-refactoring.md)

---

## Prioritization Guidelines

### When to Work on an Opportunity

**Do Now (Score >1.5):**
- High impact, low effort
- Quick wins that deliver immediate value
- Build momentum with visible progress
- Check complexity: low risk makes these ideal

**Do Next (Score 1.0-1.5):**
- Moderate impact/effort balance
- Important but not urgent
- Plan and schedule deliberately
- Consider complexity: high complexity = more planning needed

**Do Later (Score 0.5-1.0):**
- Low impact or high effort
- Nice to have, not essential
- Consider when prerequisites are met
- High complexity + low score = avoid unless strategic

**Don't Do (Score <0.5):**
- Negligible value
- Better alternatives exist
- Archive if consistently deprioritized

### Re-scoring Triggers

Re-evaluate scores when:
- User feedback changes perceived impact
- Technical discoveries change effort estimate
- Dependencies are completed (unlock new opportunities)
- Product strategy shifts

### Dependencies and Sequencing

Some opportunities should be implemented in sequence:

1. **Foundation:** 009 (User Preferences) enables 007, 008, and future toggles
2. **Infrastructure:** 002 (Code Visibility) must complete before child opportunities
3. **Incremental:** 008 (Cushion Treemap) can start with CSS, upgrade to full algorithm later

## Opportunity Lifecycle

```
Identified → Next → In Progress → Complete → Archive
     ↓         ↓         ↓            ↓          ↓
  (This index) (PLAN.md) (CURRENT_TASK.md) (docs) (archive/)
```

**Identified:** Documented in opportunity file, scored here
**Next:** Listed in PLAN.md "Next" section
**In Progress:** Active task in CURRENT_TASK.md
**Complete:** Marked complete in opportunity doc + CURRENT_TASK.md
**Archive:** Moved to `docs/opportunities/archive/` when outdated

## Scoring History

| Date | Opportunity | Impact | Effort | Complexity | Score | Rationale |
|------|-------------|--------|--------|------------|-------|-----------|
| 2025-11-24 | 007 | 4 | 2 | 2 | 2.00 | Adds component, slightly simplifies stats display |
| 2025-11-24 | 003 | 3 | 2 | 2 | 1.50 | Pattern logic, slightly simplifies future filtering |
| 2025-11-24 | 006 | 3 | 3 | 3 | 1.00 | Modal + API, neutral impact on architecture |
| 2025-11-24 | 008 | 2 | 2 | 4 | 1.00 | Alternative rendering approach, complicates treemap |
| 2025-11-24 | 009 | 4 | 4 | 1 | 1.00 | Foundation enabling many features, simplifies future |
| 2025-11-24 | 005 | 2 | 3 | 1 | 0.67 | Refactor explicitly reduces complexity, 10-14h estimate |
| 2025-11-23 | 004 | 4 | 3 | 3 | 1.33 | Label rendering, neutral (SVG complexity) |

## Archive

Completed opportunities are moved to `archive/` with completion date:

- [001-analysis-set-registration.md](archive/001-analysis-set-registration.md) - Completed 2025-11-21

## Notes

- Scores are subjective and should be discussed/adjusted as team learns
- Priority score is a guide, not a rule - consider strategic fit and dependencies
- Small high-impact wins build momentum (prefer score 12+ opportunities)
- Large efforts (score 4-5) should be broken into smaller opportunities when possible
- Re-score quarterly or when circumstances change significantly

## Quick Reference

**Formula:** Priority = Impact / Effort

**Impact scale:**
- 5 = Critical
- 4 = High
- 3 = Moderate
- 2 = Low
- 1 = Negligible

**Effort scale:**
- 5 = Weeks
- 4 = 1-2 weeks
- 3 = 3-5 days
- 2 = 1-2 days
- 1 = Hours

**Complexity scale (architectural impact):**
- 5 = Significantly complicates future development
- 4 = Moderately complicates (maintenance burden)
- 3 = Neutral (no architectural impact)
- 2 = Slightly simplifies (reduces coupling/duplication)
- 1 = Significantly simplifies (enables features, reduces debt)

**Decision matrix:**
- High score + Low complexity (1-2) = Do now (value + foundation)
- High score + High complexity (4-5) = Reconsider (value but tech debt)
- Low score + Low complexity (1-2) = Maybe later (investment in foundation)
- Low score + High complexity (4-5) = Avoid (low value, adds debt)
