# Product Brief: Ainalyzer

## Overview
Multi-repository analysis tool for code metrics, Git history, and AI-powered structural analysis. Local-first, team-scale tool operating on externally checked-out repositories.

## Core Functionality

### Repository Management
- Configuration accepts GitHub repo identifiers (`org/repo` format)
- Supports both automated checkout and manual directory pointers
- Manifest file for tracked repositories

### Analysis Modules

**1. Code Volume Analysis**
- Line count across all languages (language-agnostic)
- Output: Interactive treemap (WinDirStat-style visualization)
- Granularity: file/directory/repository level

**2. Git History Analysis**
- Leverage Code Maat toolkit (Adam Tornhill's pre-CodeScene work)
- Change frequency heatmap (churn analysis)
- Overlay capabilities on treemap
- Hotspot identification

**3. Activity Metrics**
- Change frequency over time
- Active contributor count and distribution
- Pull request statistics

**4. AI-Powered Analysis**
- Structured prompts for repository understanding
- Pattern and architecture discovery
- Scope: general comprehension tools for unknown codebases

## Technical Architecture

### Stack
- **Frontend**: Vue.js web application for interactive visualization and exploration
- **Backend**: Analysis process (CLI/script-based)
- **Output**: Web-based reports with embedded SVG treemaps
- **Storage**: File-based with optional lightweight local database for caching
- **Deployment**: Local execution (macOS primary target), future server option

### Architecture Pattern
- Separate analysis backend from web frontend
- Backend runs analysis processes, generates data files
- Frontend (Vue) consumes analysis data and renders interactive visualizations

### Scale Parameters
- Target: 1-2M LOC across team-owned repositories
- Multiple years of Git history
- Language mix: Kotlin, Java, JavaScript/TypeScript, CSS, HTML, Shell, Makefile, etc.

### External Tools
- Code Maat for Git analysis
- Git CLI for repository operations

## Implementation Strategy

### Philosophy
- Incremental value delivery: build stone by stone
- Focus on explanation and understanding over prescriptive metrics
- Tool for teams to understand their own codebase landscape
- No code style or quality metrics - size and change frequency only
- AI as interpretation layer for data, not replacement

### Approach
- Start with high-value visualizations
- Integrate existing proven tools (Code Maat)
- Curate/discover effective prompts for codebase understanding
- Leverage existing prompt libraries where available

## Implementation Priority
1. Repository configuration system (GitHub org/repo format)
2. Code volume analysis + interactive treemap
3. Code Maat integration for churn analysis
4. Treemap overlay system (size + change metrics)
5. AI prompt toolkit for data interpretation
6. Activity metrics (contributors, PRs)

## Deferred/Future
- Multi-user deployment
- Database persistence (start with file-based caching)
- Language-specific deep analysis
- Code quality/style metrics (explicitly out of scope)