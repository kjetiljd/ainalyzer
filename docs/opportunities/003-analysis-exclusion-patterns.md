# Opportunity: Analysis Exclusion Patterns

**Status:** Next
**Last Updated:** 2025-11-29
**Parent:** 002 (Code Visibility)

## Desired Outcome

Teams can exclude non-human-generated files from analysis to focus on maintainable code.

## Opportunity (Problem Space)

**Current State:**
- cloc respects .gitignore but counts all tracked files
- Generated files (package-lock.json, test fixtures, compiled assets) inflate metrics
- Large generated files dominate visualizations disproportionately
- No way to exclude specific patterns without modifying .gitignore
- Skewed perception of where actual maintenance effort is needed

**Impact:**
- Misleading visualizations showing generated files as "hotspots"
- Difficulty identifying real code concentration
- Test data files (e.g., 50KB JSON fixtures) appear as significant when they're not
- Lock files (package-lock.json, yarn.lock, Gemfile.lock) skew language statistics
- Time wasted investigating large but low-value files

**User Needs:**
- Exclude patterns like .gitignore syntax (*.lock, test/fixtures/**, etc.)
- Exclude specific files via UI (right-click → "Exclude from analysis")
- Persist exclusions across analyses
- See what's excluded (transparency)
- Override exclusions temporarily ("Show excluded files")

**Examples of files to exclude:**
- Lock files: `package-lock.json`, `yarn.lock`, `Gemfile.lock`, `Cargo.lock`
- Test fixtures: `test/fixtures/**`, `__tests__/__snapshots__/**`
- Generated code: `dist/**`, `build/**`, `*.generated.js`
- Large data files: `*.sql`, `*.csv` in test directories
- Documentation builds: `docs/_build/**`, `site/**`

## Solutions (Explored)

### Solution 1: .ainaignore File (Recommended)

**Philosophy:** Follow established patterns (.gitignore, .dockerignore). Local file, version-controlled.

**Approach:**
- `.ainaignore` file in analysis set root (or each repository)
- Syntax identical to .gitignore (glob patterns, negation with `!`, comments with `#`)
- Read during analysis, applied before cloc runs
- Merged with .gitignore rules (union, not replacement)

**Implementation:**
```python
# In aina_lib.py
def read_ignore_patterns(repo_path):
    """Read .ainaignore and .gitignore patterns."""
    patterns = []

    # Read .gitignore (already respected by cloc --vcs=git)
    # Read .ainaignore for additional exclusions
    ainaignore = Path(repo_path) / '.ainaignore'
    if ainaignore.exists():
        patterns.extend(parse_gitignore_file(ainaignore))

    return patterns

def run_cloc_with_exclusions(repo_path, extra_patterns):
    """Run cloc with additional exclusion patterns."""
    exclude_args = []
    for pattern in extra_patterns:
        if pattern.endswith('/'):
            exclude_args.extend(['--exclude-dir', pattern.rstrip('/')])
        else:
            exclude_args.extend(['--exclude-file', pattern])

    subprocess.run(['cloc', '--vcs=git', *exclude_args, ...])
```

**Example .ainaignore:**
```gitignore
# Lock files
*.lock
package-lock.json
yarn.lock
Gemfile.lock

# Test fixtures
test/fixtures/**
__tests__/__snapshots__/**

# Generated documentation
docs/_build/**
*.generated.*
```

**Benefits:**
- Familiar syntax for developers
- Version-controlled exclusion rules (team-wide consistency)
- Works offline (no UI needed)
- Easy to review and modify
- Per-repository or global patterns

**Trade-offs:**
- Requires creating file manually
- Not discoverable from UI
- Need to re-run analysis after changes
- Requires implementing gitignore pattern parsing

---

### Solution 1B: .clocignore with Git Pathspec (Recommended)

**Philosophy:** Reuse git's native gitignore pattern matching. Zero parsing code.

**Approach:**
- `.clocignore` file in repository root (standard cloc convention)
- Convert patterns to git pathspec format (`:!pattern`)
- Use `git ls-files` to get filtered file list
- Pass to cloc via `--list-file`

**Implementation:**
```python
def get_files_with_exclusions(repo_path, ignore_file='.clocignore'):
    """Get file list using git's native gitignore pattern matching."""
    ignore_path = Path(repo_path) / ignore_file

    pathspecs = []
    if ignore_path.exists():
        for line in ignore_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith('#'):
                pathspecs.append(f':!{line}')

    result = subprocess.run(
        ['git', 'ls-files', '--'] + pathspecs,
        cwd=repo_path,
        capture_output=True, text=True
    )
    return result.stdout.splitlines()

def run_cloc(repo_path):
    files = get_files_with_exclusions(repo_path)

    # Write to temp file for cloc --list-file
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
        f.write('\n'.join(files))
        list_file = f.name

    subprocess.run(['cloc', '--json', '--by-file', '--list-file', list_file])
```

**Example .clocignore:**
```gitignore
# Lock files
*.lock
package-lock.json

# Test fixtures
test/fixtures/**
__tests__/__snapshots__/**

# Generated
dist/**
*.generated.*
```

**Benefits:**
- Zero Python dependencies - uses git's built-in pattern matching
- Full gitignore syntax support (`**`, `!` negation, etc.)
- Faster than cloc's `--exclude-list-file` (filtering before cloc runs)
- Standard `.clocignore` filename (cloc convention)
- Users already know gitignore syntax

**Trade-offs:**
- Requires git (already a project dependency)
- Requires creating file manually
- Not discoverable from UI

---

### Solution 2: UI-Based Exclusion with Persistent Storage

**Philosophy:** Point-and-click exclusion. No files to manage.

**Approach:**
- Right-click file/directory in treemap → "Exclude from analysis"
- Store exclusions in SQLite database (analysis_exclusions table)
- Apply during analysis or post-process filter
- UI shows excluded items in grayed-out state or separate panel

**Implementation:**
```sql
CREATE TABLE analysis_exclusions (
    id INTEGER PRIMARY KEY,
    analysis_set_name TEXT NOT NULL,
    pattern TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_set_name) REFERENCES analysis_sets(name)
);
```

**Frontend:**
```vue
<Treemap
  @right-click="showContextMenu"
  :excluded-patterns="excludedPatterns"
/>

<!-- Context menu -->
<ContextMenu>
  <MenuItem @click="excludeFile(node.path)">
    Exclude this file
  </MenuItem>
  <MenuItem @click="excludeDir(node.path)">
    Exclude this directory
  </MenuItem>
</ContextMenu>
```

**Benefits:**
- Discoverable (visible in UI)
- No file management needed
- Immediate visual feedback
- Can exclude on-the-fly during exploration

**Trade-offs:**
- Not version-controlled
- Team members have different exclusions (inconsistency)
- Requires UI access to modify
- Need UI to see what's excluded

---

### Solution 3: Hybrid Approach (File + UI)

**Philosophy:** Best of both worlds. File for team rules, UI for personal preferences.

**Approach:**
- `.ainaignore` for version-controlled team exclusions
- SQLite exclusions for personal/temporary exclusions
- Merge both at analysis time
- UI shows both types with different indicators

**Precedence:**
1. .ainaignore (team rules - strong exclusion)
2. Personal SQLite exclusions (weak exclusion - can override in UI)

**Benefits:**
- Team consistency via .ainaignore
- Personal exploration via UI exclusions
- Clear separation of concerns
- Maximum flexibility

**Trade-offs:**
- More complexity (two sources of truth)
- Need to explain precedence to users
- Potential confusion about which takes priority

---

## Comparison Matrix

| Criterion | 1: .ainaignore | 1B: Git Pathspec | 2: UI-Only | 3: Hybrid |
|-----------|----------------|------------------|------------|-----------|
| Team consistency | High | High | Low | High |
| Discoverability | Low | Low | High | Medium |
| Version control | Yes | Yes | No | Partial |
| Ease of use | Medium | Medium | High | Medium |
| Offline editing | Yes | Yes | No | Yes |
| Implementation complexity | Medium | Low | Medium | High |
| Dependencies | pathspec lib | git (existing) | None | Mixed |

## Recommendation

**Start with Solution 1B (.clocignore with Git Pathspec)** for MVP:
- Zero new dependencies - reuses git's pattern matching
- Standard `.clocignore` filename (cloc convention)
- Full gitignore syntax support without custom parsing
- Version-controlled team rules
- Can add UI features later (Solution 3)

**Future iteration:** Add UI exclusion as enhancement (Solution 3)

## Implementation Plan

**Phase 1: .clocignore Support (Solution 1B)**
1. Add `get_files_with_exclusions()` using git pathspec
2. Modify `run_cloc()` to use `--list-file` instead of `--vcs=git`
3. Document .clocignore syntax in README

**Phase 2: UI Indication (Optional)**
1. Parse .clocignore during frontend load
2. Gray out excluded files in treemap
3. Add "Show excluded files" toggle
4. Display exclusion reason on hover

**Phase 3: UI Exclusion (Future)**
1. Add context menu to treemap
2. Store exclusions in SQLite
3. Merge with .clocignore patterns
4. Add exclusion management UI panel

## Implementation Notes

**Unfiltered view option:** Consider storing/generating both filtered and unfiltered results so users can toggle between views in the UI. Options:
1. Run analysis twice (with/without exclusions) → two JSON files
2. Store exclusion metadata in JSON → filter client-side
3. Mark excluded files in tree with `excluded: true` flag → toggle visibility in UI

Option 3 is most flexible: single analysis run, full data preserved, client controls visibility.

## Assumption Tests

- [ ] .clocignore patterns correctly exclude files via git pathspec
- [ ] Exclusion significantly improves visualization clarity
- [ ] Teams create and maintain .clocignore files
- [ ] Excluded files can be shown on demand (transparency)

## Success Metrics

- Reduction in "noise" files (lock files, fixtures) in visualizations
- Improved accuracy of language statistics
- User reports better focus on maintainable code
- .clocignore files added to team repositories
