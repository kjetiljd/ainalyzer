# Development Guide

## Prerequisites

```bash
git --version      # Git for repository analysis
python3 --version  # Python 3.10+
node --version     # Node.js 18+ (for frontend)
cloc --version     # Install: brew install cloc
```

## Quick Start

```bash
# Backend
./aina --help

# Frontend development
cd frontend && npm install && npm run dev

# Run tests
python3 -m unittest discover tests/
cd frontend && npm test
```

## Documentation Structure

### [docs/project/](./docs/project/)
Product and planning documentation:
- **PRODUCT_BRIEF.md** - Complete product vision and strategy
- **PLAN.md** - Now/Next/Later development roadmap
- **CURRENT_TASK.md** - Active work tracking

### [docs/adr/](./docs/adr/)
Architecture Decision Records (ADRs) using Michael Nygard format. Documents significant architectural and technical decisions with context, rationale, and consequences. Numbered sequentially (0001, 0002, etc.).

### [docs/opportunities/](./docs/opportunities/)
Opportunity documentation following Opportunity Solution Tree methodology. Each opportunity describes a problem/need (opportunity space), desired outcomes, potential solutions, and assumption tests.

**Numbering system:** Uses Zettelkasten-style branching (Luhmann's Folgezettel) to show relationships:
- `001` = top-level opportunity
- `001a` = builds on/depends on 001
- `001b` = another branch from 001
- `001a1` = deeper branch from 001a

## Architecture

- **Backend:** Python CLI (`aina`) with zero external dependencies
- **Frontend:** Vue.js 3 + D3.js treemap visualization
- **Storage:** SQLite for analysis sets, JSON for analysis results
- **External tools:** cloc (line counting), Git CLI

See [CLAUDE.md](./CLAUDE.md) for detailed development notes.
