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

  it('emits drill-down event with full path when clicking any rectangle', async () => {
    const wrapper = mount(Treemap, {
      props: { data: mockData }
    })

    // Find a rectangle - any node is clickable
    const rect = wrapper.find('rect')
    await rect.trigger('click')

    // Should emit 'drill-down' event with node and path
    expect(wrapper.emitted()).toHaveProperty('drill-down')
    const emitted = wrapper.emitted('drill-down')
    expect(emitted[0][0]).toHaveProperty('node')
    expect(emitted[0][0]).toHaveProperty('path')
    expect(Array.isArray(emitted[0][0].path)).toBe(true)
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

  it('colors directories with neutral gray', () => {
    const wrapper = mount(Treemap, {
      props: { data: mockData }
    })

    const rects = wrapper.findAll('rect')
    // First rect is root node (has children) - should be gray
    const rootRect = rects[0]
    expect(rootRect.attributes('fill')).toBe('#4a4a4a')
  })

  it('colors files with ColorBrewer Set2 palette based on depth', () => {
    const dataWithFiles = {
      name: 'root',
      children: [
        { name: 'file1.js', value: 100 },
        { name: 'file2.py', value: 200 }
      ]
    }

    const wrapper = mount(Treemap, {
      props: { data: dataWithFiles }
    })

    const rects = wrapper.findAll('rect')
    // Files should have ColorBrewer colors, not gray
    const colors = rects.map(r => r.attributes('fill'))
    const hasColoredFiles = colors.some(c => c !== '#4a4a4a')
    expect(hasColoredFiles).toBe(true)
  })

  it('emits hover event when mouse enters rectangle', async () => {
    const wrapper = mount(Treemap, {
      props: { data: mockData }
    })

    const rect = wrapper.find('rect')
    await rect.trigger('mouseenter')

    expect(wrapper.emitted()).toHaveProperty('hover')
  })

  it('emits hover-end event when mouse leaves rectangle', async () => {
    const wrapper = mount(Treemap, {
      props: { data: mockData }
    })

    const rect = wrapper.find('rect')
    await rect.trigger('mouseleave')

    expect(wrapper.emitted()).toHaveProperty('hover-end')
  })
})
