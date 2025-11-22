import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import Treemap from '../components/Treemap.vue'
import Breadcrumb from '../components/Breadcrumb.vue'
import Statusline from '../components/Statusline.vue'

describe('App Integration', () => {
  it('renders all main components', () => {
    const wrapper = mount(App)

    expect(wrapper.findComponent(Treemap).exists()).toBe(true)
    expect(wrapper.findComponent(Breadcrumb).exists()).toBe(true)
    expect(wrapper.findComponent(Statusline).exists()).toBe(true)
  })

  it('updates breadcrumb path when drilling down', async () => {
    const wrapper = mount(App)

    const treemap = wrapper.findComponent(Treemap)

    // Emit drill-down event
    const drillData = { name: 'backend-api', children: [] }
    await treemap.vm.$emit('drill-down', drillData)

    const breadcrumb = wrapper.findComponent(Breadcrumb)
    const path = breadcrumb.props('path')

    expect(path).toContain('backend-api')
  })

  it('navigates back when clicking breadcrumb segment', async () => {
    const wrapper = mount(App)

    // Simulate being drilled down
    const treemap = wrapper.findComponent(Treemap)
    await treemap.vm.$emit('drill-down', { name: 'backend-api', children: [] })
    await treemap.vm.$emit('drill-down', { name: 'src', children: [] })

    // Click first breadcrumb segment (root)
    const breadcrumb = wrapper.findComponent(Breadcrumb)
    await breadcrumb.vm.$emit('navigate', 0)

    // Should be back at root
    const path = breadcrumb.props('path')
    expect(path.length).toBe(1)
  })

  it('updates statusline when hovering over treemap nodes', async () => {
    const wrapper = mount(App)

    const treemap = wrapper.findComponent(Treemap)
    const statusline = wrapper.findComponent(Statusline)

    // Initially should have default text
    expect(statusline.props('text')).toBe('')

    // Emit hover event with path
    await treemap.vm.$emit('hover', 'ainalyzer-demo / backend-api / src / auth.py (1234 lines)')

    // Statusline should update
    expect(statusline.props('text')).toBe('ainalyzer-demo / backend-api / src / auth.py (1234 lines)')

    // Emit hover-end event
    await treemap.vm.$emit('hover-end')

    // Statusline should clear
    expect(statusline.props('text')).toBe('')
  })
})
