import { ref, watch, computed } from 'vue'

const GLOBAL_STORAGE_KEY = 'ainalyzer-global'

const defaultGlobalPrefs = {
  lastSelectedAnalysis: null
}

const defaultAnalysisPrefs = {
  version: '1.0',
  appearance: {
    cushionTreemap: false,
    hideFolderBorders: true,
    showRepoBorders: true,
    colorMode: 'depth'
  },
  filters: {
    hideClocignore: true,
    customExclusions: []
  }
}

// Shared state (module-level singletons)
const globalPrefs = ref(null)
const analysisPrefs = ref(null)
const currentAnalysisName = ref(null)
let globalWatcherSet = false
let analysisWatcherCleanup = null

function getAnalysisStorageKey(name) {
  return `ainalyzer-${name}`
}

function loadGlobalPrefs() {
  let stored = { ...defaultGlobalPrefs }
  const localData = localStorage.getItem(GLOBAL_STORAGE_KEY)
  if (localData) {
    try {
      const parsed = JSON.parse(localData)
      stored = { ...defaultGlobalPrefs, ...parsed }
    } catch (e) {
      console.error('Failed to parse global preferences:', e)
    }
  }

  // Override with URL param
  const params = new URLSearchParams(window.location.search)
  if (params.has('analysis')) {
    stored.lastSelectedAnalysis = params.get('analysis')
  }

  return stored
}

function loadAnalysisPrefs(analysisName) {
  if (!analysisName) return null

  let stored = {
    ...defaultAnalysisPrefs,
    appearance: { ...defaultAnalysisPrefs.appearance },
    filters: { ...defaultAnalysisPrefs.filters, customExclusions: [] }
  }

  const localData = localStorage.getItem(getAnalysisStorageKey(analysisName))
  if (localData) {
    try {
      const parsed = JSON.parse(localData)
      stored = {
        ...defaultAnalysisPrefs,
        ...parsed,
        appearance: {
          ...defaultAnalysisPrefs.appearance,
          ...(parsed.appearance || {})
        },
        filters: {
          ...defaultAnalysisPrefs.filters,
          ...(parsed.filters || {}),
          customExclusions: parsed.filters?.customExclusions || []
        }
      }
    } catch (e) {
      console.error('Failed to parse analysis preferences:', e)
    }
  }

  // Override with URL params
  const params = new URLSearchParams(window.location.search)
  if (params.has('cushion')) {
    stored.appearance.cushionTreemap = params.get('cushion') === 'true'
  }
  if (params.has('colorMode')) {
    stored.appearance.colorMode = params.get('colorMode')
  }

  return stored
}

// Build combined preferences object with reactive getters/setters
function createPreferencesProxy() {
  return {
    get lastSelectedAnalysis() {
      return globalPrefs.value?.lastSelectedAnalysis || null
    },
    set lastSelectedAnalysis(value) {
      if (globalPrefs.value) {
        globalPrefs.value.lastSelectedAnalysis = value
      }
    },
    get appearance() {
      return analysisPrefs.value?.appearance || { ...defaultAnalysisPrefs.appearance }
    },
    set appearance(value) {
      if (analysisPrefs.value) {
        analysisPrefs.value.appearance = value
      }
    },
    get filters() {
      return analysisPrefs.value?.filters || { ...defaultAnalysisPrefs.filters, customExclusions: [] }
    },
    set filters(value) {
      if (analysisPrefs.value) {
        analysisPrefs.value.filters = value
      }
    }
  }
}

