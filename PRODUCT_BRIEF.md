# Product Brief: Ainalyzer

**Version:** 1.0
**Last Updated:** 2025-11-21
**Product Owner:** Kjetil
**Status:** Planning

---

## Executive Summary

Ainalyzer is a multi-repository analysis tool that helps development teams understand and communicate about their codebase landscape. By combining code metrics, Git history analysis, and AI-powered insights, it provides interactive visualizations that reveal where code lives, how it changes, and who works on it—without prescriptive quality judgments.

---

## Problem Statement

Development teams struggle to understand the landscape of multiple repositories they maintain. Questions like "Where is most of our code?", "What areas change most frequently?", "Who works on what?", and "What's actually in this repo?" require manual exploration, specialized tools, or tribal knowledge.

**Pain Points:**
- No unified view across multiple team-owned repositories
- Change patterns and hotspots hidden in Git history
- Time-consuming manual exploration of unfamiliar codebases
- Difficult to communicate codebase structure to stakeholders
- Existing tools focus on code quality metrics rather than understanding

---

## Target Audience

### Primary Users
**Development Teams (5-15 people)**
- Teams managing multiple repositories (1-2M LOC total)
- Need to understand their own codebase landscape
- Want to communicate structure and patterns to stakeholders

### User Needs
- Quick visual overview of code distribution across repositories
- Identification of change hotspots and activity patterns
- AI-assisted exploration of unfamiliar code areas
- Shareable, interactive reports for team discussions

---

## Solution Overview

A local-first analysis tool with two components:

**Backend (Analysis Engine)**
- Processes configured Git repositories
- Generates code volume metrics
- Extracts Git history patterns using Code Maat
- Produces structured data files

**Frontend (Vue.js Web App)**
- Interactive WinDirStat-style treemap visualization
- Overlay system for multiple metric types (size, churn, activity)
- AI-powered prompt toolkit for codebase interpretation
- Web-based reports for exploration and sharing

---

## Key Features

### MVP Features (Priority Order)

1. **Repository Configuration System**
   - Define repositories via GitHub `org/repo` format
   - Support automated checkout and manual directory pointers
   - YAML/JSON manifest for tracked repositories

2. **Code Volume Treemap**
   - Language-agnostic line counting
   - Interactive SVG treemap (WinDirStat style)
   - Drill-down by repository/directory/file
   - Clickable navigation

3. **Git History Analysis**
   - Integration with Code Maat toolkit
   - Change frequency (churn) analysis
   - Hotspot identification

4. **Metric Overlay System**
   - Toggle between size and change frequency views
   - Combined visualization of multiple metrics
   - Color-coded heatmap for change patterns

5. **AI Interpretation Toolkit**
   - Curated prompts for codebase understanding
   - Pattern discovery and architecture insights
   - Natural language exploration of analysis data

6. **Activity Metrics**
   - Contributor statistics
   - Pull request patterns
   - Change frequency over time

### Explicitly Out of Scope
- Code quality/style metrics
- Linting or formatting analysis
- Multi-user/server deployment (MVP)
- Real-time collaboration features

---

## User Stories

**As a team lead**, I want to see where our code is concentrated so I can identify areas of technical investment.

**As a developer**, I want to identify change hotspots so I can understand which areas are most volatile.

**As a new team member**, I want AI-assisted exploration so I can quickly understand unfamiliar repositories.

**As a product manager**, I want shareable visual reports so I can communicate codebase structure to stakeholders.

---

## Competitive Analysis

### Existing Tools

**CodeScene**
- Strength: Mature Git analysis, behavioral code analysis
- Gap: Commercial product, prescriptive quality focus
- Our Differentiator: Local-first, explanation-focused, free

**GitHub Insights**
- Strength: Native integration, contributor analytics
- Gap: Single-repo focus, no cross-repo visualization
- Our Differentiator: Multi-repo treemap, change overlays

