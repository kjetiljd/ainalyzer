# Ainalyzer Development Plan

**Format:** Now / Next / Later

This plan follows a focused approach where we work on exactly one thing at a time in the "Now" section. When that's complete, we pull from "Next." The "Later" section references our product brief for the full roadmap.

---

## Now

**Exclusion Patterns (003)** - Phase 2: Interactive Exclusions

Phase 1 (complete) implemented .clocignore parsing and UI filtering.
Phase 2 adds interactive exclusion via context menu and settings management.

### Phase 2: Interactive Exclusions (TDD)

**Feature Overview:**
- Right-click file → context menu with exclusion options
- Exclusions stored in preferences (localStorage)
- Settings panel shows all custom exclusions (scrollable)
- Exclusions can be toggled, removed, or added manually

**Exclusion Options (Context Menu):**
1. Exclude this file (`repo/path/to/file.json`)
2. Exclude this folder (`repo/path/to/**`)
3. Exclude files with same name in repo (`repo/**/filename.json`)
4. Exclude files with same name in analysis (`**/filename.json`)
5. Exclude files with same extension in repo (`repo/**/*.json`)
6. Exclude files with same extension in analysis (`**/*.json`)

---

**Tests First:**

### 1. ExclusionMenu.test.js - Context menu component

```javascript
describe('ExclusionMenu', () => {
  // Rendering
  it('renders when visible prop is true')
  it('hides when visible prop is false')
  it('positions at provided x,y coordinates')

  // Menu options
  it('shows "Exclude this file" with full path')
  it('shows "Exclude this folder" for parent directory')
  it('shows "Exclude same name in repo" option')
  it('shows "Exclude same name everywhere" option')
  it('shows "Exclude *.ext in repo" option')
  it('shows "Exclude *.ext everywhere" option')

  // Events
  it('emits exclude event with pattern when option clicked')
  it('emits close event when clicking outside')
  it('emits close event on Escape key')
})
```

### 2. usePreferences.test.js - Custom exclusions storage

```javascript
describe('usePreferences - exclusions', () => {
  // Structure
  it('includes filters.customExclusions as empty array by default')
  it('loads customExclusions from localStorage')

  // Add/remove
  it('addExclusion() adds pattern to customExclusions')
  it('addExclusion() does not add duplicate patterns')
  it('removeExclusion() removes pattern from customExclusions')
  it('toggleExclusion() toggles enabled state')

  // Exclusion object shape
  it('stores exclusion as {pattern, enabled, createdAt}')
  it('new exclusions default to enabled: true')

  // Persistence
  it('persists customExclusions to localStorage')
  it('preserves existing exclusions when adding new')
})
```

### 3. clocignore.test.js - Combined filtering

```javascript
describe('filterTree with custom exclusions', () => {
  it('combines .clocignore patterns with custom exclusions')
  it('disabled custom exclusions are not applied')
  it('custom exclusion can override .clocignore via negation')
})
```

### 4. SettingsPanel.test.js - Exclusions UI

```javascript
describe('SettingsPanel - exclusions', () => {
  // Display
  it('shows "Custom Exclusions" section')
  it('displays each custom exclusion pattern')
  it('shows checkbox for each exclusion (enabled/disabled)')
  it('shows remove button for each exclusion')
  it('scrolls when exclusion list exceeds max height')

  // Actions
  it('toggle checkbox calls toggleExclusion')
  it('remove button calls removeExclusion')
  it('shows "Add pattern" input field')
  it('Add button calls addExclusion with input value')
  it('clears input after adding')
  it('shows empty state when no custom exclusions')
})
```

### 5. App.test.js - Integration

```javascript
describe('App - context menu integration', () => {
  it('shows context menu on right-click on treemap node')
  it('hides context menu on left-click elsewhere')
  it('adds exclusion when menu option selected')
  it('tree updates to hide excluded file')
})
```

---

**Implementation (after tests pass red):**

### 1. frontend/src/composables/usePreferences.js

```javascript
// Update defaultPreferences
filters: {
  hideClocignore: true,
  customExclusions: []  // [{pattern, enabled, createdAt}]
}

// Add helper functions
function addExclusion(pattern) { ... }
function removeExclusion(pattern) { ... }
function toggleExclusion(pattern) { ... }
```

### 2. frontend/src/components/ExclusionMenu.vue

```vue
<template>
  <div class="exclusion-menu" :style="menuStyle" v-if="visible">
    <div class="menu-item" @click="exclude('file')">
      Exclude this file
    </div>
    <div class="menu-item" @click="exclude('folder')">
      Exclude this folder
    </div>
    <div class="menu-divider" />
    <div class="menu-item" @click="exclude('name-repo')">
      Exclude {{ filename }} in this repo
    </div>
    <div class="menu-item" @click="exclude('name-all')">
      Exclude {{ filename }} everywhere
    </div>
    <div class="menu-divider" />
    <div class="menu-item" @click="exclude('ext-repo')">
      Exclude *.{{ extension }} in this repo
    </div>
    <div class="menu-item" @click="exclude('ext-all')">
      Exclude *.{{ extension }} everywhere
    </div>
  </div>
</template>
```

### 3. frontend/src/components/SettingsPanel.vue (update)

Add new section:
```vue
<section class="settings-section">
  <h3>Custom Exclusions</h3>

  <div class="exclusion-list">
    <div v-for="excl in customExclusions" class="exclusion-item">
      <input type="checkbox" :checked="excl.enabled" @change="toggle(excl)" />
      <span class="pattern">{{ excl.pattern }}</span>
      <button @click="remove(excl)">×</button>
    </div>
  </div>

  <div class="add-exclusion">
    <input v-model="newPattern" placeholder="Add pattern..." />
    <button @click="add">Add</button>
  </div>
</section>
```

### 4. frontend/src/components/Treemap.vue (update)

- Emit `contextmenu` event with node data and position
- Prevent default context menu

### 5. frontend/src/App.vue (update)

- Import and render ExclusionMenu
- Handle right-click from Treemap
- Connect menu actions to addExclusion
- Combine customExclusions with clocignorePatterns in filterTree

### 6. frontend/src/utils/clocignore.js (update)

- `getActivePatterns(clocignore, customExclusions)` - merge sources

---

**Acceptance Criteria:**

1. Right-click any file in treemap shows context menu
2. Selecting exclusion option immediately hides matching files
3. Exclusions appear in Settings panel
4. Exclusions can be toggled on/off
5. Exclusions can be removed
6. Custom pattern can be added manually in Settings
7. Exclusions persist across page reloads
8. All tests pass

---

## Next

1. **Change pattern awareness** - Hidden hotspots and change frequency buried in Git history
   - Git history overlays for treemap
   - Integration with Code Maat for churn analysis
   - Color-coded visualization of change hotspots

2. **Codebase comprehension** - Teams need AI assistance to understand unfamiliar code areas
   - AI-powered prompt toolkit
   - Pattern discovery and architecture insights
   - Natural language exploration of analysis data

---

## Later

**Refactor aina_lib.py to improve cohesion** (paused)
- OO redesign: Database class done, remaining phases: RepositoryScanner, ClocRunner, TreeBuilder, Analyzer, AnalysisIndex
- Maintain 21 passing tests

See [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md) for full feature roadmap including:
- Git history analysis (Code Maat integration)
- Metric overlay system
- AI interpretation toolkit
- Activity metrics
- Performance optimization
