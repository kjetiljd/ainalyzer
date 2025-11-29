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

  it('renders checkbox for cushion treemap', async () => {
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.exists()).toBe(true)
    expect(wrapper.text()).toContain('Enable 3D cushion effect')
  })

  it('checkbox reflects current preference value', async () => {
    storage['ainalyzer-preferences'] = JSON.stringify({
      version: '1.0',
      lastSelectedAnalysis: null,
      appearance: { cushionTreemap: true }
    })

    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.element.checked).toBe(true)
  })

  it('emits close when backdrop is clicked', async () => {
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    await wrapper.find('.settings-backdrop').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close').length).toBe(1)
  })

  it('emits close when X button is clicked', async () => {
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    await wrapper.find('.close-button').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close').length).toBe(1)
  })

  it('does not emit close when panel content is clicked', async () => {
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    await wrapper.find('.settings-panel').trigger('click')

    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('toggles preference when checkbox is clicked', async () => {
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.element.checked).toBe(false)

    await checkbox.setValue(true)

    expect(checkbox.element.checked).toBe(true)
  })

  it('updates URL when preference changes', async () => {
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)

    expect(history.replaceState).toHaveBeenCalled()
    const url = history.replaceState.mock.calls[0][2]
    expect(url).toContain('cushion=true')
  })

  it('renders radio buttons for color mode', async () => {
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const radios = wrapper.findAll('input[type="radio"][name="colorMode"]')
    expect(radios.length).toBe(2)
    expect(wrapper.text()).toContain('Color by depth')
    expect(wrapper.text()).toContain('Color by file type')
  })

  it('radio reflects current colorMode preference', async () => {
    storage['ainalyzer-preferences'] = JSON.stringify({
      version: '1.0',
      lastSelectedAnalysis: null,
      appearance: { colorMode: 'filetype' }
    })

    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const filetypeRadio = wrapper.find('input[type="radio"][value="filetype"]')
    expect(filetypeRadio.element.checked).toBe(true)
  })

  it('selecting filetype updates preference', async () => {
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const filetypeRadio = wrapper.find('input[type="radio"][value="filetype"]')
    await filetypeRadio.setValue(true)

    expect(filetypeRadio.element.checked).toBe(true)
  })

  it('updates URL when colorMode changes', async () => {
    const { default: SettingsPanel } = await import('../components/SettingsPanel.vue')
    const wrapper = mount(SettingsPanel)

    const filetypeRadio = wrapper.find('input[type="radio"][value="filetype"]')
    await filetypeRadio.setValue(true)

    expect(history.replaceState).toHaveBeenCalled()
    const calls = history.replaceState.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).toContain('colorMode=filetype')
  })
})
