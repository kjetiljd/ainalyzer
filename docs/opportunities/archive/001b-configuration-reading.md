# Opportunity: Configuration Reading

**Status:** Archived
**Last Updated:** 2025-11-21
**Archived:** 2025-11-21
**Reason:** Scope pivot. No .meta format dependency. Ainalyzer discovers repos by scanning folders directly.

## Desired Outcome

Analysis tools can discover which repositories exist and where they're located without manual configuration.

## Opportunity (Problem Space)

**Current State:**
- Analysis tools don't know which repos to process
- No programmatic access to `.meta` definitions
- Hard-coded paths or manual entry required
- Can't iterate over multiple analysis sets

**Impact:**
- Analysis tools can't be automated
- Manual configuration duplicates `.meta` data
- Changes to `.meta` don't propagate to tools
- Can't build multi-set workflows

**User Needs:**
- Programmatic access to repository lists
- Discover all analysis sets in `projects/`
- Read repository names and paths
- Language-agnostic parsing

## Solutions (Explored)

### Selected: Simple JSON Parser

Parse `.meta` files directly without `meta` CLI dependency:

**Python example:**
```python
import json
from pathlib import Path

def read_meta(meta_path):
    with open(meta_path) as f:
        data = json.load(f)
    return data['projects']

def find_analysis_sets(base_path):
    """Find all .meta files in projects/ subfolders"""
    return list(Path(base_path).glob('projects/*/.meta'))
```

**Node.js example:**
```javascript
const fs = require('fs');
const path = require('path');

function readMeta(metaPath) {
    const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    return data.projects;
}

function findAnalysisSets(basePath) {
    const projectsDir = path.join(basePath, 'projects');
    return fs.readdirSync(projectsDir)
        .map(dir => path.join(projectsDir, dir, '.meta'))
        .filter(p => fs.existsSync(p));
}
```

**Benefits:**
- No external dependencies
- 10 lines of code
- Works in any language
- Direct control over parsing

**Trade-offs:**
- Doesn't validate `.meta` schema
- Manual error handling
- Need to implement path resolution

### Alternatives Considered

**Use `meta` CLI programmatically:**
- Shell out to `meta project`
- Dependency on external tool
- Slower than direct parsing
- Unnecessary complexity

**Custom config format:**
- Breaks compatibility with `.meta` standard
- Requires separate documentation

## Assumption Tests

- [ ] Parser handles malformed JSON gracefully
- [ ] Discovery finds all `.meta` files in test structure
- [ ] Works with both absolute and relative paths
- [ ] Performance acceptable for 50+ analysis sets

## Implementation Notes

Scope: Parser implementation for chosen language (TBD).

**Deliverables:**
- Parser function/module
- Discovery function for finding analysis sets
- Basic validation (check for `projects` key)
- Unit tests with sample `.meta` files

**Dependencies:** Repository definition (001)
**Blocks:** Code volume analysis (002), Git history analysis