export function usePreferences() {
  // Initialize global prefs on first use
  if (globalPrefs.value === null) {
    globalPrefs.value = loadGlobalPrefs()
  }

  // Set up global watcher once
  if (!globalWatcherSet) {
    globalWatcherSet = true
    watch(globalPrefs, (newPrefs) => {
      localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(newPrefs))
    }, { deep: true })
  }

  // Create a ref that wraps the proxy - this allows preferences.value.x = y syntax
  const preferences = ref(createPreferencesProxy())

  // Keep preferences ref in sync when underlying refs change
  watch([globalPrefs, analysisPrefs], () => {
    // Trigger reactivity by reassigning the proxy
    preferences.value = createPreferencesProxy()
  }, { deep: true })

  function setCurrentAnalysis(analysisName) {
    if (analysisName === currentAnalysisName.value) return

    // Stop watching previous analysis
    if (analysisWatcherCleanup) {
      analysisWatcherCleanup()
      analysisWatcherCleanup = null
    }

    currentAnalysisName.value = analysisName
    analysisPrefs.value = loadAnalysisPrefs(analysisName)

    // Update preferences ref
    preferences.value = createPreferencesProxy()

    // Watch and save analysis-specific prefs
    if (analysisName) {
      analysisWatcherCleanup = watch(analysisPrefs, (newPrefs) => {
        if (newPrefs && currentAnalysisName.value) {
          localStorage.setItem(getAnalysisStorageKey(currentAnalysisName.value), JSON.stringify(newPrefs))
        }
      }, { deep: true })
    }
  }

  function resetPreferences() {
    if (analysisPrefs.value) {
      analysisPrefs.value.appearance = { ...defaultAnalysisPrefs.appearance }
      analysisPrefs.value.filters = { ...defaultAnalysisPrefs.filters, customExclusions: [] }
      // Trigger reactivity
      preferences.value = createPreferencesProxy()
    }
  }

  function updateURL() {
    const params = new URLSearchParams()

    if (globalPrefs.value?.lastSelectedAnalysis) {
      params.set('analysis', globalPrefs.value.lastSelectedAnalysis)
    }
    if (analysisPrefs.value?.appearance?.cushionTreemap !== defaultAnalysisPrefs.appearance.cushionTreemap) {
      params.set('cushion', String(analysisPrefs.value.appearance.cushionTreemap))
    }
    if (analysisPrefs.value?.appearance?.colorMode !== defaultAnalysisPrefs.appearance.colorMode) {
      params.set('colorMode', analysisPrefs.value.appearance.colorMode)
    }

    const url = new URL(window.location.href)
    url.search = params.toString()
    window.history.replaceState({}, '', url.toString())
  }

  function shareCurrentView() {
    const params = new URLSearchParams()

    if (globalPrefs.value?.lastSelectedAnalysis) {
      params.set('analysis', globalPrefs.value.lastSelectedAnalysis)
    }
    if (analysisPrefs.value?.appearance?.cushionTreemap !== defaultAnalysisPrefs.appearance.cushionTreemap) {
      params.set('cushion', String(analysisPrefs.value.appearance.cushionTreemap))
    }
    if (analysisPrefs.value?.appearance?.colorMode !== defaultAnalysisPrefs.appearance.colorMode) {
      params.set('colorMode', analysisPrefs.value.appearance.colorMode)
    }

    const url = new URL(window.location.href)
    url.search = params.toString()
    const finalUrl = url.toString()

    window.history.replaceState({}, '', finalUrl)
    navigator.clipboard.writeText(finalUrl)
    return finalUrl
  }

  function exportPreferences() {
    return JSON.stringify({
      global: globalPrefs.value,
      analysis: analysisPrefs.value,
      analysisName: currentAnalysisName.value
    }, null, 2)
  }

  function importPreferences(json) {
    try {
      const imported = JSON.parse(json)
      if (imported.analysis && analysisPrefs.value) {
        analysisPrefs.value.appearance = {
          ...defaultAnalysisPrefs.appearance,
          ...(imported.analysis.appearance || {})
        }
        analysisPrefs.value.filters = {
          ...defaultAnalysisPrefs.filters,
          ...(imported.analysis.filters || {})
        }
        // Trigger reactivity
        preferences.value = createPreferencesProxy()
      }
    } catch (e) {
      throw new Error('Invalid preferences JSON')
    }
  }

  function addExclusion(pattern) {
    if (!analysisPrefs.value) return
    if (!analysisPrefs.value.filters.customExclusions) {
      analysisPrefs.value.filters.customExclusions = []
    }
    const existing = analysisPrefs.value.filters.customExclusions.find(
      e => e.pattern === pattern
    )
    if (existing) {
      // If pattern exists but is disabled, enable it
      if (!existing.enabled) {
        existing.enabled = true
      }
    } else {
      analysisPrefs.value.filters.customExclusions.push({
        pattern,
        enabled: true,
        createdAt: new Date().toISOString()
      })
    }
  }

  function removeExclusion(pattern) {
    if (!analysisPrefs.value?.filters.customExclusions) return
    analysisPrefs.value.filters.customExclusions =
      analysisPrefs.value.filters.customExclusions.filter(e => e.pattern !== pattern)
  }

  function toggleExclusion(pattern) {
    if (!analysisPrefs.value?.filters.customExclusions) return
    const exclusion = analysisPrefs.value.filters.customExclusions.find(
      e => e.pattern === pattern
    )
    if (exclusion) {
      exclusion.enabled = !exclusion.enabled
    }
  }

  function updateExclusion(oldPattern, newPattern) {
    if (!analysisPrefs.value?.filters.customExclusions) return
    if (!newPattern.trim()) return
    const exclusion = analysisPrefs.value.filters.customExclusions.find(
      e => e.pattern === oldPattern
    )
    if (exclusion) {
      exclusion.pattern = newPattern.trim()
    }
  }

  return {
    preferences,
    setCurrentAnalysis,
    resetPreferences,
    updateURL,
    shareCurrentView,
    exportPreferences,
    importPreferences,
    addExclusion,
    removeExclusion,
    toggleExclusion,
    updateExclusion
  }
}
