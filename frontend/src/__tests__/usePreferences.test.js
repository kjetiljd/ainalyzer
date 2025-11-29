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
    const { preferences } = usePreferences()

    expect(preferences.value).toEqual({
      version: '1.0',
      lastSelectedAnalysis: null,
      appearance: {
        cushionTreemap: false,
        hideFolderBorders: true,
        colorMode: 'depth'
      },
      filters: {
        hideClocignore: true
      }
    })
  })

  it('loads lastSelectedAnalysis from localStorage', async () => {
    const stored = {
      version: '1.0',
      lastSelectedAnalysis: 'my-project'
    }
    localStorage.setItem('ainalyzer-preferences', JSON.stringify(stored))

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    expect(preferences.value.lastSelectedAnalysis).toBe('my-project')
  })

  it('overrides localStorage with URL param', async () => {
    const stored = {
      version: '1.0',
      lastSelectedAnalysis: 'old-project'
    }
    localStorage.setItem('ainalyzer-preferences', JSON.stringify(stored))
    global.location.search = '?analysis=new-project'

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    expect(preferences.value.lastSelectedAnalysis).toBe('new-project')
  })

  it('persists changes to localStorage', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    // Need to wait for watch to trigger
    preferences.value.lastSelectedAnalysis = 'test-project'
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ainalyzer-preferences',
      expect.stringContaining('test-project')
    )
  })

  it('resets preferences to defaults', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, resetPreferences } = usePreferences()
    preferences.value.lastSelectedAnalysis = 'some-project'

    resetPreferences()

    expect(preferences.value.lastSelectedAnalysis).toBe(null)
  })

  it('updates URL with current preferences', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, updateURL } = usePreferences()
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
    const { preferences, shareCurrentView } = usePreferences()
    preferences.value.lastSelectedAnalysis = 'shared-project'

    const url = await shareCurrentView()

    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    expect(url).toContain('analysis=shared-project')
  })

  it('exports preferences as JSON', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, exportPreferences } = usePreferences()
    preferences.value.lastSelectedAnalysis = 'export-test'

    const exported = exportPreferences()
    const parsed = JSON.parse(exported)

    expect(parsed.lastSelectedAnalysis).toBe('export-test')
  })

  it('imports preferences from JSON', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, importPreferences } = usePreferences()
    const json = JSON.stringify({
      version: '1.0',
      lastSelectedAnalysis: 'imported-project'
    })

    importPreferences(json)

    expect(preferences.value.lastSelectedAnalysis).toBe('imported-project')
  })

  it('throws error on invalid JSON import', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { importPreferences } = usePreferences()

    expect(() => {
      importPreferences('invalid json')
    }).toThrow('Invalid preferences JSON')
  })

  it('handles corrupted localStorage gracefully', async () => {
    localStorage.setItem('ainalyzer-preferences', 'corrupted json{')

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    expect(preferences.value).toEqual({
      version: '1.0',
      lastSelectedAnalysis: null,
      appearance: {
        cushionTreemap: false,
        hideFolderBorders: true,
        colorMode: 'depth'
      },
      filters: {
        hideClocignore: true
      }
    })
  })

  it('only includes non-default values in URL', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, updateURL } = usePreferences()
    preferences.value.lastSelectedAnalysis = null  // Same as default

    updateURL()

    const url = history.replaceState.mock.calls[0][2]
    expect(url).toBe('http://localhost:5173/')
  })

  it('loads cushionTreemap from localStorage', async () => {
    const stored = {
      version: '1.0',
      lastSelectedAnalysis: null,
      appearance: { cushionTreemap: true }
    }
    localStorage.setItem('ainalyzer-preferences', JSON.stringify(stored))

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    expect(preferences.value.appearance.cushionTreemap).toBe(true)
  })

  it('overrides cushionTreemap with URL param', async () => {
    const stored = {
      version: '1.0',
      lastSelectedAnalysis: null,
      appearance: { cushionTreemap: false }
    }
    localStorage.setItem('ainalyzer-preferences', JSON.stringify(stored))
    global.location.search = '?cushion=true'

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    expect(preferences.value.appearance.cushionTreemap).toBe(true)
  })

  it('includes cushion in URL when enabled', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, updateURL } = usePreferences()
    preferences.value.appearance.cushionTreemap = true

    updateURL()

    const url = history.replaceState.mock.calls[0][2]
    expect(url).toContain('cushion=true')
  })

  it('preserves appearance defaults when loading partial preferences', async () => {
    const stored = {
      version: '1.0',
      lastSelectedAnalysis: 'my-project'
      // No appearance object
    }
    localStorage.setItem('ainalyzer-preferences', JSON.stringify(stored))

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    expect(preferences.value.appearance.cushionTreemap).toBe(false)
    expect(preferences.value.appearance.hideFolderBorders).toBe(true)
  })

  it('resets appearance preferences to defaults', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, resetPreferences } = usePreferences()
    preferences.value.appearance.cushionTreemap = true
    preferences.value.appearance.hideFolderBorders = false

    resetPreferences()

    expect(preferences.value.appearance.cushionTreemap).toBe(false)
    expect(preferences.value.appearance.hideFolderBorders).toBe(true)
  })

  it('loads hideFolderBorders from localStorage', async () => {
    const stored = {
      version: '1.0',
      lastSelectedAnalysis: null,
      appearance: { cushionTreemap: true, hideFolderBorders: false }
    }
    localStorage.setItem('ainalyzer-preferences', JSON.stringify(stored))

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    expect(preferences.value.appearance.hideFolderBorders).toBe(false)
  })

  it('default colorMode is depth', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    expect(preferences.value.appearance.colorMode).toBe('depth')
  })

  it('loads colorMode from localStorage', async () => {
    const stored = {
      version: '1.0',
      lastSelectedAnalysis: null,
      appearance: { colorMode: 'filetype' }
    }
    localStorage.setItem('ainalyzer-preferences', JSON.stringify(stored))

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    expect(preferences.value.appearance.colorMode).toBe('filetype')
  })

  it('overrides colorMode with URL param', async () => {
    const stored = {
      version: '1.0',
      lastSelectedAnalysis: null,
      appearance: { colorMode: 'depth' }
    }
    localStorage.setItem('ainalyzer-preferences', JSON.stringify(stored))
    global.location.search = '?colorMode=filetype'

    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences } = usePreferences()

    expect(preferences.value.appearance.colorMode).toBe('filetype')
  })

  it('includes colorMode in URL when not default', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, updateURL } = usePreferences()
    preferences.value.appearance.colorMode = 'filetype'

    updateURL()

    const url = history.replaceState.mock.calls[0][2]
    expect(url).toContain('colorMode=filetype')
  })

  it('resets colorMode to default', async () => {
    const { usePreferences } = await import('../composables/usePreferences')
    const { preferences, resetPreferences } = usePreferences()
    preferences.value.appearance.colorMode = 'filetype'

    resetPreferences()

    expect(preferences.value.appearance.colorMode).toBe('depth')
  })
})
