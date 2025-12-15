import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TreemapExplorer from '../components/TreemapExplorer.vue'
import Treemap from '../components/Treemap.vue'
import Breadcrumb from '../components/Breadcrumb.vue'
import StatsBar from '../components/StatsBar.vue'
import Statusline from '../components/Statusline.vue'

describe('TreemapExplorer', () => {
  const mockData = {
    name: 'root',
    path: '',
    children: [
      {
        name: 'folder1',
        path: 'folder1',
        children: [
          { name: 'file1.js', path: 'folder1/file1.js', type: 'file', value: 100 }
        ]
      },
      { name: 'file2.js', path: 'file2.js', type: 'file', value: 200 }
    ]
  }

  const rootNode = { name: 'root', path: '', children: mockData.children }
  const folder1Node = { name: 'folder1', path: 'folder1', children: mockData.children[0].children }

  const defaultProps = {
    data: mockData,
    navigationStack: [rootNode],
    preferences: {
      appearance: {
        cushionTreemap: false,
        hideFolderBorders: false,
        colorMode: 'depth'
      }
    }
  }

  function createWrapper(props = {}) {
    return mount(TreemapExplorer, {
      props: { ...defaultProps, ...props }
    })
  }

  it('renders all four subcomponents', () => {
    const wrapper = createWrapper()

    expect(wrapper.findComponent(Breadcrumb).exists()).toBe(true)
    expect(wrapper.findComponent(StatsBar).exists()).toBe(true)
    expect(wrapper.findComponent(Treemap).exists()).toBe(true)
    expect(wrapper.findComponent(Statusline).exists()).toBe(true)
  })

  it('passes breadcrumb path derived from navigationStack', () => {
    const wrapper = createWrapper({
      navigationStack: [rootNode, folder1Node]
    })

    const breadcrumb = wrapper.findComponent(Breadcrumb)
    expect(breadcrumb.props('path')).toEqual(['root', 'folder1'])
  })

  it('passes currentNode (last in stack) to StatsBar', () => {
    const wrapper = createWrapper({
      navigationStack: [rootNode, folder1Node]
    })

    const statsBar = wrapper.findComponent(StatsBar)
    expect(statsBar.props('currentNode')).toEqual(folder1Node)
  })

  it('emits update:navigationStack on drill-down', async () => {
    const wrapper = createWrapper()
    const treemap = wrapper.findComponent(Treemap)

    const newPath = [rootNode, folder1Node]
    await treemap.vm.$emit('drill-down', { node: folder1Node, path: newPath })

    expect(wrapper.emitted('update:navigationStack')).toBeTruthy()
    expect(wrapper.emitted('update:navigationStack')[0]).toEqual([newPath])
  })

  it('emits update:navigationStack on breadcrumb navigate', async () => {
    const wrapper = createWrapper({
      navigationStack: [rootNode, folder1Node]
    })
    const breadcrumb = wrapper.findComponent(Breadcrumb)

    await breadcrumb.vm.$emit('navigate', 0)

    expect(wrapper.emitted('update:navigationStack')).toBeTruthy()
    expect(wrapper.emitted('update:navigationStack')[0]).toEqual([[rootNode]])
  })

  it('emits file-open when clicking already-focused file', async () => {
    const fileNode = { name: 'file1.js', path: 'folder1/file1.js', type: 'file', value: 100 }
    const wrapper = createWrapper({
      navigationStack: [rootNode, folder1Node, fileNode]
    })
    const treemap = wrapper.findComponent(Treemap)

    // Click the same file we're already focused on
    await treemap.vm.$emit('drill-down', {
      node: fileNode,
      path: [rootNode, folder1Node, fileNode]
    })

    expect(wrapper.emitted('file-open')).toBeTruthy()
    expect(wrapper.emitted('file-open')[0]).toEqual(['folder1/file1.js'])
  })

  it('emits contextmenu on node right-click', async () => {
    const wrapper = createWrapper()
    const treemap = wrapper.findComponent(Treemap)

    const contextEvent = { x: 100, y: 200, node: folder1Node }
    await treemap.vm.$emit('node-contextmenu', contextEvent)

    expect(wrapper.emitted('contextmenu')).toBeTruthy()
    expect(wrapper.emitted('contextmenu')[0]).toEqual([contextEvent])
  })

  it('updates statusline on hover', async () => {
    const wrapper = createWrapper()
    const treemap = wrapper.findComponent(Treemap)
    const statusline = wrapper.findComponent(Statusline)

    expect(statusline.props('text')).toBe('')

    await treemap.vm.$emit('hover', 'root / folder1 / file1.js (100 lines)')
    expect(statusline.props('text')).toBe('root / folder1 / file1.js (100 lines)')

    await treemap.vm.$emit('hover-end')
    expect(statusline.props('text')).toBe('')
  })

  it('ignores drill-down when clicking same directory', async () => {
    const wrapper = createWrapper({
      navigationStack: [rootNode, folder1Node]
    })
    const treemap = wrapper.findComponent(Treemap)

    // Click folder1 when already at folder1
    await treemap.vm.$emit('drill-down', {
      node: folder1Node,
      path: [rootNode, folder1Node]
    })

    expect(wrapper.emitted('update:navigationStack')).toBeFalsy()
  })

  it('passes preferences to Treemap', () => {
    const wrapper = createWrapper({
      preferences: {
        appearance: {
          cushionTreemap: true,
          hideFolderBorders: true,
          colorMode: 'filetype'
        }
      }
    })

    const treemap = wrapper.findComponent(Treemap)
    expect(treemap.props('cushionMode')).toBe(true)
    expect(treemap.props('hideFolderBorders')).toBe(true)
    expect(treemap.props('colorMode')).toBe('filetype')
  })

  // Escape key handling moved to App.vue centralized handler
})