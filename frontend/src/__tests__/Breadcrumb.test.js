import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Breadcrumb from '../components/Breadcrumb.vue'

describe('Breadcrumb', () => {
  it('renders without crashing', () => {
    const wrapper = mount(Breadcrumb, {
      props: { path: ['root'] }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('displays all path segments', () => {
    const wrapper = mount(Breadcrumb, {
      props: { path: ['ainalyzer-demo', 'backend-api', 'src'] }
    })

    expect(wrapper.text()).toContain('ainalyzer-demo')
    expect(wrapper.text()).toContain('backend-api')
    expect(wrapper.text()).toContain('src')
  })

  it('emits navigate event when clicking segment', async () => {
    const wrapper = mount(Breadcrumb, {
      props: { path: ['ainalyzer-demo', 'backend-api', 'src'] }
    })

    const segments = wrapper.findAll('.breadcrumb-segment')
    await segments[1].trigger('click')

    expect(wrapper.emitted()).toHaveProperty('navigate')
    expect(wrapper.emitted('navigate')[0]).toEqual([1])
  })

  it('separates segments with slash', () => {
    const wrapper = mount(Breadcrumb, {
      props: { path: ['ainalyzer-demo', 'backend-api'] }
    })

    expect(wrapper.html()).toContain('/')
  })
})
