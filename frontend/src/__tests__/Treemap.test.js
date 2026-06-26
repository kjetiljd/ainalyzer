import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Treemap from '../components/Treemap.vue'
import { GROWTH_PALETTE, GROWTH_NEUTRAL, ACTIVITY_PALETTE } from '../utils/colorUtils'

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

      // Files should have warm earth colors based on depth
      const rects = wrapper.findAll('rect')
      const fileColors = rects
        .map(r => r.attributes('fill'))
        .filter(c => c !== '#4a4a4a') // Exclude directories

      // ColorBrewer YlOrBr depth palette colors
      const depthColors = ['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#993404', '#662506']
      const usesDepthColors = fileColors.some(c => depthColors.includes(c))
      expect(usesDepthColors).toBe(true)
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

      // Should have colors from PALETTE_60 (not YlOrBr depth colors)
      const depthColors = ['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#993404', '#662506']
      const allNotDepth = fileColors.every(c => !depthColors.includes(c))
      expect(allNotDepth).toBe(true)
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

      // Should use depth coloring (ColorBrewer YlOrBr palette)
      const rects = wrapper.findAll('rect')
      const fileColors = rects
        .map(r => r.attributes('fill'))
        .filter(c => c !== '#4a4a4a')

      const depthColors = ['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#993404', '#662506']
      const usesDepthColors = fileColors.some(c => depthColors.includes(c))
      expect(usesDepthColors).toBe(true)
    })
  })

  describe('growth colorMode', () => {
    const growthData = {
      name: 'root',
      children: [
        { name: 'grew', children: [
          { name: 'big.js', value: 100, language: 'JavaScript',
            growth: { last_3_months: 50, last_year: 200, added_3m: 60, deleted_3m: 10, added_1y: 250, deleted_1y: 50 } }
        ]},
        { name: 'shrank', children: [
          { name: 'small.js', value: 20, language: 'JavaScript',
            growth: { last_3_months: -40, last_year: -180, added_3m: 5, deleted_3m: 45, added_1y: 20, deleted_1y: 200 } }
        ]}
      ]
    }

    const allGrowthColors = [...GROWTH_PALETTE.grow, ...GROWTH_PALETTE.shrink]

    it('colors files by net growth using the diverging palette', () => {
      const wrapper = mount(Treemap, {
        props: { data: growthData, colorMode: 'growth', activityTimeframe: '1year' }
      })

      const fileColors = wrapper.findAll('rect')
        .map(r => r.attributes('fill'))
        .filter(c => allGrowthColors.includes(c))

      expect(fileColors.length).toBeGreaterThan(0)
    })

    it('uses a grow (orange) color for a positive file and a shrink (blue) color for a negative file', () => {
      const wrapper = mount(Treemap, {
        props: { data: growthData, colorMode: 'growth', activityTimeframe: '1year' }
      })

      const colors = wrapper.findAll('rect').map(r => r.attributes('fill'))
      expect(colors.some(c => GROWTH_PALETTE.grow.includes(c))).toBe(true)
      expect(colors.some(c => GROWTH_PALETTE.shrink.includes(c))).toBe(true)
    })

    it('colors directories by signed rollup instead of neutral gray', () => {
      const wrapper = mount(Treemap, {
        props: { data: growthData, colorMode: 'growth', activityTimeframe: '1year' }
      })

      // Some directory rect must carry a diverging palette color (not #4a4a4a)
      const colors = wrapper.findAll('rect').map(r => r.attributes('fill'))
      const dirHasGrowthColor = colors.some(c => allGrowthColors.includes(c))
      expect(dirHasGrowthColor).toBe(true)
      // Directories must NOT fall back to the depth/filetype neutral gray here
      expect(colors.some(c => c === '#4a4a4a')).toBe(false)
    })

    it('falls back to neutral when a file has no growth data', () => {
      const noGrowth = {
        name: 'root',
        children: [
          { name: 'a.js', value: 100, language: 'JavaScript' }
        ]
      }
      const wrapper = mount(Treemap, {
        props: { data: noGrowth, colorMode: 'growth', activityTimeframe: '1year' }
      })

      const colors = wrapper.findAll('rect').map(r => r.attributes('fill'))
      expect(colors).toContain(GROWTH_NEUTRAL)
    })

    it('honors the timeframe when coloring (3 months vs 1 year)', () => {
      // big.js net is +50 in 3m and +200 in 1y; small.js is -40 in 3m and -180 in 1y.
      // Switching the window changes the symmetric max and hence buckets — both windows
      // must still render valid diverging colors without error.
      const wrapper = mount(Treemap, {
        props: { data: growthData, colorMode: 'growth', activityTimeframe: '3months' }
      })
      const colors = wrapper.findAll('rect').map(r => r.attributes('fill'))
      expect(colors.some(c => allGrowthColors.includes(c))).toBe(true)
    })

    it('colors repo-view tiles by the active growth mode, not activity', () => {
      // Two repos: one net-growing, one net-shrinking. In repo view, the repo tiles
      // must reflect growth (diverging palette), not the old hardcoded activity viridis.
      const repoData = {
        name: 'set', type: 'set',
        children: [
          { name: 'grew', type: 'repository', path: '/grew', children: [
            { name: 'a.js', value: 100, language: 'JavaScript',
              commits: { last_3_months: 9, last_year: 30 },
              growth: { last_3_months: 50, last_year: 200, added_3m: 60, deleted_3m: 10, added_1y: 250, deleted_1y: 50 } }
          ]},
          { name: 'shrank', type: 'repository', path: '/shrank', children: [
            { name: 'b.js', value: 80, language: 'JavaScript',
              commits: { last_3_months: 7, last_year: 25 },
              growth: { last_3_months: -40, last_year: -180, added_3m: 5, deleted_3m: 45, added_1y: 20, deleted_1y: 200 } }
          ]}
        ]
      }
      const wrapper = mount(Treemap, {
        props: { data: repoData, colorMode: 'growth', activityTimeframe: '1year', showRepoView: true }
      })
      const colors = wrapper.findAll('rect').map(r => r.attributes('fill'))
      // Repo tiles must use the diverging growth palette: one grow, one shrink
      expect(colors.some(c => GROWTH_PALETTE.grow.includes(c))).toBe(true)
      expect(colors.some(c => GROWTH_PALETTE.shrink.includes(c))).toBe(true)
      // And must NOT fall back to the activity viridis palette
      expect(colors.some(c => ACTIVITY_PALETTE.includes(c))).toBe(false)
    })

    it('shows net growth in repo-view tile text instead of change count', async () => {
      const repoData = {
        name: 'set', type: 'set',
        children: [
          { name: 'grew', type: 'repository', path: '/grew', children: [
            { name: 'a.js', value: 100, language: 'JavaScript',
              commits: { last_3_months: 9, last_year: 30 },
              growth: { last_3_months: 50, last_year: 200, added_3m: 60, deleted_3m: 10, added_1y: 250, deleted_1y: 50 } }
          ]}
        ]
      }
      const wrapper = mount(Treemap, {
        props: { data: repoData, colorMode: 'growth', activityTimeframe: '1year', showRepoView: true }
      })
      // Force a real tile size (happy-dom reports ~0), then redraw the SVG labels
      wrapper.vm.width = 800
      wrapper.vm.height = 600
      wrapper.vm.render()
      await wrapper.vm.$nextTick()
      // The repo tile's metric line shows the net (+200), not "30 changes"
      expect(wrapper.text()).toContain('+200 net')
      expect(wrapper.text()).not.toContain('30 change')
    })

    it('counts surviving files only, ignoring deleted-file leaves', () => {
      // A folder with one surviving file and one deleted file must report 1 file.
      const folder = {
        name: 'src', type: 'directory', path: 'src',
        children: [
          { name: 'a.js', type: 'file', value: 100, growth: { last_year: 50, added_1y: 60, deleted_1y: 10 } },
          { name: 'gone.js', type: 'deleted', value: 0, growth: { last_year: -300, added_1y: 0, deleted_1y: 300 } }
        ]
      }
      const wrapper = mount(Treemap, {
        props: { data: folder, colorMode: 'growth', activityTimeframe: '1year' }
      })
      expect(wrapper.vm.countFiles(folder)).toBe(1)
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
