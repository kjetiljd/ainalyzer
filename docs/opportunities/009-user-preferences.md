# Opportunity: User Preferences and Configuration

**Status:** Identified
**Last Updated:** 2025-11-24
**Parent:** None (Infrastructure)

## Desired Outcome

Users can customize visualization behavior and appearance through persistent preferences that survive page reloads and work across different analysis sets.

## Opportunity (Problem Space)

**Current State:**
- No user preferences or configuration options
- All visualization settings are hardcoded
- No way to toggle features on/off
- Settings reset on page reload
- Cannot save preferred view modes

**Emerging Configuration Needs:**
- Cushion treemap: enable/disable 3D effect (Opportunity 008)
- Stats panel: show/hide, position preference (Opportunity 007)
- Labels: show/hide, size thresholds (Opportunity 004)
- Color scheme: light/dark mode, custom palettes
- Treemap layout: padding, aspect ratio preferences
- File filters: hidden file patterns, language filters
- Zoom behavior: animation speed, double-click action

**Impact:**
- Users cannot adapt tool to their workflow
- Same experience for all users (no personalization)
- Feature toggles require code changes
- Cannot A/B test features with user opt-in
- Settings lost between sessions (frustrating)

**User Needs:**
- Save preferred visualization style
- Toggle features without losing state
- Persistent settings across sessions
- Per-analysis-set preferences (optional)
- Easy reset to defaults

## Solutions (Explored)

### Solution 1: LocalStorage with Vue Composable

**Philosophy:** Browser-native storage. Simple, no backend needed.

**Approach:**
- Store preferences in `localStorage` as JSON
- Create `usePreferences()` composable for reactive access
- Preferences auto-save on change
- Scope: global (all analyses) or per-analysis-set
- Settings UI: modal or side panel

**Implementation:**
```javascript
// composables/usePreferences.js
import { ref, watch } from 'vue'

const STORAGE_KEY = 'ainalyzer-preferences'

const defaultPreferences = {
  appearance: {
    cushionTreemap: false,
    showLabels: true,
    labelMinSize: 60,
    colorScheme: 'default',
    strokeWidth: 2
  },
  ui: {
    showStatsPanel: true,
    statsPosition: 'top',
    showStatusline: true,
    animationSpeed: 'normal'
  },
  filters: {
    hiddenPatterns: ['.git', 'node_modules', '__pycache__'],
    languageFilter: []
  },
  navigation: {
    doubleClickAction: 'drill-down',
    breadcrumbStyle: 'full'
  }
}

export function usePreferences() {
  const preferences = ref(loadPreferences())

  // Watch for changes and auto-save
  watch(preferences, (newPrefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))
  }, { deep: true })

  function loadPreferences() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return { ...defaultPreferences, ...JSON.parse(stored) }
      } catch (e) {
        console.error('Failed to parse preferences:', e)
        return defaultPreferences
      }
    }
    return defaultPreferences
  }

  function resetPreferences() {
    preferences.value = { ...defaultPreferences }
  }

  function exportPreferences() {
    return JSON.stringify(preferences.value, null, 2)
  }

  function importPreferences(json) {
    try {
      const imported = JSON.parse(json)
      preferences.value = { ...defaultPreferences, ...imported }
    } catch (e) {
      throw new Error('Invalid preferences JSON')
    }
  }

  return {
    preferences,
    resetPreferences,
    exportPreferences,
    importPreferences
  }
}
```

