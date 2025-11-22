# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ainalyzer** is a multi-repository analysis tool that provides interactive visualizations of code volume, Git history, and change patterns. The tool helps development teams understand where code lives across multiple repositories without prescriptive quality judgments.

**Architecture:**
- **Backend:** Python CLI tool (`aina`) - zero external dependencies for core functionality
- **Frontend:** Vue.js 3 + Vite SPA with D3.js treemap visualization
- **Storage:** SQLite database for analysis sets, JSON files for analysis results
- **External tools:** cloc (for line counting), Git CLI

**Key Design Principle:** Local-first, file-based architecture. Analysis generates static JSON files that can be visualized in a static web app - no server required at runtime.

## Project Structure

```
/
├── aina                    # Python CLI executable (chmod +x)
├── aina_lib.py            # Core library (database, repo discovery, commands)
├── tests/                 # Python unit tests (unittest framework)
│   ├── test_database.py
│   ├── test_commands.py
│   └── test_repo_discovery.py
├── frontend/              # Vue.js visualization app
│   ├── src/
│   │   ├── components/    # Vue components (Treemap, Breadcrumb, Statusline)
│   │   └── App.vue
│   ├── package.json
│   └── vite.config.js
├── spikes/                # Proof-of-concept experiments
│   ├── treemap-d3/        # D3 treemap prototype (validated)
│   └── cloc-integration/  # cloc parsing spike (validated)
├── docs/
│   ├── adr/               # Architecture Decision Records (numbered 0001, 0002...)
│   ├── opportunities/     # Opportunity docs (Zettelkasten numbering: 001, 001a, 001a1...)
│   └── json-schema.md     # Analysis JSON format specification
├── PRODUCT_BRIEF.md       # Complete product vision and strategy
├── CURRENT_TASK.md        # Active work tracking
└── README.md              # Project overview
```

## Common Commands

### Python Backend

```bash
# Run the CLI tool
./aina --help
./aina add <name> <path>      # Register analysis set
./aina list                   # List all analysis sets
./aina remove <name>          # Remove analysis set
./aina analyze <name>         # Run analysis (future - in development)

# Run tests
python3 -m unittest discover tests/

# Run a specific test file
python3 -m unittest tests/test_database.py

# Run a single test
python3 -m unittest tests.test_database.TestInitDatabase.test_creates_table
```

### Frontend Development

```bash
cd frontend

# Install dependencies (first time)
npm install

# Start development server
npm run dev                    # Runs on http://localhost:5173

# Run tests
npm test

# Build for production
npm run build                  # Output: dist/

# Preview production build
npm run preview
```

### cloc Integration

```bash
# Generate cloc JSON output (for analysis)
cloc --json --by-file <repo-path> > output.json

# Example from spikes
cd spikes/cloc-integration
./parse_cloc.py                # Parse cloc output and generate tree structure
```

## Key Architecture Decisions

Refer to ADRs in `docs/adr/` for full context:

1. **ADR 0001:** Using Architecture Decision Records (Michael Nygard format)
2. **ADR 0002:** Vue.js with static file deployment for visualization
   - Analysis backend (Python) generates JSON
   - Frontend (Vue) is pure visualization layer
   - Static files work with file:// protocol - no server required
   - D3.js for treemap layout algorithm

## Data Flow

**Analysis Workflow:**
```
1. User: aina add my-set /path/to/repos     → Register analysis set in SQLite
2. User: aina analyze my-set                → Run analysis
   ├─ discover_repos() finds all Git repos
   ├─ For each repo: cloc --json --by-file  → Get line counts
   ├─ For each file: git log --              → Get commit stats
   ├─ Build hierarchical tree structure
   └─ Write ~/.aina/analysis/my-set.json
3. User: open frontend/dist/index.html      → Load JSON and visualize
```

**JSON Schema:** See `docs/json-schema.md` for complete specification
- Root: `{analysis_set, generated_at, stats, tree}`
- Tree nodes: `{name, type, path, children, value, language, commits}`
- All paths are relative to analysis set root (portable/shareable)

## Database Schema

SQLite database: `~/.aina/db.sqlite`

```sql
CREATE TABLE analysis_sets (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing Strategy

**Python Tests:**
- Use `unittest` framework (standard library - no dependencies)
- All tests in `tests/` directory
- Use temporary files/databases for isolation
- 21 tests currently (all passing)
- Run full suite before committing

**Frontend Tests:**
- Vitest + Vue Test Utils
- Happy-dom for DOM environment
- Component tests in `src/__tests__/`

## Documentation Philosophy

This project uses a structured documentation approach:

1. **PRODUCT_BRIEF.md** - Complete product vision, never outdated
2. **CURRENT_TASK.md** - Points to active opportunity, tracks progress
3. **docs/adr/** - Permanent architectural decisions (never modified after acceptance)
4. **docs/opportunities/** - Opportunity Solution Tree methodology
   - Zettelkasten numbering: 001, 001a, 001b, 001a1 (shows dependencies)
   - Archive completed opportunities to `docs/opportunities/archive/`

## Development Notes

**Backend (aina):**
- Python 3 with zero external dependencies for core functionality
- Use `pathlib` for path operations (not os.path)
- All database operations go through `aina_lib.py` functions
- Repository discovery respects `.git` directories only

**Frontend:**
- Vue 3 Composition API (not Options API)
- Use D3.js only for treemap layout algorithm
- Keep bundle size minimal (target <300KB gzipped)
- Support file:// protocol (no server required)

**cloc Integration:**
- Prefer `cloc --json --by-file` for file-level granularity
- Parse JSON output, don't scrape text output
- Map cloc language names to consistent schema
- Handle "Unknown" language gracefully

**Git Analysis:**
- Use `git log --format` for structured output
- Calculate commit age from ISO 8601 timestamps
- Filter by time ranges: `--since="3 months ago"`
- Use `--` to scope queries to specific files

## Current Status

**Completed:**
- Analysis set registration (001) - CLI tool with add/list/remove commands
- Spikes validated: D3 treemap, cloc integration, JSON schema

**In Progress:**
- Code visibility (002) - Backend implementation of `aina analyze` command

**Next:**
- Complete `aina analyze` implementation
- Build Vue frontend with treemap visualization
- Git history overlays (change frequency, hotspots)

See CURRENT_TASK.md for detailed status.
