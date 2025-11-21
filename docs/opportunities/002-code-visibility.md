# Opportunity: Code Visibility

**Status:** Next
**Last Updated:** 2025-11-21

## Desired Outcome

Teams can see where code lives across repositories at a glance.

## Opportunity (Problem Space)

**Current State:**
- Unknown code distribution across repositories
- Manual exploration required to understand codebase size
- No visual overview of code structure
- Difficult to identify areas of concentration

**Impact:**
- Time wasted exploring codebases
- Poor understanding of technical investment areas
- Can't communicate structure to stakeholders
- Tribal knowledge required

**User Needs:**
- Quick visual overview of code volume
- Understand relative sizes of components
- Drill down from repository to file level
- Language-agnostic counting

## Solutions (Explored)

### Code Volume Analysis + Treemap Visualization

**Component 1: Analysis Backend**
- Language-agnostic line counting
- Structured JSON output (file/directory/repository)
- Validate against cloc for accuracy

**Component 2: Vue Frontend**
- Initialize Vue.js project
- Data loading from JSON files
- Report viewing layout

**Component 3: Interactive Treemap**
- WinDirStat-style visualization
- D3.js or similar library
- Click-to-drill-down navigation
- Size-based color coding

## Assumption Tests

- [ ] Line counting accuracy within 5% of cloc
- [ ] Treemap renders 1M+ LOC codebase
- [ ] Drill-down interaction feels intuitive
- [ ] New user generates first visualization in <5 minutes

## Implementation Notes

**Dependencies:** Repository management (001)
**Blocks:** Git history overlay, metric visualization
