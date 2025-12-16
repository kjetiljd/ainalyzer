import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

describe('App Integration', () => {
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
                  name: 'backend-api',
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

  it('renders all main components', async () => {
    const { default: App } = await import('../App.vue')
    const { default: Treemap } = await import('../components/Treemap.vue')
    const { default: Breadcrumb } = await import('../components/Breadcrumb.vue')
    const { default: Statusline } = await import('../components/Statusline.vue')
    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.findComponent(Treemap).exists()).toBe(true)
    expect(wrapper.findComponent(Breadcrumb).exists()).toBe(true)
    expect(wrapper.findComponent(Statusline).exists()).toBe(true)
  })

  it('updates breadcrumb path with full hierarchy when drilling down', async () => {
    const { default: App } = await import('../App.vue')
    const { default: Treemap } = await import('../components/Treemap.vue')
    const { default: Breadcrumb } = await import('../components/Breadcrumb.vue')
    const wrapper = mount(App)
    await flushPromises()

    const treemap = wrapper.findComponent(Treemap)

    // Emit drill-down event with new format (node + path)
    const rootNode = { name: 'ainalyzer-demo', children: [] }
    const backendNode = { name: 'backend-api', children: [] }
    await treemap.vm.$emit('drill-down', {
      node: backendNode,
      path: [rootNode, backendNode]
    })

    const breadcrumb = wrapper.findComponent(Breadcrumb)
    const path = breadcrumb.props('path')

    // Should have both root and backend-api
    expect(path).toEqual(['ainalyzer-demo', 'backend-api'])
  })

  it('navigates back when clicking breadcrumb segment', async () => {
    const { default: App } = await import('../App.vue')
    const { default: Treemap } = await import('../components/Treemap.vue')
    const { default: Breadcrumb } = await import('../components/Breadcrumb.vue')
    const wrapper = mount(App)
    await flushPromises()

    // Simulate being drilled down with full paths
    const treemap = wrapper.findComponent(Treemap)
    const rootNode = { name: 'ainalyzer-demo', children: [] }
    const backendNode = { name: 'backend-api', children: [] }
    const srcNode = { name: 'src', children: [] }

    await treemap.vm.$emit('drill-down', {
      node: backendNode,
      path: [rootNode, backendNode]
    })
    await treemap.vm.$emit('drill-down', {
      node: srcNode,
      path: [rootNode, backendNode, srcNode]
    })

    // Click first breadcrumb segment (root)
    const breadcrumb = wrapper.findComponent(Breadcrumb)
    await breadcrumb.vm.$emit('navigate', 0)

    // Should be back at root
    const path = breadcrumb.props('path')
    expect(path.length).toBe(1)
  })

  it('updates statusline when hovering over treemap nodes', async () => {
    const { default: App } = await import('../App.vue')
    const { default: Treemap } = await import('../components/Treemap.vue')
    const { default: Statusline } = await import('../components/Statusline.vue')
    const wrapper = mount(App)
    await flushPromises()

    const treemap = wrapper.findComponent(Treemap)
    const statusline = wrapper.findComponent(Statusline)

    // Initially should have default text
    expect(statusline.props('text')).toBe('')

    // Emit hover event with path
    await treemap.vm.$emit('hover', { text: 'ainalyzer-demo / backend-api / src / auth.py (1234 lines)', isRepo: false })

    // Statusline should update
    expect(statusline.props('text')).toBe('ainalyzer-demo / backend-api / src / auth.py (1234 lines)')

    // Emit hover-end event
    await treemap.vm.$emit('hover-end')

    // Statusline should clear
    expect(statusline.props('text')).toBe('')
  })
})
