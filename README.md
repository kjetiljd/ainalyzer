# Ainalyzer

Multi-repository analysis tool for code metrics, Git history, and AI-powered insights.

## Documentation Structure

This project follows a structured approach to documentation:

### [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md)
Complete product vision, strategy, and technical architecture. Defines the problem space, target users, features, success metrics, and implementation roadmap.

### [PLAN.md](./PLAN.md)
Current development plan using Now/Next/Later format. Always shows exactly one active task in "Now," upcoming work in "Next," and references the product brief for "Later."

### [docs/adr/](./docs/adr/)
Architecture Decision Records (ADRs) using Michael Nygard format. Documents significant architectural and technical decisions with context, rationale, and consequences. Numbered sequentially (0001, 0002, etc.).

### [docs/features/](./docs/features/)
Feature specifications and implementation details. Each feature gets its own document describing requirements, design, and acceptance criteria.

## Quick Start

*Coming soon*

## Architecture Overview

Ainalyzer uses `.meta` format for repository configuration (compatible with [harmony-labs/meta](https://github.com/harmony-labs/meta)).

**Components:**
- Backend: CLI-based analysis engine
- Frontend: Vue.js web application
- Storage: File-based with optional SQLite caching
- External tools: Code Maat, Git CLI

Sub-repositories are checked out under the project root and analyzed to produce interactive treemap visualizations with overlays for code volume, change frequency, and activity metrics.

## Project Status

Planning phase. See [PLAN.md](./PLAN.md) for current work.
