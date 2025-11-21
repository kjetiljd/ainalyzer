# Opportunity: Repository Management

**Status:** Now
**Last Updated:** 2025-11-21

## Desired Outcome

Teams can define and manage multiple repositories for analysis without manual coordination or complex setup.

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

### Selected: `.meta` Format
Use harmony-labs/meta compatible `.meta` file format:

```json
{
  "projects": {
    "repo-name": "git@github.com:org/repo.git"
  }
}
```

**Benefits:**
- Standard, proven format
- Compatible with meta CLI tool
- Simple JSON structure
- Git URLs or local paths
- Sub-repositories checked out under project root

**Trade-offs:**
- Dependency on external format specification
- JSON not as human-friendly as YAML
- Requires meta CLI for advanced operations

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

- [ ] Teams can define repository sets in <5 minutes
- [ ] `.meta` file can be checked into version control
- [ ] Compatible with harmony-labs/meta CLI
- [ ] Works with both SSH and HTTPS Git URLs

## Implementation Notes

Foundation for all analysis workflows. Everything else depends on knowing which repositories to analyze.

**Dependencies:** None
**Blocks:** Code volume analysis, Git history analysis
