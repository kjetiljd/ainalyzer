# Spike: Git Per-File Statistics

**Purpose:** Evaluate approaches for getting commit counts per file with time filtering (last 3 months, last year).

**Conclusion:** Bulk `git log -M --name-status` with `--follow` for renamed files.

## Final Implementation

See `git_file_stats.py` - ready to integrate into `aina_lib.py`.

```python
from git_file_stats import get_file_stats

stats = get_file_stats('/path/to/repo')
# Returns: {'path/to/file.py': {'commits_3m': 5, 'commits_1y': 23, 'last_commit_date': '...'}}
```

### Algorithm

1. Run bulk query for 1-year period with rename detection:
   ```bash
   git log -M --name-status --format=COMMIT|%aI --since="1 year ago"
   ```

2. Parse output, count commits per file, derive 3-month counts from timestamps

3. For any renamed files detected, run `--follow` to get accurate pre-rename history:
   ```bash
   git log --follow --format=%aI --since="1 year ago" -- path/to/file
   ```

### Performance

| Dataset | Files | Renames (1y) | Time |
|---------|-------|--------------|------|
| cos | 9,592 | 1 | 0.34s |
| eessi-pensjon-fagmodul | 220 | 4 | 0.15s |

Renames add ~250ms each, but are rare in 1-year window.

## Research Summary

### Approaches Tested

| Approach | Speed | Renames |
|----------|-------|---------|
| Per-file git rev-list | ~20ms/file | No |
| Bulk --name-only | 0.03s total | No |
| Bulk -M --name-status | 0.03s total | Detects |
| Per-file --follow | ~250ms/file | Yes |

### Rename Statistics

| Dataset | 3 months | 1 year | Full history |
|---------|----------|--------|--------------|
| cos (9.5k files) | 0 | 1 | 4,028 |
| eessi-pensjon (20 repos) | 0 | 17 | 3,785 |

### Decision

- **Use 1-year period** as the base query (derive 3-month from timestamps)
- **Follow renames** - cheap for 1-year (~1-17 renames), accurate results
- **Don't support full history** - too many renames, 15+ minutes overhead

## Output Format

```json
{
  "path/to/file.py": {
    "commits_3m": 5,
    "commits_1y": 23,
    "last_commit_date": "2025-11-15T14:32:00+01:00"
  }
}
```

## Files

- `git_file_stats.py` - Final implementation (use this)
- `benchmark.py` - Benchmarking script used during research
- `README.md` - This file

## Usage

```bash
# Single repo
python3 git_file_stats.py /path/to/repo

# With JSON output
python3 git_file_stats.py /path/to/repo --json
```

## Next Steps

1. Integrate `get_file_stats()` into `aina_lib.py`
2. Merge with cloc output during tree building
3. Add `commits` field to file nodes in JSON output
