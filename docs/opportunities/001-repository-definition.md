# Opportunity: Repository Definition

**Status:** Now
**Last Updated:** 2025-11-21

## Desired Outcome

Teams can specify which repositories to analyze using a standard, shareable format.

## Opportunity (Problem Space)

**Current State:**
- No standard way to specify which repositories to analyze
- Manual tracking of repository locations
- Configuration scattered across different systems
- Difficult to share repository sets between team members

**Impact:**
- Time wasted on coordination
- Inconsistent analysis scope
- Barrier to adoption
- Can't reproduce analyses reliably

**User Needs:**
- Define repository sets declaratively
- Share configuration via version control
- Support both Git URLs and local paths
- Compatible with existing tools

## Solutions (Explored)

### Selected: `.meta` Format with Multi-Set Structure

Use `.meta` files in separate subfolders for different analysis scopes:

```
ainalyzer/
├── projects/
│   ├── backend-services/
│   │   ├── .meta           # backend repos
│   │   └── (cloned repos)
│   ├── frontend-apps/
│   │   ├── .meta           # frontend repos
│   │   └── (cloned repos)
│   └── legacy-system/
│       ├── .meta           # legacy scope
│       └── (cloned repos)
```

Each `.meta` file uses standard format:

```json
{
  "projects": {
    "repo-name": "git@github.com:org/repo.git"
  }
}
```

**Benefits:**
- Standard, proven format (mateodelnorte/meta: 2.2k stars, production-proven)
- Compatible with meta CLI ecosystem
- Simple JSON structure
- Supports Git URLs or local paths
- Version-controllable, shareable

**Trade-offs:**
- Dependency on external format specification
- JSON less human-friendly than YAML
- Format designed for meta CLI, not Ainalyzer-specific

### Alternatives Considered

**YAML manifest:**
- More human-friendly syntax
- Custom format requires documentation
- No tooling ecosystem

**Git submodules:**
- Native Git feature
- Complex, error-prone
- Poor developer experience

## Assumption Tests

- [ ] Teams can create `.meta` file in <5 minutes
- [ ] `.meta` file works under version control
- [ ] Format supports both SSH and HTTPS Git URLs
- [ ] Example `.meta` file validates with mateodelnorte/meta CLI

## Implementation Notes

Scope: Format selection and documentation only. Does not include cloning automation or config parsing.

**Deliverables:**
- Example multi-set directory structure with sample `.meta` files
- Documentation of format and multi-set pattern in README or ADR
- `.gitignore` rules for cloned repos (exclude `projects/*/` except `.meta` files)

**Dependencies:** None
**Blocks:** Repository provisioning (003), Configuration reading (004)
