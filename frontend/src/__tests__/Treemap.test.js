import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Treemap from '../components/Treemap.vue'

describe('Treemap', () => {
  const mockData = {
    name: 'test-set',
    children: [
      {
        name: 'repo1',
        children: [
          { name: 'file1.js', value: 100 },
          { name: 'file2.js', value: 200 }
        ]
      }
    ]
  }

  it('renders without crashing', () => {
    const wrapper = mount(Treemap, {
      props: { data: mockData }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('renders an SVG element', () => {
    const wrapper = mount(Treemap, {
      props: { data: mockData }
    })

    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
  })

  it('renders rectangles for leaf nodes', () => {
    const wrapper = mount(Treemap, {
      props: { data: mockData }
    })

    const rects = wrapper.findAll('rect')
    // Should have 2 rectangles for 2 files
    expect(rects.length).toBeGreaterThan(0)
  })

  it('emits drill-down event when clicking rectangle with children', async () => {
    const wrapper = mount(Treemap, {
      props: { data: mockData }
    })

    // Find a rectangle (should be the repo1 node which has children)
    const rect = wrapper.find('rect')
    await rect.trigger('click')

    // Should emit 'drill-down' event
    expect(wrapper.emitted()).toHaveProperty('drill-down')
  })

  it('re-renders when currentNode prop changes', async () => {
    const wrapper = mount(Treemap, {
      props: {
        data: mockData,
        currentNode: mockData
      }
    })

    const initialRectCount = wrapper.findAll('rect').length

    // Change to drill into repo1
    await wrapper.setProps({
      currentNode: mockData.children[0]
    })

    // Should re-render with different rectangles
    const newRectCount = wrapper.findAll('rect').length
    expect(newRectCount).not.toBe(initialRectCount)
  })
})