**cloc / tokei**
- Strength: Fast line counting
- Gap: Text output only, no visualization or history
- Our Differentiator: Interactive visualization, Git integration

**WinDirStat / DaisyDisk**
- Strength: Excellent treemap UX
- Gap: Disk usage only, no code awareness
- Our Differentiator: Code-specific metrics, change patterns

---

## Success Metrics

### Product Success
- **Adoption:** Used by at least 3 teams within 6 months
- **Engagement:** Teams generate reports weekly
- **Value:** Teams report using insights in planning discussions

### Technical Success
- **Performance:** Analyze 2M LOC repository set in <10 minutes
- **Accuracy:** Line count variance <5% vs cloc
- **Usability:** New user generates first report in <5 minutes

### Qualitative Goals
- Teams describe codebase structure more effectively
- Reduced time to onboard new developers to codebase
- Increased awareness of change patterns and hotspots

---

## Technical Architecture

### Stack
- **Frontend:** Vue.js web application
- **Backend:** CLI-based analysis scripts (language TBD)
- **Storage:** File-based output with optional SQLite caching
- **External Tools:** Code Maat, Git CLI
- **Deployment:** Local execution (macOS), future server option

### Architecture Pattern
```
┌─────────────────────┐
│  Repository Config  │
│   (YAML/JSON)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Analysis Backend   │
│  - Code counting    │
│  - Git history      │
│  - Code Maat        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Data Files        │
│   (JSON/SQLite)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Vue Frontend      │
│  - Treemap viz      │
│  - Overlays         │
│  - AI prompts       │
└─────────────────────┘
```

---

## Assumptions & Risks

### Assumptions
- Teams have local Git repository access
- macOS development environment (initial target)
- Vue.js acceptable frontend choice (matches workplace standard)
- Code Maat remains available and maintained
- File-based caching sufficient for MVP

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Repository size exceeds performance targets | High | Implement incremental analysis, file caching |
| Code Maat insufficient for analysis needs | Medium | Research alternative Git analysis tools |
| Treemap UX doesn't match WinDirStat quality | Medium | Evaluate D3.js libraries, consider React alternatives |
| AI prompts provide low value | Low | Curate from existing prompt libraries, iterate |
| Limited adoption outside initial team | Medium | Focus on team-specific value, gather feedback |

---

## Development Timeline

### Phase 1: Foundation (Weeks 1-4)
- Repository configuration system
- Basic code counting
- File-based output structure

### Phase 2: Visualization (Weeks 5-8)
- Vue.js app setup
- Basic treemap rendering
- Interactive navigation

### Phase 3: Git Analysis (Weeks 9-12)
- Code Maat integration
- Churn analysis
- Metric overlay system

### Phase 4: Intelligence (Weeks 13-16)
- AI prompt toolkit
- Activity metrics
- Report generation

### Phase 5: Polish (Weeks 17-20)
- Performance optimization
- UX refinement
- Documentation

---

## Implementation Philosophy

**Build incrementally, deliver value continuously**
- Focus on high-value visualizations first
- Integrate proven tools (Code Maat) over building from scratch
- Curate effective prompts rather than inventing new ones
- Prioritize explanation and understanding over prescription

**Team-focused design**
- Tool for teams to understand their own world
- No judgmental quality metrics—only size and change
- AI as interpretation layer, not replacement for human insight
- Support discussion and communication, not enforcement

---

## Open Questions

- [ ] Should repository checkout be fully automated or pointer-based?
- [ ] Which specific Code Maat analyses provide most value?
- [ ] What D3.js/visualization library best matches WinDirStat UX?
- [ ] Which prompt libraries exist for codebase exploration?
- [ ] Should we support repository groups/workspaces?

---

## Appendix

### References
- Code Maat: Adam Tornhill's Git analysis toolkit
- WinDirStat: Reference UX for treemap interaction
- Vue.js: Frontend framework (workplace standard)

### Related Documents
- Technical architecture (TBD)
- API specifications (TBD)
- User research findings (TBD)
