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

## Documentation

- **[docs/adr/](./docs/adr/)** - Architecture Decision Records (Michael Nygard format)
- **[docs/json-schema.md](./docs/json-schema.md)** - Analysis JSON format specification

## Architecture

- **Backend:** Python CLI (`aina`) with zero external dependencies
- **Frontend:** Vue.js 3 + D3.js treemap visualization
- **Storage:** SQLite for analysis sets, JSON for analysis results
- **External tools:** cloc (line counting), Git CLI

See [CLAUDE.md](./CLAUDE.md) for detailed development notes.
