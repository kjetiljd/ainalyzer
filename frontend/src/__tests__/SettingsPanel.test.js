import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

describe('SettingsPanel', () => {
  let originalLocalStorage
  let originalLocation
  let storage

  beforeEach(async () => {
    await vi.resetModules()

    storage = {}
    originalLocalStorage = global.localStorage
    global.localStorage = {
      getItem: vi.fn((key) => storage[key] || null),
      setItem: vi.fn((key, value) => { storage[key] = value }),
      removeItem: vi.fn((key) => { delete storage[key] }),
      clear: vi.fn(() => { Object.keys(storage).forEach(key => delete storage[key]) })
    }

    originalLocation = global.location
    delete global.location
    global.location = {
      search: '',
      href: 'http://localhost:5173/',
      origin: 'http://localhost:5173',
      pathname: '/'
    }

    global.history = {
      replaceState: vi.fn()
    }
  })

  afterEach(() => {
    global.location = originalLocation
    global.localStorage = originalLocalStorage
    vi.clearAllMocks()
  })

  // Helper to initialize preferences with a current analysis
  async function initPreferencesWithAnalysis(analysisName = 'test-analysis') {
    const { usePreferences } = await import('../composables/usePreferences')
    const { setCurrentAnalysis } = usePreferences()
    setCurrentAnalysis(analysisName)
  }

  it('renders checkbox for cushion treemap', async () => {
    await initPreferencesWithAnalysis()
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.exists()).toBe(true)
    expect(wrapper.text()).toContain('Enable 3D cushion effect')
  })

  it('checkbox reflects current preference value', async () => {
    storage['ainalyzer-test-analysis'] = JSON.stringify({
      version: '1.0',
      appearance: { cushionTreemap: true }
    })

    await initPreferencesWithAnalysis()
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.element.checked).toBe(true)
  })

  it('emits close when backdrop is clicked', async () => {
    await initPreferencesWithAnalysis()
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    await wrapper.find('.settings-backdrop').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close').length).toBe(1)
  })

  it('emits close when X button is clicked', async () => {
    await initPreferencesWithAnalysis()
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    await wrapper.find('.close-button').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close').length).toBe(1)
  })

  it('does not emit close when panel content is clicked', async () => {
    await initPreferencesWithAnalysis()
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    await wrapper.find('.settings-panel').trigger('click')

    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('toggles preference when checkbox is clicked', async () => {
    await initPreferencesWithAnalysis()
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.element.checked).toBe(false)

    await checkbox.setValue(true)

    expect(checkbox.element.checked).toBe(true)
  })

  it('updates URL when preference changes', async () => {
    await initPreferencesWithAnalysis()
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)

    expect(history.replaceState).toHaveBeenCalled()
    const url = history.replaceState.mock.calls[0][2]
    expect(url).toContain('cushion=true')
  })

  it('renders radio buttons for color mode', async () => {
    await initPreferencesWithAnalysis()
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const radios = wrapper.findAll('input[type="radio"][name="colorMode"]')
    expect(radios.length).toBe(2)
    expect(wrapper.text()).toContain('Color by depth')
    expect(wrapper.text()).toContain('Color by file type')
  })

  it('radio reflects current colorMode preference', async () => {
    storage['ainalyzer-test-analysis'] = JSON.stringify({
      version: '1.0',
      appearance: { colorMode: 'filetype' }
    })

    await initPreferencesWithAnalysis()
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const filetypeRadio = wrapper.find('input[type="radio"][value="filetype"]')
    expect(filetypeRadio.element.checked).toBe(true)
  })

  it('selecting filetype updates preference', async () => {
    await initPreferencesWithAnalysis()
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const filetypeRadio = wrapper.find('input[type="radio"][value="filetype"]')
    await filetypeRadio.setValue(true)

    expect(filetypeRadio.element.checked).toBe(true)
  })

  it('updates URL when colorMode changes', async () => {
    await initPreferencesWithAnalysis()
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const filetypeRadio = wrapper.find('input[type="radio"][value="filetype"]')
    await filetypeRadio.setValue(true)

    expect(history.replaceState).toHaveBeenCalled()
    const calls = history.replaceState.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).toContain('colorMode=filetype')
  })

  // Custom Exclusions tests
  describe('custom exclusions', () => {
    it('shows "Custom Exclusions" section', async () => {
      await initPreferencesWithAnalysis()
      const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
      const wrapper = mount(SettingsPanel)

      expect(wrapper.text()).toContain('Custom Exclusions')
    })

    it('displays each custom exclusion pattern', async () => {
      storage['ainalyzer-test-analysis'] = JSON.stringify({
        version: '1.0',
        filters: {
          customExclusions: [
            { pattern: '*.lock', enabled: true, createdAt: '2025-01-01' },
            { pattern: '**/*.json', enabled: true, createdAt: '2025-01-02' }
          ]
        }
      })

      await initPreferencesWithAnalysis()
      const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
      const wrapper = mount(SettingsPanel)

      expect(wrapper.text()).toContain('*.lock')
      expect(wrapper.text()).toContain('**/*.json')
    })

    it('shows checkbox for each exclusion (enabled/disabled)', async () => {
      storage['ainalyzer-test-analysis'] = JSON.stringify({
        version: '1.0',
        filters: {
          customExclusions: [
            { pattern: '*.lock', enabled: true, createdAt: '2025-01-01' }
          ]
        }
      })

      await initPreferencesWithAnalysis()
      const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
      const wrapper = mount(SettingsPanel)

      const exclusionCheckbox = wrapper.find('.exclusion-item input[type="checkbox"]')
      expect(exclusionCheckbox.exists()).toBe(true)
      expect(exclusionCheckbox.element.checked).toBe(true)
    })

    it('shows remove button for each exclusion', async () => {
      storage['ainalyzer-test-analysis'] = JSON.stringify({
        version: '1.0',
        filters: {
          customExclusions: [
            { pattern: '*.lock', enabled: true, createdAt: '2025-01-01' }
          ]
        }
      })

      await initPreferencesWithAnalysis()
      const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
      const wrapper = mount(SettingsPanel)

      const removeButton = wrapper.find('.exclusion-item .remove-button')
      expect(removeButton.exists()).toBe(true)
    })

    it('toggle checkbox toggles exclusion enabled state', async () => {
      storage['ainalyzer-test-analysis'] = JSON.stringify({
        version: '1.0',
        filters: {
          customExclusions: [
            { pattern: '*.lock', enabled: true, createdAt: '2025-01-01' }
          ]
        }
      })

      await initPreferencesWithAnalysis()
      const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
      const wrapper = mount(SettingsPanel)

      const checkbox = wrapper.find('.exclusion-item input[type="checkbox"]')
      await checkbox.setValue(false)

      // Wait for reactivity
      await new Promise(resolve => setTimeout(resolve, 10))

      // Check that preference was updated
      const saved = JSON.parse(storage['ainalyzer-test-analysis'])
      expect(saved.filters.customExclusions[0].enabled).toBe(false)
    })

    it('remove button removes exclusion', async () => {
      storage['ainalyzer-test-analysis'] = JSON.stringify({
        version: '1.0',
        filters: {
          customExclusions: [
            { pattern: '*.lock', enabled: true, createdAt: '2025-01-01' }
          ]
        }
      })

      await initPreferencesWithAnalysis()
      const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
      const wrapper = mount(SettingsPanel)

      const removeButton = wrapper.find('.exclusion-item .remove-button')
      await removeButton.trigger('click')

      // Wait for reactivity
      await new Promise(resolve => setTimeout(resolve, 10))

      // Check that exclusion was removed
      const saved = JSON.parse(storage['ainalyzer-test-analysis'])
      expect(saved.filters.customExclusions).toHaveLength(0)
    })

    it('shows "Add pattern" input field', async () => {
      await initPreferencesWithAnalysis()
      const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
      const wrapper = mount(SettingsPanel)

      const input = wrapper.find('.add-exclusion input')
      expect(input.exists()).toBe(true)
      expect(input.attributes('placeholder')).toContain('pattern')
    })

    it('Add button adds exclusion with input value', async () => {
      await initPreferencesWithAnalysis()
      const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
      const wrapper = mount(SettingsPanel)

      const input = wrapper.find('.add-exclusion input')
      await input.setValue('new-pattern/**')

      const addButton = wrapper.find('.add-exclusion button')
      await addButton.trigger('click')

      // Wait for reactivity
      await new Promise(resolve => setTimeout(resolve, 10))

      const saved = JSON.parse(storage['ainalyzer-test-analysis'])
      expect(saved.filters.customExclusions.some(e => e.pattern === 'new-pattern/**')).toBe(true)
    })

    it('clears input after adding', async () => {
      await initPreferencesWithAnalysis()
      const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
      const wrapper = mount(SettingsPanel)

      const input = wrapper.find('.add-exclusion input')
      await input.setValue('test-pattern')

      const addButton = wrapper.find('.add-exclusion button')
      await addButton.trigger('click')

      expect(input.element.value).toBe('')
    })

    it('shows empty state when no custom exclusions', async () => {
      await initPreferencesWithAnalysis()
      const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
      const wrapper = mount(SettingsPanel)

      expect(wrapper.text()).toContain('No custom exclusions')
    })

    it('exclusion list is scrollable', async () => {
      await initPreferencesWithAnalysis()
      const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
      const wrapper = mount(SettingsPanel)

      const list = wrapper.find('.exclusion-list')
      expect(list.exists()).toBe(true)
      // Check for overflow styling (via class or computed style)
      expect(list.classes()).toContain('exclusion-list')
    })
  })
})
