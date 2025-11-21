# Current Task

> **Purpose:** This file points to the opportunity we're currently working on and tracks its status. Keep this file updated as work progresses.

**Last Updated:** 2025-11-21

## Active Opportunity

**Analysis Set Registration**

→ [docs/opportunities/001-analysis-set-registration.md](./docs/opportunities/001-analysis-set-registration.md)

**Status:** In progress

## Implementation Plan (Test-Driven Development)

### Phase 1: Project Structure
- [ ] Create `tests/` directory
- [ ] Create empty `aina_lib.py`
- [ ] Create empty `aina` script with shebang
- [ ] Verify `python -m unittest discover` runs (0 tests)

### Phase 2: Database Layer (Red-Green-Refactor)

**Cycle 1: Database initialization**
- [ ] RED: Write `test_database.py` - test database creation
- [ ] GREEN: Implement `init_database()` in `aina_lib.py`
- [ ] Verify test passes

**Cycle 2: Add analysis set**
- [ ] RED: Write test for `add_analysis_set(name, path)`
- [ ] GREEN: Implement `add_analysis_set()`
- [ ] RED: Write test for duplicate name (should fail)
- [ ] GREEN: Handle duplicate names (raise error)
- [ ] Verify tests pass

**Cycle 3: List analysis sets**
- [ ] RED: Write test for `list_analysis_sets()`
- [ ] GREEN: Implement `list_analysis_sets()`
- [ ] RED: Write test for empty database
- [ ] GREEN: Handle empty results
- [ ] Verify tests pass

**Cycle 4: Remove analysis set**
- [ ] RED: Write test for `remove_analysis_set(name)`
- [ ] GREEN: Implement `remove_analysis_set()`
- [ ] RED: Write test for removing non-existent set (should fail gracefully)
- [ ] GREEN: Handle non-existent names
- [ ] Verify tests pass

**Refactor:**
- [ ] Extract common database setup into helper function
- [ ] Clean up error handling
- [ ] Verify all tests still pass

### Phase 3: Repository Discovery (Red-Green-Refactor)

**Cycle 5: Discover Git repositories**
- [ ] RED: Write `test_repo_discovery.py` - test finding `.git` directories
- [ ] GREEN: Implement `discover_repos(path)`
- [ ] RED: Write test for nested repos
- [ ] GREEN: Handle nested directory scanning
- [ ] RED: Write test for non-existent path
- [ ] GREEN: Handle invalid paths gracefully
- [ ] Verify tests pass

**Refactor:**
- [ ] Optimize directory scanning if needed
- [ ] Verify all tests still pass

### Phase 4: CLI Commands (Red-Green-Refactor)

**Cycle 6: Add command**
- [ ] RED: Write `test_commands.py` - test `cmd_add(name, path, db_path)`
- [ ] GREEN: Implement `cmd_add()` wrapper
- [ ] RED: Write test for path validation
- [ ] GREEN: Add path existence check
- [ ] Verify tests pass

**Cycle 7: List command**
- [ ] RED: Write test for `cmd_list(db_path)`
- [ ] GREEN: Implement `cmd_list()` with formatted output
- [ ] Verify tests pass

**Cycle 8: Remove command**
- [ ] RED: Write test for `cmd_remove(name, db_path)`
- [ ] GREEN: Implement `cmd_remove()` wrapper
- [ ] Verify tests pass

**Refactor:**
- [ ] Extract common CLI patterns
- [ ] Add consistent error messages
- [ ] Verify all tests still pass

### Phase 5: CLI Integration

**Main script:**
- [ ] Implement `aina` script with argparse
- [ ] Add subcommands: add, list, remove
- [ ] Set default database path: `~/.aina/db.sqlite`
- [ ] Add help text for all commands
- [ ] Make executable: `chmod +x aina`

**Manual testing:**
- [ ] Test: `./aina add test-set /tmp/test`
- [ ] Test: `./aina list`
- [ ] Test: `./aina remove test-set`
- [ ] Test: `./aina --help`
- [ ] Test: `./aina add --help`

### Phase 6: Finalization
- [ ] Run full test suite: `python -m unittest discover`
- [ ] Add docstrings to all functions
- [ ] Update opportunity status to "Completed"
- [ ] Commit final implementation

---

For broader context, see [PLAN.md](./PLAN.md) and [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md).
