import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Statusline from '../components/Statusline.vue'

describe('Statusline', () => {
  it('renders without crashing', () => {
    const wrapper = mount(Statusline)

    expect(wrapper.exists()).toBe(true)
  })

  it('displays default message when no text provided', () => {
    const wrapper = mount(Statusline)

    expect(wrapper.text()).toContain('Hover over a file or directory')
  })

  it('displays provided text', () => {
    const wrapper = mount(Statusline, {
      props: { text: 'backend-api / src / auth.py (1234 lines)' }
    })

    expect(wrapper.text()).toBe('backend-api / src / auth.py (1234 lines)')
  })

  it('applies active class when text is provided', () => {
    const wrapper = mount(Statusline, {
      props: { text: 'some path' }
    })

    expect(wrapper.classes()).toContain('active')
  })

  it('does not apply active class when text is empty', () => {
    const wrapper = mount(Statusline, {
      props: { text: '' }
    })

    expect(wrapper.classes()).not.toContain('active')
  })
})
