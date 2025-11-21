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

### [docs/opportunities/](./docs/opportunities/)
Opportunity documentation following Opportunity Solution Tree methodology. Each opportunity describes a problem/need (opportunity space), desired outcomes, potential solutions, and assumption tests.

**Numbering system:** Uses Zettelkasten-style branching (Luhmann's Folgezettel) to show relationships. Child opportunities branch from parents using alternating numbers and letters:
- `001` = top-level opportunity
- `001a` = builds on/depends on 001
- `001b` = another branch from 001
- `001a1` = deeper branch from 001a

This shows dependency relationships directly in the numbering without requiring renumbering when adding new opportunities.

## Quick Start

*Coming soon*

## Architecture Overview

Ainalyzer operates on folders containing Git repositories. Users manage repository cloning and organization using their preferred tools (git, meta CLI, etc.).

**Components:**
- CLI tool ("Aina"): Analysis engine and project management
- Storage: SQLite database tracks analysis sets (folder paths)
- Frontend: Vue.js web application (planned)
- External tools: Code Maat, Git CLI

Analysis workflow:
1. Register a folder containing repos: `aina add <name> <path>`
2. Run analysis: `aina analyze <name>`
3. View interactive treemap visualizations with overlays for code volume, change frequency, and activity metrics

## Project Status

Planning phase. See [PLAN.md](./PLAN.md) for current work.
