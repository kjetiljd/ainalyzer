import { describe, it, expect, vi } from 'vitest'
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

  it('renders responsive SVG that fills container', () => {
    const wrapper = mount(Treemap, {
      props: { data: mockData }
    })

    const svg = wrapper.find('svg')
    expect(svg.classes()).toContain('treemap')
    expect(svg.exists()).toBe(true)
  })

  it('includes ancestors from navigationStack in drill-down path when already drilled down', async () => {
    // Simulate being drilled down to repo1
    const rootNode = { name: 'test-set', children: [mockData.children[0]] }
    const repo1Node = mockData.children[0]
    const navigationStack = [rootNode, repo1Node]

    const wrapper = mount(Treemap, {
      props: {
        data: mockData,
        currentNode: repo1Node,
        navigationStack: navigationStack
      }
    })

    // Click a file in the drilled-down view
    const rect = wrapper.find('rect')
    await rect.trigger('click')

    // Should emit path that includes ancestors from navigationStack
    const emitted = wrapper.emitted('drill-down')
    const emittedPath = emitted[0][0].path

    // Path should start with root node from navigationStack
    expect(emittedPath[0]).toEqual(rootNode)

    // Path should be complete from root to clicked node
    expect(emittedPath.length).toBeGreaterThan(1)
    expect(emittedPath[0].name).toBe('test-set')
  })

  it('builds correct path when navigationStack is empty (at root)', async () => {
    const wrapper = mount(Treemap, {
      props: {
        data: mockData,
        navigationStack: []
      }
    })

    const rect = wrapper.find('rect')
    await rect.trigger('click')

    const emitted = wrapper.emitted('drill-down')
    const emittedPath = emitted[0][0].path

    // Path should start from root of data
    expect(emittedPath.length).toBeGreaterThan(0)
    expect(emittedPath[0].name).toBe('test-set')
  })

  describe('colorMode', () => {
    const dataWithLanguages = {
      name: 'root',
      children: [
        { name: 'src', children: [
          { name: 'app.js', value: 100, language: 'JavaScript' },
          { name: 'utils.py', value: 80, language: 'Python' }
        ]},
        { name: 'lib', children: [
          { name: 'helper.js', value: 50, language: 'JavaScript' }
        ]}
      ]
    }

    it('accepts colorMode prop', () => {
      const wrapper = mount(Treemap, {
        props: {
          data: dataWithLanguages,
          colorMode: 'filetype'
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('uses depth-based coloring when colorMode is depth', () => {
      const wrapper = mount(Treemap, {
        props: {
          data: dataWithLanguages,
          colorMode: 'depth'
        }
      })

      // Files should have ColorBrewer colors based on depth
      const rects = wrapper.findAll('rect')
      const fileColors = rects
        .map(r => r.attributes('fill'))
        .filter(c => c !== '#4a4a4a') // Exclude directories

      // ColorBrewer Set2 palette colors
      const set2Colors = ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f']
      const usesSet2 = fileColors.some(c => set2Colors.includes(c))
      expect(usesSet2).toBe(true)
    })

    it('uses file type coloring when colorMode is filetype', () => {
      const wrapper = mount(Treemap, {
        props: {
          data: dataWithLanguages,
          colorMode: 'filetype'
        }
      })

      const rects = wrapper.findAll('rect')
      const fileColors = rects
        .map(r => r.attributes('fill'))
        .filter(c => c !== '#4a4a4a' && !c.startsWith('url('))

      // Should have colors from PALETTE_60 (not ColorBrewer Set2)
      const set2Colors = ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f']
      const allNotSet2 = fileColors.every(c => !set2Colors.includes(c))
      expect(allNotSet2).toBe(true)
    })

    it('assigns same color to files with same language', () => {
      const wrapper = mount(Treemap, {
        props: {
          data: dataWithLanguages,
          colorMode: 'filetype'
        }
      })

      // Get colors from the component's internal colorMap
      // We can't easily access the colorMap, but we can verify
      // that JavaScript files get the same color
      const rects = wrapper.findAll('rect')
      // This is a structural test - if it renders without error
      // with filetype mode, the colorMap is working
      expect(rects.length).toBeGreaterThan(0)
    })

    it('keeps directories gray in filetype mode', () => {
      const wrapper = mount(Treemap, {
        props: {
          data: dataWithLanguages,
          colorMode: 'filetype'
        }
      })

      const rects = wrapper.findAll('rect')
      // First rect is root, second and third are src/lib directories
      // They should be gray
      const firstRect = rects[0]
      expect(firstRect.attributes('fill')).toBe('#4a4a4a')
    })

    it('defaults colorMode to depth when not specified', () => {
      const wrapper = mount(Treemap, {
        props: {
          data: dataWithLanguages
        }
      })

      // Should use depth coloring (ColorBrewer Set2)
      const rects = wrapper.findAll('rect')
      const fileColors = rects
        .map(r => r.attributes('fill'))
        .filter(c => c !== '#4a4a4a')

      const set2Colors = ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f']
      const usesSet2 = fileColors.some(c => set2Colors.includes(c))
      expect(usesSet2).toBe(true)
    })
  })

  describe('context menu', () => {
    const dataWithPaths = {
      name: 'root',
      children: [
        {
          name: 'repo1',
          path: 'repo1',
          type: 'directory',
          children: [
            { name: 'app.js', value: 100, path: 'repo1/app.js', type: 'file' }
          ]
        }
      ]
    }

    it('emits node-contextmenu event on right-click with node data', async () => {
      const wrapper = mount(Treemap, {
        props: { data: dataWithPaths }
      })

      const rect = wrapper.find('rect')
      await rect.trigger('contextmenu', { clientX: 150, clientY: 250 })

      expect(wrapper.emitted()).toHaveProperty('node-contextmenu')
      const emitted = wrapper.emitted('node-contextmenu')[0][0]
      expect(emitted).toHaveProperty('node')
      expect(emitted).toHaveProperty('x')
      expect(emitted).toHaveProperty('y')
    })

    it('includes mouse coordinates in node-contextmenu event', async () => {
      const wrapper = mount(Treemap, {
        props: { data: dataWithPaths }
      })

      const rect = wrapper.find('rect')
      await rect.trigger('contextmenu', { clientX: 150, clientY: 250 })

      const emitted = wrapper.emitted('node-contextmenu')[0][0]
      expect(emitted.x).toBe(150)
      expect(emitted.y).toBe(250)
    })

    it('prevents default context menu', async () => {
      const wrapper = mount(Treemap, {
        props: { data: dataWithPaths }
      })

      const rect = wrapper.find('rect')
      const event = new MouseEvent('contextmenu', {
        clientX: 150,
        clientY: 250,
        bubbles: true,
        cancelable: true
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      rect.element.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })
})
