import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('usePreferences', () => {
  let originalLocation
  let originalLocalStorage

  beforeEach(async () => {
    // Reset module to clear shared state
    await vi.resetModules()

    // Mock localStorage
    originalLocalStorage = global.localStorage
    const storage = {}
    global.localStorage = {
      getItem: vi.fn((key) => storage[key] || null),
      setItem: vi.fn((key, value) => { storage[key] = value }),
      removeItem: vi.fn((key) => { delete storage[key] }),
      clear: vi.fn(() => { Object.keys(storage).forEach(key => delete storage[key]) })
    }

    // Mock location
    originalLocation = global.location
    delete global.location
    global.location = {
      search: '',
      href: 'http://localhost:5173/',
      origin: 'http://localhost:5173',
      pathname: '/'
    }

    // Mock history
    global.history = {
      replaceState: vi.fn()
    }

    // Mock clipboard
    global.navigator = {
      clipboard: {
        writeText: vi.fn().mockResolvedValue()
      }
    }
  })

  afterEach(() => {
    global.location = originalLocation
    global.localStorage = originalLocalStorage
    vi.clearAllMocks()
  })

  it('returns default preferences on first load', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis } = usePreferences()
    setCurrentAnalysis('test-analysis')

    expect(preferences.value).toEqual({
      lastSelectedAnalysis: null,
      appearance: {
        cushionTreemap: false,
        hideFolderBorders: true,
        colorMode: 'depth'
      },
      filters: {
        hideClocignore: true,
        customExclusions: []
      }
    })
  })

  it('loads lastSelectedAnalysis from localStorage', async () => {
    const stored = { lastSelectedAnalysis: 'my-project' }
    localStorage.setItem('ainalyzer-global', JSON.stringify(stored))

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    expect(preferences.value.lastSelectedAnalysis).toBe('my-project')
  })

  it('overrides localStorage with URL param', async () => {
    const stored = { lastSelectedAnalysis: 'old-project' }
    localStorage.setItem('ainalyzer-global', JSON.stringify(stored))
    global.location.search = '?analysis=new-project'

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    expect(preferences.value.lastSelectedAnalysis).toBe('new-project')
  })

  it('persists global changes to localStorage', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    preferences.value.lastSelectedAnalysis = 'test-project'
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ainalyzer-global',
      expect.stringContaining('test-project')
    )
  })

  it('persists analysis-specific changes to localStorage', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis } = usePreferences()
    setCurrentAnalysis('my-analysis')

    preferences.value.appearance.cushionTreemap = true
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ainalyzer-my-analysis',
      expect.stringContaining('cushionTreemap')
    )
  })

  it('resets analysis preferences to defaults', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis, resetPreferences } = usePreferences()
    setCurrentAnalysis('test-analysis')
    preferences.value.appearance.cushionTreemap = true

    resetPreferences()

    expect(preferences.value.appearance.cushionTreemap).toBe(false)
  })

  it('updates URL with current preferences', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis, updateURL } = usePreferences()
    setCurrentAnalysis('my-project')
    preferences.value.lastSelectedAnalysis = 'my-project'

    updateURL()

    expect(history.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'http://localhost:5173/?analysis=my-project'
    )
  })

  it('shares current view by copying URL to clipboard', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis, shareCurrentView } = usePreferences()
    setCurrentAnalysis('shared-project')
    preferences.value.lastSelectedAnalysis = 'shared-project'

    const url = await shareCurrentView()

    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    expect(url).toContain('analysis=shared-project')
  })

  it('exports preferences as JSON', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis, exportPreferences } = usePreferences()
    setCurrentAnalysis('export-test')
    preferences.value.lastSelectedAnalysis = 'export-test'

    const exported = exportPreferences()
    const parsed = JSON.parse(exported)

    expect(parsed.global.lastSelectedAnalysis).toBe('export-test')
    expect(parsed.analysisName).toBe('export-test')
  })

  it('imports preferences from JSON', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis, importPreferences } = usePreferences()
    setCurrentAnalysis('test-analysis')
    const json = JSON.stringify({
      analysis: {
        version: '1.0',
        appearance: { cushionTreemap: true }
      }
    })

    importPreferences(json)

    expect(preferences.value.appearance.cushionTreemap).toBe(true)
  })

  it('throws error on invalid JSON import', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { importPreferences } = usePreferences()

    expect(() => {
      importPreferences('invalid json')
    }).toThrow('Invalid preferences JSON')
  })

  it('handles corrupted localStorage gracefully', async () => {
    localStorage.setItem('ainalyzer-global', 'corrupted json{')

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis } = usePreferences()
    setCurrentAnalysis('test-analysis')

    expect(preferences.value.lastSelectedAnalysis).toBe(null)
    expect(preferences.value.appearance.cushionTreemap).toBe(false)
  })

  it('only includes non-default values in URL', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis, updateURL } = usePreferences()
    setCurrentAnalysis('test-analysis')
    preferences.value.lastSelectedAnalysis = null

    updateURL()

    const url = history.replaceState.mock.calls[0][2]
    expect(url).toBe('http://localhost:5173/')
  })

  it('loads cushionTreemap from localStorage', async () => {
    const stored = {
      version: '1.0',
      appearance: { cushionTreemap: true }
    }
    localStorage.setItem('ainalyzer-my-analysis', JSON.stringify(stored))

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis } = usePreferences()
    setCurrentAnalysis('my-analysis')

    expect(preferences.value.appearance.cushionTreemap).toBe(true)
  })

  it('overrides cushionTreemap with URL param', async () => {
    const stored = {
      version: '1.0',
      appearance: { cushionTreemap: false }
    }
    localStorage.setItem('ainalyzer-my-analysis', JSON.stringify(stored))
    global.location.search = '?cushion=true'

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis } = usePreferences()
    setCurrentAnalysis('my-analysis')

    expect(preferences.value.appearance.cushionTreemap).toBe(true)
  })

  it('includes cushion in URL when enabled', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis, updateURL } = usePreferences()
    setCurrentAnalysis('test-analysis')
    preferences.value.appearance.cushionTreemap = true

    updateURL()

    const url = history.replaceState.mock.calls[0][2]
    expect(url).toContain('cushion=true')
  })

  it('preserves appearance defaults when loading partial preferences', async () => {
    const stored = { lastSelectedAnalysis: 'my-project' }
    localStorage.setItem('ainalyzer-global', JSON.stringify(stored))

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis } = usePreferences()
    setCurrentAnalysis('my-project')

    expect(preferences.value.appearance.cushionTreemap).toBe(false)
    expect(preferences.value.appearance.hideFolderBorders).toBe(true)
  })

  it('resets appearance preferences to defaults', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis, resetPreferences } = usePreferences()
    setCurrentAnalysis('test-analysis')
    preferences.value.appearance.cushionTreemap = true
    preferences.value.appearance.hideFolderBorders = false

    resetPreferences()

    expect(preferences.value.appearance.cushionTreemap).toBe(false)
    expect(preferences.value.appearance.hideFolderBorders).toBe(true)
  })

  it('loads hideFolderBorders from localStorage', async () => {
    const stored = {
      version: '1.0',
      appearance: { cushionTreemap: true, hideFolderBorders: false }
    }
    localStorage.setItem('ainalyzer-my-analysis', JSON.stringify(stored))

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis } = usePreferences()
    setCurrentAnalysis('my-analysis')

    expect(preferences.value.appearance.hideFolderBorders).toBe(false)
  })

  it('default colorMode is depth', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis } = usePreferences()
    setCurrentAnalysis('test-analysis')

    expect(preferences.value.appearance.colorMode).toBe('depth')
  })

  it('loads colorMode from localStorage', async () => {
    const stored = {
      version: '1.0',
      appearance: { colorMode: 'filetype' }
    }
    localStorage.setItem('ainalyzer-my-analysis', JSON.stringify(stored))

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis } = usePreferences()
    setCurrentAnalysis('my-analysis')

    expect(preferences.value.appearance.colorMode).toBe('filetype')
  })

  it('overrides colorMode with URL param', async () => {
    const stored = {
      version: '1.0',
      appearance: { colorMode: 'depth' }
    }
    localStorage.setItem('ainalyzer-my-analysis', JSON.stringify(stored))
    global.location.search = '?colorMode=filetype'

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis } = usePreferences()
    setCurrentAnalysis('my-analysis')

    expect(preferences.value.appearance.colorMode).toBe('filetype')
  })

  it('includes colorMode in URL when not default', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis, updateURL } = usePreferences()
    setCurrentAnalysis('test-analysis')
    preferences.value.appearance.colorMode = 'filetype'

    updateURL()

    const url = history.replaceState.mock.calls[0][2]
    expect(url).toContain('colorMode=filetype')
  })

  it('resets colorMode to default', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, setCurrentAnalysis, resetPreferences } = usePreferences()
    setCurrentAnalysis('test-analysis')
    preferences.value.appearance.colorMode = 'filetype'

    resetPreferences()

    expect(preferences.value.appearance.colorMode).toBe('depth')
  })

  // Custom exclusions tests
  describe('custom exclusions', () => {
    it('includes filters.customExclusions as empty array by default', async () => {
      const { usePreferences } = await import('../composables/usePreferences')
      const { preferences, setCurrentAnalysis } = usePreferences()
      setCurrentAnalysis('test-analysis')

      expect(preferences.value.filters.customExclusions).toEqual([])
    })

    it('loads customExclusions from localStorage', async () => {
      const stored = {
        version: '1.0',
        filters: {
          customExclusions: [
            { pattern: '*.lock', enabled: true, createdAt: '2025-01-01' }
          ]
        }
      }
      localStorage.setItem('ainalyzer-my-analysis', JSON.stringify(stored))

      const { usePreferences } = await import('../composables/usePreferences')
      const { preferences, setCurrentAnalysis } = usePreferences()
      setCurrentAnalysis('my-analysis')

      expect(preferences.value.filters.customExclusions).toHaveLength(1)
      expect(preferences.value.filters.customExclusions[0].pattern).toBe('*.lock')
    })

    it('addExclusion() adds pattern to customExclusions', async () => {
      const { usePreferences } = await import('../composables/usePreferences')
      const { preferences, setCurrentAnalysis, addExclusion } = usePreferences()
      setCurrentAnalysis('test-analysis')

      addExclusion('*.json')

      expect(preferences.value.filters.customExclusions).toHaveLength(1)
      expect(preferences.value.filters.customExclusions[0].pattern).toBe('*.json')
    })

    it('addExclusion() does not add duplicate patterns', async () => {
      const { usePreferences } = await import('../composables/usePreferences')
      const { preferences, setCurrentAnalysis, addExclusion } = usePreferences()
      setCurrentAnalysis('test-analysis')

      addExclusion('*.json')
      addExclusion('*.json')

      expect(preferences.value.filters.customExclusions).toHaveLength(1)
    })

    it('removeExclusion() removes pattern from customExclusions', async () => {
      const { usePreferences } = await import('../composables/usePreferences')
      const { preferences, setCurrentAnalysis, addExclusion, removeExclusion } = usePreferences()
      setCurrentAnalysis('test-analysis')

      addExclusion('*.json')
      addExclusion('*.lock')
      removeExclusion('*.json')

      expect(preferences.value.filters.customExclusions).toHaveLength(1)
      expect(preferences.value.filters.customExclusions[0].pattern).toBe('*.lock')
    })

    it('toggleExclusion() toggles enabled state', async () => {
      const { usePreferences } = await import('../composables/usePreferences')
      const { preferences, setCurrentAnalysis, addExclusion, toggleExclusion } = usePreferences()
      setCurrentAnalysis('test-analysis')

      addExclusion('*.json')
      expect(preferences.value.filters.customExclusions[0].enabled).toBe(true)

      toggleExclusion('*.json')
      expect(preferences.value.filters.customExclusions[0].enabled).toBe(false)

      toggleExclusion('*.json')
      expect(preferences.value.filters.customExclusions[0].enabled).toBe(true)
    })

    it('stores exclusion as {pattern, enabled, createdAt}', async () => {
      const { usePreferences } = await import('../composables/usePreferences')
      const { preferences, setCurrentAnalysis, addExclusion } = usePreferences()
      setCurrentAnalysis('test-analysis')

      addExclusion('test-pattern')
      const exclusion = preferences.value.filters.customExclusions[0]

      expect(exclusion).toHaveProperty('pattern', 'test-pattern')
      expect(exclusion).toHaveProperty('enabled', true)
      expect(exclusion).toHaveProperty('createdAt')
      expect(typeof exclusion.createdAt).toBe('string')
    })

    it('new exclusions default to enabled: true', async () => {
      const { usePreferences } = await import('../composables/usePreferences')
      const { preferences, setCurrentAnalysis, addExclusion } = usePreferences()
      setCurrentAnalysis('test-analysis')

      addExclusion('new-pattern')

      expect(preferences.value.filters.customExclusions[0].enabled).toBe(true)
    })

    it('persists customExclusions to localStorage', async () => {
      const { usePreferences } = await import('../composables/usePreferences')
      const { setCurrentAnalysis, addExclusion } = usePreferences()
      setCurrentAnalysis('persist-analysis')

      addExclusion('persist-test')
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'ainalyzer-persist-analysis',
        expect.stringContaining('persist-test')
      )
    })

    it('preserves existing exclusions when adding new', async () => {
      const stored = {
        version: '1.0',
        filters: {
          customExclusions: [
            { pattern: 'existing', enabled: true, createdAt: '2025-01-01' }
          ]
        }
      }
      localStorage.setItem('ainalyzer-my-analysis', JSON.stringify(stored))

      const { usePreferences } = await import('../composables/usePreferences')
      const { preferences, setCurrentAnalysis, addExclusion } = usePreferences()
      setCurrentAnalysis('my-analysis')

      addExclusion('new-pattern')

      expect(preferences.value.filters.customExclusions).toHaveLength(2)
      expect(preferences.value.filters.customExclusions[0].pattern).toBe('existing')
      expect(preferences.value.filters.customExclusions[1].pattern).toBe('new-pattern')
    })

    it('resets customExclusions to empty array', async () => {
      const { usePreferences } = await import('../composables/usePreferences')
      const { preferences, setCurrentAnalysis, addExclusion, resetPreferences } = usePreferences()
      setCurrentAnalysis('test-analysis')

      addExclusion('some-pattern')
      resetPreferences()

      expect(preferences.value.filters.customExclusions).toEqual([])
    })
  })

  describe('per-analysis isolation', () => {
    it('different analyses have separate preferences', async () => {
      const stored1 = {
        version: '1.0',
        appearance: { colorMode: 'filetype' }
      }
      const stored2 = {
        version: '1.0',
        appearance: { colorMode: 'depth' }
      }
      localStorage.setItem('ainalyzer-analysis-1', JSON.stringify(stored1))
      localStorage.setItem('ainalyzer-analysis-2', JSON.stringify(stored2))

      const { usePreferences } = await import('../composables/usePreferences')
      const { preferences, setCurrentAnalysis } = usePreferences()

      setCurrentAnalysis('analysis-1')
      expect(preferences.value.appearance.colorMode).toBe('filetype')

      setCurrentAnalysis('analysis-2')
      expect(preferences.value.appearance.colorMode).toBe('depth')
    })

    it('exclusions do not leak between analyses', async () => {
      const stored1 = {
        version: '1.0',
        filters: {
          customExclusions: [{ pattern: '*.lock', enabled: true, createdAt: '2025-01-01' }]
        }
      }
      localStorage.setItem('ainalyzer-analysis-1', JSON.stringify(stored1))

      const { usePreferences } = await import('../composables/usePreferences')
      const { preferences, setCurrentAnalysis } = usePreferences()

      setCurrentAnalysis('analysis-1')
      expect(preferences.value.filters.customExclusions).toHaveLength(1)

      setCurrentAnalysis('analysis-2')
      expect(preferences.value.filters.customExclusions).toHaveLength(0)
    })
  })
})
