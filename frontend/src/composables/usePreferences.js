import { ref, watch } from 'vue'

const STORAGE_KEY = 'ainalyzer-preferences'

const defaultPreferences = {
  version: '1.0',
  lastSelectedAnalysis: null,
  appearance: {
    cushionTreemap: false,
    hideFolderBorders: true,  // Only applies when cushionTreemap is true
    colorMode: 'depth'  // 'depth' | 'filetype'
  },
  filters: {
    hideClocignore: true,  // Hide files matching .clocignore patterns
    customExclusions: []   // [{pattern, enabled, createdAt}]
  }
}

// Shared state across all component instances
const preferences = ref(null)

export function usePreferences() {
  // Initialize on first use
  if (preferences.value === null) {
    preferences.value = loadPreferences()

    // Watch for changes and auto-save
    watch(preferences, (newPrefs) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))
    }, { deep: true })
  }

  function loadPreferences() {
    // 1. Load from localStorage
    let stored = {
      ...defaultPreferences,
      appearance: { ...defaultPreferences.appearance },
      filters: { ...defaultPreferences.filters }
    }
    const localData = localStorage.getItem(STORAGE_KEY)
    if (localData) {
      try {
        const parsed = JSON.parse(localData)
        stored = {
          ...defaultPreferences,
          ...parsed,
          appearance: {
            ...defaultPreferences.appearance,
            ...(parsed.appearance || {})
          },
          filters: {
            ...defaultPreferences.filters,
            ...(parsed.filters || {})
          }
        }
      } catch (e) {
        console.error('Failed to parse preferences:', e)
      }
    }

    // 2. Override with URL params
    const params = new URLSearchParams(window.location.search)
    if (params.has('analysis')) {
      stored.lastSelectedAnalysis = params.get('analysis')
    }
    if (params.has('cushion')) {
      stored.appearance.cushionTreemap = params.get('cushion') === 'true'
    }
    if (params.has('colorMode')) {
      stored.appearance.colorMode = params.get('colorMode')
    }

    return stored
  }

  function resetPreferences() {
    // Replace all properties to trigger reactivity (deep copy)
    Object.assign(preferences.value, {
      ...defaultPreferences,
      appearance: { ...defaultPreferences.appearance },
      filters: {
        ...defaultPreferences.filters,
        customExclusions: []  // Reset array to empty
      }
    })
  }

  function updateURL() {
    const params = new URLSearchParams()

    // Add non-default preferences to URL
    if (preferences.value.lastSelectedAnalysis !== defaultPreferences.lastSelectedAnalysis) {
      params.set('analysis', preferences.value.lastSelectedAnalysis)
    }
    if (preferences.value.appearance?.cushionTreemap !== defaultPreferences.appearance.cushionTreemap) {
      params.set('cushion', String(preferences.value.appearance.cushionTreemap))
    }
    if (preferences.value.appearance?.colorMode !== defaultPreferences.appearance.colorMode) {
      params.set('colorMode', preferences.value.appearance.colorMode)
    }

    const url = new URL(window.location.href)
    url.search = params.toString()
    window.history.replaceState({}, '', url.toString())
  }

  function shareCurrentView() {
    const params = new URLSearchParams()

    // Add non-default preferences to URL
    if (preferences.value.lastSelectedAnalysis !== defaultPreferences.lastSelectedAnalysis) {
      params.set('analysis', preferences.value.lastSelectedAnalysis)
    }
    if (preferences.value.appearance?.cushionTreemap !== defaultPreferences.appearance.cushionTreemap) {
      params.set('cushion', String(preferences.value.appearance.cushionTreemap))
    }
    if (preferences.value.appearance?.colorMode !== defaultPreferences.appearance.colorMode) {
      params.set('colorMode', preferences.value.appearance.colorMode)
    }

    const url = new URL(window.location.href)
    url.search = params.toString()
    const finalUrl = url.toString()

    window.history.replaceState({}, '', finalUrl)
    navigator.clipboard.writeText(finalUrl)
    return finalUrl
  }

  function exportPreferences() {
    return JSON.stringify(preferences.value, null, 2)
  }

  function importPreferences(json) {
    try {
      const imported = JSON.parse(json)
      Object.assign(preferences.value, {
        ...defaultPreferences,
        ...imported,
        appearance: {
          ...defaultPreferences.appearance,
          ...(imported.appearance || {})
        },
        filters: {
          ...defaultPreferences.filters,
          ...(imported.filters || {})
        }
      })
    } catch (e) {
      throw new Error('Invalid preferences JSON')
    }
  }

  function addExclusion(pattern) {
    if (!preferences.value.filters.customExclusions) {
      preferences.value.filters.customExclusions = []
    }
    // Check for duplicate
    const exists = preferences.value.filters.customExclusions.some(
      e => e.pattern === pattern
    )
    if (!exists) {
      preferences.value.filters.customExclusions.push({
        pattern,
        enabled: true,
        createdAt: new Date().toISOString()
      })
    }
  }

  function removeExclusion(pattern) {
    if (!preferences.value.filters.customExclusions) return
    preferences.value.filters.customExclusions =
      preferences.value.filters.customExclusions.filter(e => e.pattern !== pattern)
  }

  function toggleExclusion(pattern) {
    if (!preferences.value.filters.customExclusions) return
    const exclusion = preferences.value.filters.customExclusions.find(
      e => e.pattern === pattern
    )
    if (exclusion) {
      exclusion.enabled = !exclusion.enabled
    }
  }

  return {
    preferences,
    resetPreferences,
    updateURL,
    shareCurrentView,
    exportPreferences,
    importPreferences,
    addExclusion,
    removeExclusion,
    toggleExclusion
  }
}
