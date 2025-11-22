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
})
