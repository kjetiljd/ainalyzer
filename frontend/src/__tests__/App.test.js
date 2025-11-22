import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import Treemap from '../components/Treemap.vue'

describe('App', () => {
  it('renders Treemap component', () => {
    const wrapper = mount(App)

    const treemap = wrapper.findComponent(Treemap)
    expect(treemap.exists()).toBe(true)
  })

  it('passes mock data to Treemap', () => {
    const wrapper = mount(App)

    const treemap = wrapper.findComponent(Treemap)
    expect(treemap.props('data')).toBeDefined()
    expect(treemap.props('data').name).toBe('ainalyzer-demo')
  })
})
