import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatsBar from '../components/StatsBar.vue'

// A current node whose leaves carry per-file growth. The headline must roll these
// up over THIS node (scoped exactly like the lines/files counts beside it).
const growthNode = {
  name: 'area',
  children: [
    {
      name: 'a.js', value: 100, type: 'file',
      growth: { last_3_months: 90, last_year: -300, added_3m: 120, deleted_3m: 30, added_1y: 200, deleted_1y: 500 }
    },
    {
      name: 'b.js', value: 50, type: 'file',
      growth: { last_3_months: 0, last_year: 0, added_3m: 0, deleted_3m: 0, added_1y: 300, deleted_1y: 300 }
    }
  ]
}

// 1y rollup: added 200+300=500, deleted 500+300=800, net = -300
// 3m rollup: added 120+0=120, deleted 30+0=30,  net = +90

const plainNode = {
  name: 'area',
  children: [
    { name: 'a.js', value: 100, type: 'file' },
    { name: 'b.js', value: 50, type: 'file' }
  ]
}

describe('StatsBar', () => {
  it('renders the base stats without a mode headline by default', () => {
    const wrapper = mount(StatsBar, {
      props: { currentNode: growthNode }
    })
    expect(wrapper.text()).toContain('lines')
    expect(wrapper.text()).toContain('files')
    expect(wrapper.find('.mode-headline').exists()).toBe(false)
  })

  it('does not render a headline for modes without one (depth)', () => {
    const wrapper = mount(StatsBar, {
      props: { currentNode: growthNode, colorMode: 'depth' }
    })
    expect(wrapper.find('.mode-headline').exists()).toBe(false)
  })

  it('rolls up the current node into a deletion-inclusive net headline in growth mode', () => {
    const wrapper = mount(StatsBar, {
      props: { currentNode: growthNode, colorMode: 'growth', activityTimeframe: '1year' }
    })
    const headline = wrapper.find('.mode-headline')
    expect(headline.exists()).toBe(true)
    // 1y net for THIS node is -300 (added 500 - deleted 800)
    expect(headline.text()).toContain('-300')
    // Terse visible unit; explanation lives in the tooltip (exposed via aria-label)
    expect(headline.text()).toContain('lines')
    const title = headline.attributes('aria-label')
    expect(title).toContain('not code size')
    expect(title).toContain('deletions')
  })

  it('explains the git-vs-cloc line basis in the headline tooltip', () => {
    const wrapper = mount(StatsBar, {
      props: { currentNode: growthNode, colorMode: 'growth', activityTimeframe: '1year' }
    })
    const title = wrapper.find('.mode-headline').attributes('aria-label')
    expect(title).toContain('blank')
    expect(title).toContain('cloc')
  })

  it('honors the timeframe (3 months net differs from 1 year)', () => {
    const wrapper = mount(StatsBar, {
      props: { currentNode: growthNode, colorMode: 'growth', activityTimeframe: '3months' }
    })
    const headline = wrapper.find('.mode-headline')
    expect(headline.exists()).toBe(true)
    // 3m net for THIS node is +90
    expect(headline.text()).toContain('+90')
  })

  it('exposes node-scoped added/deleted detail via the headline tooltip', () => {
    const wrapper = mount(StatsBar, {
      props: { currentNode: growthNode, colorMode: 'growth', activityTimeframe: '1year' }
    })
    const title = wrapper.find('.mode-headline').attributes('aria-label')
    // node rollup: 500 added, 800 deleted
    expect(title).toContain('500')
    expect(title).toContain('800')
  })

  it('renders no headline when the current node has no growth data', () => {
    const wrapper = mount(StatsBar, {
      props: { currentNode: plainNode, colorMode: 'growth' }
    })
    expect(wrapper.find('.mode-headline').exists()).toBe(false)
  })

  it('includes deleted-file removals in the net headline (does not overstate growth)', () => {
    // A surviving file that grew, plus a deleted file whose lines are gone. The honest net
    // must net the deletion out, not ignore it.
    const nodeWithDeleted = {
      name: 'area',
      children: [
        {
          name: 'a.js', value: 100, type: 'file',
          growth: { last_3_months: 0, last_year: 150, added_3m: 0, deleted_3m: 0, added_1y: 200, deleted_1y: 50 }
        },
        {
          name: 'gone.js', value: 0, type: 'deleted',
          growth: { last_3_months: 0, last_year: -300, added_3m: 0, deleted_3m: 0, added_1y: 0, deleted_1y: 300 }
        }
      ]
    }
    const wrapper = mount(StatsBar, {
      props: { currentNode: nodeWithDeleted, colorMode: 'growth', activityTimeframe: '1year' }
    })
    const headline = wrapper.find('.mode-headline')
    expect(headline.exists()).toBe(true)
    // 1y net: added 200, deleted 50+300=350 → −150
    expect(headline.text()).toContain('-150')
    // tooltip exposes the deletion-inclusive detail (350 deleted)
    expect(headline.attributes('aria-label')).toContain('350')
  })

  it('shows a custom tooltip on hover instead of the slow native title', async () => {
    const wrapper = mount(StatsBar, {
      props: { currentNode: growthNode, colorMode: 'growth', activityTimeframe: '1year' }
    })
    const headline = wrapper.find('.mode-headline')
    // No native title attribute (its show delay is browser-controlled and slow)
    expect(headline.attributes('title')).toBeUndefined()
    // Tooltip is not in the DOM until the user hovers
    expect(document.body.querySelector('.mode-headline-tip')).toBeNull()

    await headline.trigger('mouseenter')
    await new Promise(resolve => setTimeout(resolve, 160))
    await wrapper.vm.$nextTick()
    const tip = document.body.querySelector('.mode-headline-tip')
    expect(tip).not.toBeNull()
    expect(tip.textContent).toContain('cloc')

    // Leaving hides it again
    await headline.trigger('mouseleave')
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.mode-headline-tip')).toBeNull()
    wrapper.unmount()
  })
})
