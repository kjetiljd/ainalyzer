# Opportunity: Deep Module Refactoring

**Status:** Identified
**Last Updated:** 2025-11-24

## Desired Outcome

Codebase follows Ousterhout's deep module principles with simple interfaces hiding complex implementations, enabling easier maintenance and extension.

## Opportunity (Problem Space)

**Current State:**
- Shallow database functions expose SQLite details to callers (`aina_lib.py:9-87`)
- Pass-through CLI commands add no value (`aina_lib.py:128-209`)
- Tree structure internals (`_dirs`, `_files`) leak across multiple functions
- `analyze_repos()` function handles 6+ responsibilities in 120 lines (`aina_lib.py:348-468`)
- Callers must understand implementation details to use modules

**Impact:**
- High cognitive load for understanding code flow
- Changes ripple across multiple functions
- Difficult to test individual responsibilities
- Connection management, error handling scattered throughout
- Hard to extend without breaking existing code

**Red Flags Identified (Ousterhout):**
1. **Shallow Modules** - Interface complexity equals implementation complexity
2. **Pass-Through Methods** - Wrappers that merely pass arguments without adding value
3. **Information Leakage** - Internal data structures exposed across module boundaries
4. **Hard to Describe** - Functions doing too many things
5. **Special-General Mixture** - Domain logic mixed with generic operations

## Solutions (Explored)

### Solution 1: Incremental Refactoring (Recommended)

**Philosophy:** Refactor module-by-module while maintaining test coverage, prioritize highest-impact issues first.

**Approach:**
- Start with database layer (highest impact, clearest boundary)
- Extract tree operations into cohesive class
- Decompose analysis pipeline into focused stages
- Eliminate pass-through methods last (after other layers stabilized)

**Priority 1: Deep Repository Class**

Replace shallow database functions with:

```python
class AnalysisSetRepository:
    """Deep module hiding all database complexity."""

    def __init__(self, db_path=None):
        self.db_path = db_path or self._default_db_path()
        self._conn = None
        self._init_database()

    def add(self, name: str, path: str) -> AnalysisSet:
        """Add analysis set, return domain object."""
        # Hide: connection management, SQL, transactions, error handling
        # Return: AnalysisSet domain object (not tuple)

    def find_by_name(self, name: str) -> Optional[AnalysisSet]:
        """Return analysis set or None."""
        # Hide: SQL queries, cursor handling, result mapping

    def list_all(self) -> List[AnalysisSet]:
        """Return all analysis sets."""
        # Hide: iteration, result mapping

    def remove(self, name: str) -> bool:
        """Remove analysis set, return success status."""
        # Hide: transaction management, existence checking

    def __enter__(self):
        return self

    def __exit__(self, *args):
        if self._conn:
            self._conn.close()
```

**Domain object:**
```python
@dataclass
class AnalysisSet:
    id: int
    name: str
    path: Path
    created_at: datetime
```

**Priority 2: Tree Abstraction**

Encapsulate tree operations:

```python
class CodeTree:
    """Deep module for hierarchical code structure."""

    def __init__(self):
        self._root = {'_dirs': {}, '_files': []}
        # Hide internal representation

    def add_file(self, path: Path, metrics: FileMetrics):
        """Add file with its metrics."""
        # Hide: directory creation, path splitting, structure manipulation

    def to_treemap_json(self) -> dict:
        """Generate JSON for treemap visualization."""
        # Hide: traversal, schema conversion, aggregation
        # Single source of truth for schema format

    def calculate_stats(self) -> TreeStats:
        """Calculate aggregate statistics."""
        # Hide: traversal, aggregation logic
```

**Priority 3: Analysis Pipeline Decomposition**

Break down `analyze_repos()` into focused components:

```python
class RepositoryDiscoverer:
    """Find Git repositories in directory tree."""
    def find_all(self, root_path: Path) -> List[Repository]:
        pass

class CodeAnalyzer:
    """Analyze code metrics for repositories."""
    def analyze(self, repo: Repository) -> RepositoryMetrics:
        # Hide: cloc execution, JSON parsing, error handling
        pass

class AnalysisOrchestrator:
    """Coordinate analysis workflow."""

    def __init__(self):
        self.discoverer = RepositoryDiscoverer()
        self.analyzer = CodeAnalyzer()
        self.tree_builder = CodeTree

    def analyze(self, analysis_set: AnalysisSet) -> AnalysisResult:
        repos = self.discoverer.find_all(analysis_set.path)
        tree = self.tree_builder()

        for repo in repos:
            metrics = self.analyzer.analyze(repo)
            for file_metrics in metrics.files:
                tree.add_file(file_metrics.path, file_metrics)

        return AnalysisResult(
            analysis_set=analysis_set.name,
            tree=tree.to_treemap_json(),
            stats=tree.calculate_stats()
        )
```

