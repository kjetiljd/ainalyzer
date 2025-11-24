import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import App from '../App.vue'
import Treemap from '../components/Treemap.vue'

describe('App', () => {
  beforeEach(() => {
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

  it('renders Treemap component', async () => {
    const wrapper = mount(App)
    await flushPromises()

    const treemap = wrapper.findComponent(Treemap)
    expect(treemap.exists()).toBe(true)
  })

  it('passes mock data to Treemap', async () => {
    const wrapper = mount(App)
    await flushPromises()

    const treemap = wrapper.findComponent(Treemap)
    expect(treemap.props('data')).toBeDefined()
    expect(treemap.props('data').name).toBe('ainalyzer-demo')
  })
})
