import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ExclusionMenu from '../components/ExclusionMenu.vue'

describe('ExclusionMenu', () => {
  const defaultProps = {
    visible: true,
    x: 100,
    y: 200,
    node: {
      name: 'test-file.json',
      path: 'my-repo/src/data/test-file.json',
      type: 'file'
    }
  }

  let wrapper = null

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
  })

  // Rendering
  it('renders when visible prop is true', () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    expect(wrapper.find('.exclusion-menu').exists()).toBe(true)
  })

  it('hides when visible prop is false', () => {
    wrapper = mount(ExclusionMenu, {
      props: { ...defaultProps, visible: false }
    })
    expect(wrapper.find('.exclusion-menu').exists()).toBe(false)
  })

  it('positions at provided x,y coordinates', () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const menu = wrapper.find('.exclusion-menu')
    expect(menu.attributes('style')).toContain('left: 100px')
    expect(menu.attributes('style')).toContain('top: 200px')
  })

  // Menu options
  it('shows "Exclude this file" with full path', () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const items = wrapper.findAll('.menu-item')
    expect(items.some(item => item.text().includes('Exclude this file'))).toBe(true)
  })

  it('shows "Exclude this folder" for parent directory', () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const items = wrapper.findAll('.menu-item')
    expect(items.some(item => item.text().includes('Exclude this folder'))).toBe(true)
  })

  it('shows "Exclude same name in repo" option', () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const text = wrapper.text()
    expect(text).toContain('test-file.json')
    expect(text).toContain('in this repo')
  })

  it('shows "Exclude same name everywhere" option', () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const text = wrapper.text()
    expect(text).toContain('everywhere')
  })

  it('shows "Exclude *.ext in repo" option', () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const text = wrapper.text()
    expect(text).toContain('*.json')
  })

  it('shows "Exclude *.ext everywhere" option', () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const items = wrapper.findAll('.menu-item')
    const extItems = items.filter(item => item.text().includes('*.json'))
    expect(extItems.length).toBeGreaterThanOrEqual(2) // repo + everywhere
  })

  // Pattern generation
  it('emits exclude event with file pattern when "Exclude this file" clicked', async () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const fileItem = wrapper.findAll('.menu-item').find(
      item => item.text().includes('Exclude this file')
    )
    await fileItem.trigger('click')

    expect(wrapper.emitted('exclude')).toBeTruthy()
    expect(wrapper.emitted('exclude')[0][0]).toBe('my-repo/src/data/test-file.json')
  })

  it('emits exclude event with folder pattern when "Exclude this folder" clicked', async () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const folderItem = wrapper.findAll('.menu-item').find(
      item => item.text().includes('Exclude this folder')
    )
    await folderItem.trigger('click')

    expect(wrapper.emitted('exclude')).toBeTruthy()
    expect(wrapper.emitted('exclude')[0][0]).toBe('my-repo/src/data/**')
  })

  it('emits exclude event with repo wildcard pattern for same name in repo', async () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const items = wrapper.findAll('.menu-item')
    const nameRepoItem = items.find(
      item => item.text().includes('test-file.json') && item.text().includes('in this repo')
    )
    await nameRepoItem.trigger('click')

    expect(wrapper.emitted('exclude')).toBeTruthy()
    expect(wrapper.emitted('exclude')[0][0]).toBe('my-repo/**/test-file.json')
  })

  it('emits exclude event with global wildcard pattern for same name everywhere', async () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const items = wrapper.findAll('.menu-item')
    const nameEverywhereItem = items.find(
      item => item.text().includes('test-file.json') && item.text().includes('everywhere')
    )
    await nameEverywhereItem.trigger('click')

    expect(wrapper.emitted('exclude')).toBeTruthy()
    expect(wrapper.emitted('exclude')[0][0]).toBe('**/test-file.json')
  })

  it('emits exclude event with extension pattern for repo', async () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const items = wrapper.findAll('.menu-item')
    const extRepoItem = items.find(
      item => item.text().includes('*.json') && item.text().includes('in this repo')
    )
    await extRepoItem.trigger('click')

    expect(wrapper.emitted('exclude')).toBeTruthy()
    expect(wrapper.emitted('exclude')[0][0]).toBe('my-repo/**/*.json')
  })

  it('emits exclude event with extension pattern everywhere', async () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const items = wrapper.findAll('.menu-item')
    const extEverywhereItem = items.find(
      item => item.text().includes('*.json') && item.text().includes('everywhere')
    )
    await extEverywhereItem.trigger('click')

    expect(wrapper.emitted('exclude')).toBeTruthy()
    expect(wrapper.emitted('exclude')[0][0]).toBe('**/*.json')
  })

  // Events
  it('emits close event when clicking outside', async () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    await wrapper.find('.exclusion-backdrop').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  // Escape key handling moved to App.vue centralized handler

  it('emits close after exclude event', async () => {
    wrapper = mount(ExclusionMenu, { props: defaultProps })
    const fileItem = wrapper.findAll('.menu-item').find(
      item => item.text().includes('Exclude this file')
    )
    await fileItem.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
