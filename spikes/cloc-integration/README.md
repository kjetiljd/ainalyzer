# Spike C: cloc Integration

**Purpose:** Validate cloc integration with real repository data and understand output format.

## Test Project

Using `/Users/t988833/Projects/kjetiljd/meta-repo-workshop/todo-meta` as test data.

## Goals

1. Run cloc on real project
2. Parse JSON output
3. Extract file-level data
4. Map to our JSON schema structure
5. Validate language detection
6. Check performance on real codebase

## Commands

```bash
# Install cloc if needed
brew install cloc

# Run cloc on test project
cloc --json /Users/t988833/Projects/kjetiljd/meta-repo-workshop/todo-meta

# Run with specific options we might need
cloc --json --by-file /Users/t988833/Projects/kjetiljd/meta-repo-workshop/todo-meta
```

## Questions to Answer

- Does cloc provide per-file data or only aggregated?
- How does cloc handle nested directories?
- What languages does it detect in the test project?
- Is output format compatible with our JSON schema?
- Performance: how long does it take?

## Findings

**Tested: 2025-11-21**

### cloc Output Format

**Standard format** (`cloc --json`):
- Aggregated by language
- No per-file breakdown
- Fast (35s for 5898 files)

**By-file format** (`cloc --json --by-file`):
- Per-file details: blank, comment, code, language
- Absolute file paths as keys
- Slightly slower (49s for 5898 files)
- **This is what we need**

### Test Results

**Test project:** `todo-meta` (meta repository with multiple sub-repos)

**Statistics:**
- 5,898 files
- 1.5M lines of code
- 10 repositories detected
- 18 languages detected

**Top languages:**
1. JavaScript: 1.3M lines
2. TypeScript: 105K lines
3. JSON: 69K lines
4. Markdown: 63K lines

### Mapping to JSON Schema

✅ **Successfully mapped cloc output to our JSON schema**

**Extraction:**
- File path → relative path calculation
- Code lines → `value` field
- Language → `language` field
- Extension → parsed from path

**Tree building:**
- First-level subdirectories become repositories
- Files grouped by repository
- Hierarchical structure constructed

### Performance

- **cloc execution:** ~49s for 5,898 files (120 files/second)
- **Parsing:** <1s for JSON parsing and tree construction
- **Total:** ~50s for full analysis

### Issues & Considerations

**1. node_modules pollution**
- cloc counts node_modules files (majority of files/lines)
- **Solution:** Need to exclude node_modules, .git, etc.
- Use `--exclude-dir=node_modules,.git,dist,build`

**2. Absolute paths**
- cloc returns absolute paths
- **Solution:** Convert to relative paths in our script (already implemented)

**3. Directory structure**
- cloc doesn't provide directory hierarchy
- We only get flat file list
- **Solution:** Build hierarchy from file paths (implemented in spike)

**4. Missing Git data**
- cloc only provides LOC, not commit metadata
- **Solution:** Need separate Git integration (next step)

### Next Steps

1. Add `--exclude-dir` handling to skip node_modules, .git, etc.
2. Integrate Git commit statistics (total commits, last 3 months, last commit date)
3. Build full directory hierarchy (not just repo-level grouping)
4. Implement in `aina analyze` command