**Settings Component:**
```vue
<template>
  <div class="settings-panel">
    <h2>Preferences</h2>

    <section>
      <h3>Appearance</h3>
      <label>
        <input type="checkbox" v-model="preferences.appearance.cushionTreemap" />
        Enable 3D cushion effect
      </label>
      <label>
        <input type="checkbox" v-model="preferences.appearance.showLabels" />
        Show in-cell labels
      </label>
      <label>
        Stroke width:
        <input
          type="range"
          min="0"
          max="5"
          v-model.number="preferences.appearance.strokeWidth"
        />
        {{ preferences.appearance.strokeWidth }}px
      </label>
    </section>

    <section>
      <h3>UI Layout</h3>
      <label>
        <input type="checkbox" v-model="preferences.ui.showStatsPanel" />
        Show statistics panel
      </label>
      <label>
        Stats position:
        <select v-model="preferences.ui.statsPosition">
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="floating">Floating</option>
        </select>
      </label>
    </section>

    <section>
      <h3>Filters</h3>
      <label>
        Hidden patterns (comma-separated):
        <input
          type="text"
          :value="preferences.filters.hiddenPatterns.join(', ')"
          @input="updateHiddenPatterns"
        />
      </label>
    </section>

    <footer>
      <button @click="resetPreferences">Reset to Defaults</button>
      <button @click="exportToFile">Export Settings</button>
      <button @click="importFromFile">Import Settings</button>
    </footer>
  </div>
</template>

<script setup>
import { usePreferences } from '@/composables/usePreferences'

const { preferences, resetPreferences, exportPreferences, importPreferences } = usePreferences()

function updateHiddenPatterns(event) {
  preferences.value.filters.hiddenPatterns = event.target.value
    .split(',')
    .map(p => p.trim())
    .filter(p => p)
}

function exportToFile() {
  const blob = new Blob([exportPreferences()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ainalyzer-preferences.json'
  a.click()
  URL.revokeObjectURL(url)
}

function importFromFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    const text = await file.text()
    try {
      importPreferences(text)
      alert('Preferences imported successfully')
    } catch (err) {
      alert('Failed to import: ' + err.message)
    }
  }
  input.click()
}
</script>
```

**Benefits:**
- No backend required
- Instant persistence (no network latency)
- Works offline
- Simple implementation
- Native browser API

**Trade-offs:**
- localStorage limit (~5-10MB)
- Not synced across devices
- Browser-specific (not portable)
- Can be cleared by user/browser
- No versioning or migration support

---

### Solution 2: Configuration File (~/.ainalyzer/config.json)

**Philosophy:** Persistent config file. Shareable, version-controllable.

**Approach:**
- Store preferences in `~/.ainalyzer/config.json`
- Backend API: `GET /api/config`, `PUT /api/config`
- Frontend fetches config on load
- Changes saved via API call (debounced)
- Config file is plain JSON (editable by hand)

**File Structure:**
```json
{
  "version": "1.0",
  "preferences": {
    "appearance": {
      "cushionTreemap": false,
      "showLabels": true,
      "labelMinSize": 60,
      "colorScheme": "default"
    },
    "ui": {
      "showStatsPanel": true,
      "statsPosition": "top"
    }
  },
  "perAnalysis": {
    "my-project": {
      "lastView": "backend/src",
      "zoom": 1.5,
      "filters": ["*.test.js"]
    }
  }
}
```

**Backend API:**
```python
# In aina_lib.py or new config module

def get_config_path():
    return Path.home() / '.aina' / 'config.json'

def load_config():
    config_path = get_config_path()
    if config_path.exists():
        with open(config_path, 'r') as f:
            return json.load(f)
    return get_default_config()

def save_config(config):
    config_path = get_config_path()
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)

def get_default_config():
    return {
        'version': '1.0',
        'preferences': { ... }
    }
```

**Vite Dev Server Route:**
```javascript
// vite.config.js
configureServer(server) {
  server.middlewares.use('/api/config', async (req, res) => {
    if (req.method === 'GET') {
      const config = execSync('python3 -c "from aina_lib import load_config; print(load_config())"')
      res.setHeader('Content-Type', 'application/json')
      res.end(config)
    } else if (req.method === 'PUT') {
      // Read body, save config
    }
  })
}
```

**Benefits:**
- Survives browser cache clear
- Shareable (commit to dotfiles repo)
- Human-editable (power users can edit JSON)
- Supports per-analysis preferences
- Version control friendly

**Trade-offs:**
- Requires backend API
- More complex (network requests)
- Need error handling (file permissions, etc.)
- Sync issues (stale data if multiple tabs)
- Doesn't work with static file:// deployment

---

### Solution 3: URL Query Parameters (Stateless)

**Philosophy:** No persistence. Shareable links with embedded preferences.

**Approach:**
- Encode preferences in URL query string
- Example: `?cushion=true&labels=false&stats=top`
- Parse on load, apply preferences
- "Share View" button generates URL with current settings
- No storage needed

