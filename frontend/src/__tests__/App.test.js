import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import App from '../App.vue'
import Treemap from '../components/Treemap.vue'

describe('App', () => {
  let originalLocalStorage
  let originalLocation

  beforeEach(async () => {
    // Reset module state for usePreferences
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

    // Mock fetch API
    global.fetch = vi.fn((url) => {
      if (url === '/api/analyses/') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            analyses: [
              {
                filename: 'test-analysis.json',
                name: 'test-analysis',
                stats: { total_files: 100, total_lines: 5000 }
              }
            ]
          })
        })
      }
      if (url === '/api/analyses/test-analysis.json') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            analysis_set: 'test-analysis',
            generated_at: '2024-01-01T00:00:00Z',
            stats: { total_files: 100, total_lines: 5000 },
            tree: {
              name: 'ainalyzer-demo',
              children: [
                {
                  name: 'backend',
                  children: [
                    { name: 'api.py', value: 500 }
                  ]
                }
              ]
            }
          })
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  afterEach(() => {
    global.location = originalLocation
    global.localStorage = originalLocalStorage
    vi.clearAllMocks()
  })

  it('renders Treemap component', async () => {
    // Re-import App after mocks are set up
    const { default: App } = await import('../App.vue')
    const { default: Treemap } = await import('../components/Treemap.vue')
    const wrapper = mount(App)
    await flushPromises()

    const treemap = wrapper.findComponent(Treemap)
    expect(treemap.exists()).toBe(true)
  })

  it('passes mock data to Treemap', async () => {
    // Re-import App after mocks are set up
    const { default: App } = await import('../App.vue')
    const { default: Treemap } = await import('../components/Treemap.vue')
    const wrapper = mount(App)
    await flushPromises()

    const treemap = wrapper.findComponent(Treemap)
    expect(treemap.props('data')).toBeDefined()
    expect(treemap.props('data').name).toBe('ainalyzer-demo')
  })
})
