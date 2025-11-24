import { ref, watch } from 'vue'

const STORAGE_KEY = 'ainalyzer-preferences'

const defaultPreferences = {
  version: '1.0',
  lastSelectedAnalysis: null
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
    let stored = { ...defaultPreferences }
    const localData = localStorage.getItem(STORAGE_KEY)
    if (localData) {
      try {
        const parsed = JSON.parse(localData)
        stored = { ...defaultPreferences, ...parsed }
      } catch (e) {
        console.error('Failed to parse preferences:', e)
      }
    }

    // 2. Override with URL params
    const params = new URLSearchParams(window.location.search)
    if (params.has('analysis')) {
      stored.lastSelectedAnalysis = params.get('analysis')
    }

    return stored
  }

  function resetPreferences() {
    // Replace all properties to trigger reactivity
    Object.assign(preferences.value, { ...defaultPreferences })
  }

  function updateURL() {
    const params = new URLSearchParams()

    // Add non-default preferences to URL
    if (preferences.value.lastSelectedAnalysis !== defaultPreferences.lastSelectedAnalysis) {
      params.set('analysis', preferences.value.lastSelectedAnalysis)
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
      Object.assign(preferences.value, { ...defaultPreferences, ...imported })
    } catch (e) {
      throw new Error('Invalid preferences JSON')
    }
  }

  return {
    preferences,
    resetPreferences,
    updateURL,
    shareCurrentView,
    exportPreferences,
    importPreferences
  }
}
