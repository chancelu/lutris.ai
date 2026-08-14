import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SpecPanel from '@/components/SpecPanel.vue'

describe('SpecPanel mount', () => {
  it('renders without throwing (real ProductDocPanel)', () => {
    const wrapper = mount(SpecPanel)
    expect(wrapper.exists()).toBe(true)
  })
})