**Implementation:**
```javascript
// Parse URL params on mount
function loadPreferencesFromURL() {
  const params = new URLSearchParams(window.location.search)

  return {
    appearance: {
      cushionTreemap: params.get('cushion') === 'true',
      showLabels: params.get('labels') !== 'false',
      strokeWidth: parseInt(params.get('stroke') || '2')
    },
    ui: {
      showStatsPanel: params.get('stats') !== 'hidden',
      statsPosition: params.get('statsPos') || 'top'
    }
  }
}

// Update URL when preferences change
function updateURL(preferences) {
  const params = new URLSearchParams()
  params.set('cushion', preferences.appearance.cushionTreemap)
  params.set('labels', preferences.appearance.showLabels)
  params.set('stroke', preferences.appearance.strokeWidth)
  params.set('stats', preferences.ui.showStatsPanel ? 'visible' : 'hidden')
  params.set('statsPos', preferences.ui.statsPosition)

  const url = new URL(window.location)
  url.search = params.toString()
  window.history.replaceState({}, '', url)
}

// Share button
function shareCurrentView() {
  const url = window.location.href
  navigator.clipboard.writeText(url)
  alert('Shareable link copied to clipboard!')
}
```

**Benefits:**
- No storage infrastructure needed
- Shareable links (send to colleagues)
- Works with static deployment
- Bookmarkable configurations
- No privacy concerns (no cookies/storage)

**Trade-offs:**
- Long, ugly URLs
- Not persistent by default (need to bookmark)
- Limited to URL length (~2000 chars)
- Preferences visible in URL (not private)
- Manual sharing required

---

### Solution 4: Hybrid: LocalStorage + URL Override

**Philosophy:** Best of both worlds. Persistent defaults, shareable overrides.

**Approach:**
- Default preferences from localStorage (Solution 1)
- URL params override localStorage (Solution 3)
- "Share View" exports current state to URL
- "Save as Default" writes to localStorage

**Flow:**
1. Load preferences from localStorage
2. Parse URL params
3. Merge URL params over localStorage (URL wins)
4. User changes settings → update localStorage
5. User clicks "Share" → encode to URL

**Benefits:**
- Persistence for personal use
- Shareability for collaboration
- No backend needed
- Flexible (use either mechanism)
- Clean URLs by default

**Trade-offs:**
- Two sources of truth (potential confusion)
- Merge logic complexity
- Need clear UI for "Save" vs "Share"

---

### Solution 5: Browser Extension Storage

**Philosophy:** Leverage browser's native storage. Sync across devices.

**Approach:**
- Create optional browser extension
- Extension stores preferences in `chrome.storage.sync`
- Syncs across devices via browser account
- Extension injects preferences into page
- Works without extension (fallback to localStorage)

