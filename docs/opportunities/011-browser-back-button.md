# 011: Browser Back Button Navigation

**Impact:** 3 | **Effort:** 2 | **Complexity:** 2 | **Score:** 1.50

**Status:** Identified | **Parent:** 002 (Code Visibility)

## Problem Statement

When drilling down into the treemap hierarchy, the browser's back button does not navigate to the previous view. Users expect standard browser navigation behavior, but currently clicking back exits the application entirely or goes to the previous page.

## Current Behavior

- User drills into: root → repo1 → src → components
- User clicks browser back button
- Result: Leaves the app (goes to previous browser history entry)
- Expected: Navigate back to src view

## Proposed Solution

Use the History API to push state when navigating within the treemap, enabling browser back/forward buttons to work naturally.

### Phase 1: Basic History Integration

1. Push state on drill-down navigation
2. Listen for `popstate` events
3. Restore navigation state from history

### Implementation Details

```javascript
// On drill-down
function handleDrillDown(event) {
  // ... existing navigation logic ...

  // Push state to history
  const state = {
    path: breadcrumbPath.value,
    nodePath: currentNode.value?.path
  }
  history.pushState(state, '', buildURL(state))
}

// On popstate (back/forward button)
window.addEventListener('popstate', (event) => {
  if (event.state?.path) {
    restoreNavigation(event.state)
  }
})

// Restore navigation from state
function restoreNavigation(state) {
  // Find node by path in current data
  // Update navigationStack, breadcrumbPath, currentNode
}
```

### URL Structure Options

**Option A: Hash-based (simpler)**
```
http://localhost:5173/#/repo1/src/components
```
- Works without server configuration
- Compatible with static file hosting

**Option B: Query parameter (current approach extended)**
```
http://localhost:5173/?analysis=my-set&path=repo1/src/components
```
- Already using query params for analysis
- Consistent with existing URL structure

**Recommendation:** Option B - extends existing URL parameter approach.

## Success Criteria

1. Browser back button navigates to previous treemap view
2. Browser forward button navigates forward in history
3. URL updates to reflect current navigation path
4. Direct URL access restores navigation state (deep linking)
5. Breadcrumb still works for navigation
6. No regression in existing drill-down behavior

## Technical Considerations

- **State Serialization:** Only store path strings, not full node objects
- **Node Resolution:** Find node by path in current filtered tree
- **Initial Load:** Handle case where URL has path but data not yet loaded
- **Filter Interaction:** Path may not exist if exclusion filters changed

## Edge Cases

1. **Path no longer exists:** User has exclusion that hides the node
   - Solution: Navigate to nearest parent that exists, or root

2. **Analysis changed:** URL path doesn't match current analysis
   - Solution: Reset to root when analysis changes

3. **File viewer open:** Back button should close viewer first
   - Solution: Push separate state for file viewer

## Out of Scope

- Keyboard shortcuts (Backspace for back)
- Custom back button in UI (use breadcrumb)
- Undo/redo for exclusion changes

## Effort Breakdown

| Task | Estimate |
|------|----------|
| History pushState on navigation | 1h |
| popstate listener and state restoration | 2h |
| URL parameter handling | 1h |
| Edge case handling | 2h |
| Testing | 2h |
| **Total** | **8h** |

## Dependencies

- None (uses existing Vue state management)

## Risks

- **Low:** History API is well-supported across browsers
- **Low:** Vue reactivity should handle state restoration cleanly

## Related

- 009: User Preferences (URL parameter handling)
- 002: Code Visibility (navigation system)