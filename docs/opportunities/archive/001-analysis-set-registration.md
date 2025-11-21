# Opportunity: Analysis Set Registration

**Status:** Completed
**Last Updated:** 2025-11-21
**Completed:** 2025-11-21

## Desired Outcome

Users can register folders containing repositories for analysis and manage these analysis sets persistently.

## Opportunity (Problem Space)

**Current State:**
- Users have repositories in various folder locations
- No way to tell Ainalyzer which folders to analyze
- No persistent tracking of analysis sets
- Each analysis requires manual path specification

**Impact:**
- Friction in repeated analysis workflows
- Can't remember which folders were analyzed previously
- No way to manage multiple analysis sets
- Barrier to adoption

**User Needs:**
- Register a folder as an analysis set with a memorable name
- List all registered analysis sets
- Remove analysis sets no longer needed
- Persistent storage across CLI invocations

## Solutions (Explored)

### Selected: SQLite Database with CLI Commands

Store analysis sets in local SQLite database:

```sql
CREATE TABLE analysis_sets (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

CLI commands:
```bash
# Register a folder
aina add backend-services /Users/kjetil/projects/backend

# List registered sets
aina list

# Remove a set
aina remove backend-services

# Analyze a set
aina analyze backend-services
```

**Benefits:**
- Simple, embedded database (no server required)
- Persistent across invocations
- Widely supported in all languages
- Single file storage (~/.aina/db.sqlite)
- SQL provides querying flexibility

**Trade-offs:**
- Not shareable between team members
- Each user maintains own registry
- No version control of registry
- Path validity not checked at registration time

### Alternatives Considered

**Configuration file (YAML/JSON):**
- Human-readable
- Version-controllable
- Requires parsing/serialization code
- Concurrent access issues

**In-memory only:**
- No persistent storage
- Simple implementation
- Unusable for repeated analysis

## Assumption Tests

- [ ] SQLite database can be created in ~/.aina/ directory
- [ ] Database file permissions work across platforms
- [ ] Performance acceptable for 100+ registered sets
- [ ] Path validation at analysis time (not registration) is sufficient
- [ ] CLI can discover repos by scanning folder for .git directories

## Implementation Notes

Scope: Database schema, CLI commands for registration/management, repo discovery.

**Deliverables:**
- SQLite schema definition
- CLI command: `aina add <name> <path>`
- CLI command: `aina list`
- CLI command: `aina remove <name>`
- Repo discovery: scan folder for .git directories
- Path validation at analysis time

**Dependencies:** None
**Blocks:** Code visibility (002), all analysis workflows

**Language choice:** Python with argparse (standard library only)

**Technical stack:**
- Python 3.6+ (standard library only, zero external dependencies)
- `argparse` - CLI argument parsing
- `sqlite3` - Database storage
- `pathlib` - Path handling
- Single executable script: `aina` (no .py extension)

**Distribution:**
- Single file (`aina`)
- Shebang: `#!/usr/bin/env python3`
- Make executable: `chmod +x aina`
- Install via symlink to PATH

**Testing:**
- `unittest` (standard library)
- Extract logic into `aina_lib.py` for testability
- `aina` script as thin wrapper
- In-memory SQLite (`:memory:`) for fast tests
- Test structure:
  ```
  ainalyzer/
  ├── aina              # CLI script
  ├── aina_lib.py       # Importable functions
  └── tests/
      ├── test_database.py
      ├── test_commands.py
      └── test_repo_discovery.py
  ```
- Run tests: `python -m unittest discover`

## Implementation Results

**Completed:** 2025-11-21

### What Was Delivered

**CLI Tool:**
- ✓ `aina add <name> <path>` - Register analysis set with path validation
- ✓ `aina list` - Display all registered sets in formatted table
- ✓ `aina remove <name>` - Remove analysis set
- ✓ Global `--db` option for custom database location
- ✓ Default database: `~/.aina/db.sqlite`

**Core Library (aina_lib.py):**
- ✓ `init_database()` - Create SQLite schema
- ✓ `add_analysis_set()` - Insert with duplicate checking
- ✓ `list_analysis_sets()` - Query all sets
- ✓ `remove_analysis_set()` - Delete by name
- ✓ `discover_repos()` - Scan for .git directories (max depth: root + 1 level)
- ✓ CLI wrappers: `cmd_add()`, `cmd_list()`, `cmd_remove()`

**Test Coverage:**
- ✓ 21 tests across 3 test files (all passing)
- ✓ `test_database.py` - 8 tests (database operations)
- ✓ `test_repo_discovery.py` - 6 tests (repo scanning with depth limit)
- ✓ `test_commands.py` - 7 tests (CLI command wrappers)
- ✓ 100% test-driven development (red-green-refactor)

**Implementation Approach:**
- 6 phases completed
- 18 git commits (green at every TDD cycle)
- Zero external dependencies (Python standard library only)

### Assumption Tests Results

- ✓ SQLite database created successfully in ~/.aina/ directory
- ✓ Database file permissions work correctly
- ✓ Path validation implemented (checks existence at add time)
- ✓ Repo discovery scans for .git directories
- ✓ Depth limit prevents scanning inside repositories

### Known Limitations

- Database not shareable between team members (by design - local per-user state)
- No registry version control (local SQLite file)
- Repository discovery limited to 2 levels (root + 1) to avoid submodules
- No analyze command yet (blocks on opportunity 002)