**Benefits:**
- Cross-device sync (via browser account)
- No backend required
- Separate from page storage (won't be cleared)
- Can sync with other browser data

**Trade-offs:**
- Requires building/maintaining extension
- Extra install step for users
- Browser-specific (need Chrome + Firefox versions)
- Overkill for simple preferences

---

## Comparison Matrix

| Criterion | localStorage | Config File | URL Params | Hybrid | Extension |
|-----------|-------------|-------------|------------|--------|-----------|
| Persistence | Good | Excellent | Manual | Good | Excellent |
| Cross-device | No | No | Manual | Manual | Yes |
| Shareability | No | File | Yes | Yes | No |
| Implementation | Simple | Medium | Simple | Medium | Complex |
| Backend required | No | Yes | No | No | No |
| Static deployment | Yes | No | Yes | Yes | Yes |
| User control | Medium | High | Low | High | Medium |

## Recommendation

**Solution 4 (Hybrid: localStorage + URL)** for MVP:
- Best balance of persistence and shareability
- No backend dependency
- Clean default experience
- Power users can share configurations
- Simple implementation (combine Solutions 1 + 3)

**Phase 2:** Add Solution 2 (config file) for power users who want dotfile management.

## Implementation Plan

**Phase 1: Core Composable** (Estimated: 2-3 hours)
- [ ] Create `usePreferences()` composable
- [ ] Define default preferences schema
- [ ] Implement localStorage save/load
- [ ] Add JSON validation
- [ ] Add reset to defaults

**Phase 2: URL Override** (Estimated: 1-2 hours)
- [ ] Parse URL params on mount
- [ ] Merge URL params over localStorage
- [ ] Add `updateURL()` function (replaceState)
- [ ] Add "Share View" button (copy URL)

**Phase 3: Settings UI** (Estimated: 3-4 hours)
- [ ] Create SettingsModal.vue component
- [ ] Add settings button in header (gear icon)
- [ ] Organize preferences into sections
- [ ] Add search/filter for settings
- [ ] Keyboard shortcut to open (Cmd/Ctrl+,)

**Phase 4: Integration** (Estimated: 2-3 hours)
- [ ] Integrate preferences into Treemap.vue
- [ ] Integrate preferences into StatsBar.vue
- [ ] Integrate preferences into Breadcrumb.vue
- [ ] Update all components to be reactive to preferences
- [ ] Test all preference changes apply immediately

**Phase 5: Export/Import** (Estimated: 1 hour)
- [ ] Add export to JSON file
- [ ] Add import from JSON file
- [ ] Validate imported JSON schema
- [ ] Handle import errors gracefully

**Testing Strategy:**
- Test localStorage quota exceeded (fallback)
- Test invalid JSON (corruption recovery)
- Test URL param parsing (malformed values)
- Test preference migration (version changes)
- Test in private/incognito mode (no storage)
- Test across browsers (Safari, Firefox, Chrome)

**Success Metrics:**
- Settings save/load in <50ms
- No lost preferences on page reload
- URL sharing works correctly
- Reset to defaults works reliably
- Preferences apply immediately (no refresh)

## Preference Schema

```typescript
interface Preferences {
  version: string  // Schema version for migration

  appearance: {
    cushionTreemap: boolean
    showLabels: boolean
    labelMinSize: number  // px
    colorScheme: 'default' | 'colorblind' | 'monochrome'
    strokeWidth: number  // px
    backgroundColor: string  // hex color
  }

  ui: {
    showStatsPanel: boolean
    statsPosition: 'top' | 'bottom' | 'floating'
    showStatusline: boolean
    showBreadcrumb: boolean
    animationSpeed: 'none' | 'fast' | 'normal' | 'slow'
  }

  filters: {
    hiddenPatterns: string[]  // .gitignore-style patterns
    languageFilter: string[]  // ['Python', 'JavaScript']
    minFileSize: number  // lines (hide files smaller than)
  }

  navigation: {
    doubleClickAction: 'drill-down' | 'view-code' | 'none'
    scrollBehavior: 'zoom' | 'none'
    breadcrumbStyle: 'full' | 'compact' | 'icons'
  }

  advanced: {
    debugMode: boolean
    showPerformanceMetrics: boolean
    cacheAnalysis: boolean
  }
}
```

## UI/UX Considerations

**Settings Access:**
- Gear icon in header (always visible)
- Keyboard shortcut: `Cmd/Ctrl + ,`
- Right-click context menu → Settings

**Settings Modal Layout:**
- Left sidebar: category navigation
- Right panel: current category settings
- Footer: Reset, Export, Import, Close buttons
- Search bar filters visible settings

**Immediate vs Deferred Apply:**
- **Immediate:** Visual changes (colors, labels) apply instantly
- **Deferred:** Expensive changes (filters) have "Apply" button

**Setting Discoverability:**
- Tooltip on gear icon: "Settings (Cmd+,)"
- First-time user: banner "Customize your view in Settings"
- Empty states link to relevant settings

## Dependencies

**Blocks:**
- Opportunity 008 (cushion treemap toggle)
- Opportunity 007 (stats panel visibility)
- Future features requiring configuration

**Blocked by:** None (can implement now)

## Notes

- Preferences should not include analysis data (only UI state)
- Consider GDPR: localStorage is user data (allow export/delete)
- Settings should be progressive disclosure (basic → advanced)
- Too many settings = decision paralysis (curate carefully)
- Consider presets: "Minimal", "Default", "Power User"

## Future Enhancements

- Cloud sync (optional Firebase/Supabase integration)
- Team preferences (shared via git repo)
- A/B testing framework (enable experimental features)
- Preference profiles (switch between "Work" and "Presentation")
- Keyboard shortcuts customization
- Per-analysis-set preferences (remember last view, zoom level)
- Import preferences from other tools (WinDirStat, Baobab)

## Migration Strategy

When preferences schema changes:
```javascript
function migratePreferences(stored) {
  const version = stored.version || '0.0'

  if (version < '1.1') {
    // Migrate from 1.0 to 1.1
    stored.appearance.backgroundColor = '#1e1e1e'
  }

  if (version < '1.2') {
    // Add new setting with default
    stored.ui.animationSpeed = 'normal'
  }

  stored.version = '1.2'
  return stored
}
```