**Priority 4: Remove Pass-Through Layer**

After repository and orchestrator are deep modules, eliminate `cmd_*` wrappers:

```python
# In aina CLI script
def main():
    parser = argparse.ArgumentParser()
    # ... argument setup

    if args.command == 'add':
        with AnalysisSetRepository() as repo:
            analysis_set = repo.add(args.name, args.path)
            print(f"Added: {analysis_set.name}")

    elif args.command == 'analyze':
        with AnalysisSetRepository() as repo:
            analysis_set = repo.find_by_name(args.name)
            if not analysis_set:
                print(f"Error: {args.name} not found")
                return 1

        orchestrator = AnalysisOrchestrator()
        result = orchestrator.analyze(analysis_set)
        result.save_to_file()
```

**Benefits:**
- Each module has clear, simple interface
- Implementation details hidden from callers
- Easy to test in isolation
- Changes contained within module boundaries
- Self-documenting code (less need for comments)

**Trade-offs:**
- More upfront design thought required
- Slightly more lines of code (but much clearer)
- Need to migrate existing tests
- Breaking changes to internal APIs (public CLI unchanged)

**Migration Strategy:**
1. Create new classes alongside existing functions
2. Add tests for new classes
3. Migrate cmd_* functions to use new classes
4. Verify all existing tests still pass
5. Remove old functions
6. Update internal references

---

### Solution 2: Big Bang Rewrite

**Philosophy:** Redesign architecture from scratch with ideal module boundaries.

**Approach:**
- Stop all feature work
- Design complete class hierarchy
- Implement all layers simultaneously
- Switch over once complete

**Benefits:**
- Clean slate, no legacy constraints
- Perfectly consistent design

**Trade-offs:**
- High risk (long period without working code)
- Testing burden all at once
- May discover design flaws late
- Feature development blocked

**Verdict:** Not recommended. Incremental refactoring lower risk.

---

### Solution 3: Accept Current Design

**Philosophy:** Design issues don't currently block progress.

**Approach:**
- Document known issues
- Refactor only when adding features that would benefit
- Prioritize new functionality over code quality

**Trade-offs:**
- Technical debt accumulates
- Each new feature harder to add
- Testing becomes more difficult
- Onboarding friction increases

**Verdict:** Not recommended. Issues already creating friction.

## Implementation Plan

**Phase 1: Repository Layer** (Estimated: 2-3 hours)
- [ ] Create `AnalysisSet` dataclass
- [ ] Implement `AnalysisSetRepository` class
- [ ] Write comprehensive tests
- [ ] Migrate `cmd_*` functions to use repository
- [ ] Remove old database functions

**Phase 2: Tree Abstraction** (Estimated: 3-4 hours)
- [ ] Create `CodeTree` class
- [ ] Move tree building logic into class methods
- [ ] Encapsulate `_dirs`/`_files` as private
- [ ] Add tests for tree operations
- [ ] Update `analyze_repos` to use `CodeTree`

**Phase 3: Analysis Pipeline** (Estimated: 4-5 hours)
- [ ] Extract `RepositoryDiscoverer` class
- [ ] Extract `CodeAnalyzer` class
- [ ] Create `AnalysisOrchestrator`
- [ ] Decompose `analyze_repos()` into pipeline
- [ ] Test each stage independently

**Phase 4: CLI Simplification** (Estimated: 1-2 hours)
- [ ] Move command logic directly into CLI handler
- [ ] Remove `cmd_*` pass-through functions
- [ ] Verify all CLI commands still work
- [ ] Update documentation

**Testing Strategy:**
- Write tests for new classes before migration
- Keep existing tests passing throughout
- Add integration tests for end-to-end workflows
- Test error paths explicitly

**Success Metrics:**
- All existing tests pass
- New modules have >90% test coverage
- `aina_lib.py` reduced from 468 to <200 lines
- Each module describable in one sentence

## References

- **Book:** "A Philosophy of Software Design" by John Ousterhout
- **Design Review:** Generated 2025-11-24 by ousterhout-design-reviewer agent
- **Key Principle:** "The best modules are those whose interfaces are much simpler than their implementations"

## Dependencies

**Blocks:** None (internal quality improvement)
**Blocked by:** None (can start immediately)

## Notes

This is technical debt remediation, not new functionality. User-facing behavior unchanged. All improvements internal to codebase maintainability.

Frontend code (Vue components) generally follows good design principles. Focus refactoring on Python backend only.
