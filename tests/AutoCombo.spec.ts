import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AutoCombo from '../src/AutoCombo.vue'
import autoComboSource from '../src/AutoCombo.vue?raw'

const FRUITS = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Grape']

/**
 * Mounts AutoCombo with v-model wired up, so `update:modelValue` emissions
 * flow back into the `modelValue` prop like they would in a real app.
 */
function mountCombo(props: Record<string, unknown> = {}) {
  const wrapper = mount(AutoCombo, {
    props: {
      options: FRUITS,
      ...props,
      'onUpdate:modelValue': async (value: string | string[] | null) => {
        await wrapper.setProps({ modelValue: value })
      },
    },
    attachTo: document.body,
  })
  return wrapper
}

function input(wrapper: ReturnType<typeof mountCombo>) {
  return wrapper.find('input')
}

async function type(wrapper: ReturnType<typeof mountCombo>, text: string) {
  await input(wrapper).setValue(text)
}

async function key(wrapper: ReturnType<typeof mountCombo>, k: string) {
  await input(wrapper).trigger('keydown', { key: k })
}

function optionTexts(wrapper: ReturnType<typeof mountCombo>) {
  return wrapper.findAll('.ac-option').map((o) => o.text().replace(/✓$/, '').trim())
}

describe('1. core autocomplete behavior', () => {
  it('R1.1/R1.3 filters options with case-insensitive substring matching as the user types', async () => {
    const wrapper = mountCombo()
    await type(wrapper, 'ap')
    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(true)
    expect(optionTexts(wrapper)).toEqual(['Apple', 'Apricot', 'Grape'])
    wrapper.unmount()
  })

  it('R1.4 supports a custom filter function', async () => {
    const wrapper = mountCombo({
      filter: (option: string, q: string) => option.toLowerCase().startsWith(q.toLowerCase()),
    })
    await type(wrapper, 'ap')
    expect(optionTexts(wrapper)).toEqual(['Apple', 'Apricot'])
    wrapper.unmount()
  })

  it('R1.5 highlights the matched portion of each suggestion', async () => {
    const wrapper = mountCombo()
    await type(wrapper, 'err')
    const marks = wrapper.findAll('.ac-match')
    expect(marks.length).toBeGreaterThan(0)
    expect(marks[0].text()).toBe('err')
    wrapper.unmount()
  })

  it('R1.6 shows a configurable no-results message when nothing matches', async () => {
    const wrapper = mountCombo({ noResultsText: 'Nothing here' })
    await type(wrapper, 'zzz')
    expect(wrapper.findAll('.ac-option')).toHaveLength(0)
    expect(wrapper.find('.ac-empty').text()).toBe('Nothing here')
    wrapper.unmount()
  })

  it('R1.7 opens on focus/typing and closes on outside mousedown', async () => {
    const wrapper = mountCombo()
    await input(wrapper).trigger('focus')
    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(true)
    expect(wrapper.emitted('open')).toHaveLength(1)

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(false)
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('R1.8 marks selected options and toggles them off on click in multi-select', async () => {
    const wrapper = mountCombo({ multiple: true, modelValue: ['Apple'] })
    await input(wrapper).trigger('focus')
    const apple = wrapper.findAll('.ac-option')[0]
    expect(apple.attributes('aria-selected')).toBe('true')
    expect(apple.classes()).toContain('ac-option--selected')

    await apple.trigger('click')
    expect(wrapper.props('modelValue')).toEqual([])
    expect(wrapper.emitted('remove')).toEqual([['Apple']])
    wrapper.unmount()
  })

  it('normalizes duplicate option labels before rendering list items', async () => {
    const wrapper = mountCombo({ options: ['Apple', 'Apple', 'Banana', 'Banana'] })
    await input(wrapper).trigger('focus')
    expect(optionTexts(wrapper)).toEqual(['Apple', 'Banana'])
    expect(new Set(wrapper.findAll('[role="option"]').map((o) => o.attributes('id'))).size).toBe(2)
    wrapper.unmount()
  })
})

describe('2. selection modes', () => {
  it('R2.1 single-select commits a string, fills the input, and closes the dropdown', async () => {
    const wrapper = mountCombo()
    await type(wrapper, 'ban')
    await wrapper.find('.ac-option').trigger('click')
    expect(wrapper.props('modelValue')).toBe('Banana')
    expect(input(wrapper).element.value).toBe('Banana')
    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(false)
    expect(wrapper.emitted('select')).toEqual([['Banana']])
    wrapper.unmount()
  })

  it('R2.2 multi-select accumulates values, clears the query, and stays open', async () => {
    const wrapper = mountCombo({ multiple: true, modelValue: [] })
    await type(wrapper, 'ap')
    await wrapper.find('.ac-option').trigger('click')
    expect(wrapper.props('modelValue')).toEqual(['Apple'])
    expect(input(wrapper).element.value).toBe('')
    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(true)

    await type(wrapper, 'cher')
    await wrapper.find('.ac-option').trigger('click')
    expect(wrapper.props('modelValue')).toEqual(['Apple', 'Cherry'])
    wrapper.unmount()
  })

  it('R2.3 never stores duplicate values', async () => {
    const wrapper = mountCombo({ multiple: true, modelValue: ['Apple'] })
    await type(wrapper, 'apple')
    // Clicking the already-selected option toggles it off rather than duplicating.
    await wrapper.find('.ac-option').trigger('click')
    expect(wrapper.props('modelValue')).toEqual([])
    wrapper.unmount()
  })

  it('R2.4 respects maxSelections', async () => {
    const wrapper = mountCombo({ multiple: true, modelValue: ['Apple', 'Banana'], maxSelections: 2 })
    await type(wrapper, 'cher')
    await wrapper.find('.ac-option').trigger('click')
    expect(wrapper.props('modelValue')).toEqual(['Apple', 'Banana'])
    wrapper.unmount()
  })

  it('R2.5 emptying a committed single-select and blurring clears the model', async () => {
    const wrapper = mountCombo({ modelValue: 'Apple' })
    await type(wrapper, '')
    await input(wrapper).trigger('blur')
    expect(wrapper.props('modelValue')).toBeNull()
    wrapper.unmount()
  })
})

describe('3. chip display', () => {
  it('R3.1/R3.5 renders selected values as chips with labelled remove buttons', async () => {
    const wrapper = mountCombo({ multiple: true, chips: true, modelValue: ['Apple', 'Cherry'] })
    const chips = wrapper.findAll('.ac-chip')
    expect(chips.map((c) => c.find('.ac-chip__text').text())).toEqual(['Apple', 'Cherry'])
    expect(chips[0].find('button').attributes('aria-label')).toBe('Remove Apple')
    wrapper.unmount()
  })

  it('R3.2 removes a value when its chip button is clicked', async () => {
    const wrapper = mountCombo({ multiple: true, chips: true, modelValue: ['Apple', 'Cherry'] })
    await wrapper.find('.ac-chip__remove').trigger('click')
    expect(wrapper.props('modelValue')).toEqual(['Cherry'])
    expect(wrapper.emitted('remove')).toEqual([['Apple']])
    wrapper.unmount()
  })

  it('R3.3/R5.6 Backspace in an empty input removes the last chip', async () => {
    const wrapper = mountCombo({ multiple: true, chips: true, modelValue: ['Apple', 'Cherry'] })
    await key(wrapper, 'Backspace')
    expect(wrapper.props('modelValue')).toEqual(['Apple'])

    // With text in the input, Backspace must not touch the selection.
    await type(wrapper, 'x')
    await key(wrapper, 'Backspace')
    expect(wrapper.props('modelValue')).toEqual(['Apple'])
    wrapper.unmount()
  })

  it('R3.4 chips=false renders a comma-separated summary instead', async () => {
    const wrapper = mountCombo({ multiple: true, chips: false, modelValue: ['Apple', 'Cherry'] })
    expect(wrapper.findAll('.ac-chip')).toHaveLength(0)
    expect(wrapper.find('.ac-summary').text()).toBe('Apple, Cherry')
    wrapper.unmount()
  })
})

describe('4. free text vs. strict mode', () => {
  it('R4.1 strict mode refuses to commit text that is not an option', async () => {
    const wrapper = mountCombo()
    await type(wrapper, 'Dragonfruit')
    await key(wrapper, 'Enter')
    expect(wrapper.props('modelValue')).toBeNull()

    await input(wrapper).trigger('blur')
    expect(input(wrapper).element.value).toBe('')
    wrapper.unmount()
  })

  it('R4.2 free-text mode offers an Add option and commits arbitrary text', async () => {
    const wrapper = mountCombo({ freeText: true })
    await type(wrapper, 'Dragonfruit')
    const create = wrapper.find('.ac-option--create')
    expect(create.text()).toBe('Add "Dragonfruit"')

    await key(wrapper, 'Enter')
    expect(wrapper.props('modelValue')).toBe('Dragonfruit')
    wrapper.unmount()
  })

  it('R4.3 free-text commit of an exact (case-insensitive) match selects the existing option', async () => {
    const wrapper = mountCombo({ freeText: true, filter: () => false })
    await type(wrapper, 'apple')
    // No create row for exact matches, and Enter resolves to the canonical option.
    expect(wrapper.find('.ac-option--create').exists()).toBe(false)
    await key(wrapper, 'Enter')
    expect(wrapper.props('modelValue')).toBe('Apple')
    expect(wrapper.emitted('create')).toBeUndefined()
    wrapper.unmount()
  })

  it('R4.5 createOption=false hides the Add row but keeps Enter-based free text', async () => {
    const wrapper = mountCombo({ freeText: true, createOption: false })
    await type(wrapper, 'Dragonfruit')
    expect(wrapper.find('.ac-option--create').exists()).toBe(false)
    expect(wrapper.find('.ac-empty').exists()).toBe(true)

    await key(wrapper, 'Enter')
    expect(wrapper.props('modelValue')).toBe('Dragonfruit')
    expect(wrapper.emitted('create')).toEqual([['Dragonfruit']])
    wrapper.unmount()
  })

  it('R4.5 createOption=false still commits the highlighted option while matches exist', async () => {
    const wrapper = mountCombo({ freeText: true, createOption: false })
    await type(wrapper, 'app')
    expect(wrapper.find('.ac-option--create').exists()).toBe(false)
    await key(wrapper, 'Enter')
    expect(wrapper.props('modelValue')).toBe('Apple')
    expect(wrapper.emitted('create')).toBeUndefined()
    wrapper.unmount()
  })

  it('R4.4 emits create when a novel free-text value is committed', async () => {
    const wrapper = mountCombo({ freeText: true, multiple: true, modelValue: [] })
    await type(wrapper, 'Dragonfruit')
    await key(wrapper, 'Enter')
    expect(wrapper.emitted('create')).toEqual([['Dragonfruit']])
    expect(wrapper.props('modelValue')).toEqual(['Dragonfruit'])
    wrapper.unmount()
  })

  it('does not emit create when a novel free-text value is blocked by maxSelections', async () => {
    const wrapper = mountCombo({
      freeText: true,
      multiple: true,
      modelValue: ['Apple'],
      maxSelections: 1,
    })
    await type(wrapper, 'Dragonfruit')
    expect(wrapper.find('.ac-option--create').exists()).toBe(false)
    await key(wrapper, 'Enter')
    expect(wrapper.props('modelValue')).toEqual(['Apple'])
    expect(wrapper.emitted('create')).toBeUndefined()
    wrapper.unmount()
  })

  it('does not toggle off an already-selected exact match hidden by a custom filter', async () => {
    const wrapper = mountCombo({
      freeText: true,
      multiple: true,
      modelValue: ['Apple'],
      filter: () => false,
    })
    await type(wrapper, 'apple')
    await key(wrapper, 'Enter')
    expect(wrapper.props('modelValue')).toEqual(['Apple'])
    expect(wrapper.emitted('remove')).toBeUndefined()
    expect(wrapper.emitted('create')).toBeUndefined()
    wrapper.unmount()
  })
})

describe('5. keyboard interaction', () => {
  it('R5.1 ArrowDown/ArrowUp navigate with wrap-around', async () => {
    const wrapper = mountCombo()
    await type(wrapper, 'ap') // Apple, Apricot, Grape
    const active = () => wrapper.find('.ac-option--active').text()
    expect(active()).toContain('Apple')

    await key(wrapper, 'ArrowDown')
    expect(active()).toContain('Apricot')
    await key(wrapper, 'ArrowDown')
    expect(active()).toContain('Grape')
    await key(wrapper, 'ArrowDown')
    expect(active()).toContain('Apple') // wrapped
    await key(wrapper, 'ArrowUp')
    expect(active()).toContain('Grape') // wrapped back
    wrapper.unmount()
  })

  it('R5.2 Enter commits the active option and prevents form submission', async () => {
    const wrapper = mountCombo()
    await type(wrapper, 'ap')
    await key(wrapper, 'ArrowDown')
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true })
    input(wrapper).element.dispatchEvent(event)
    await wrapper.vm.$nextTick()
    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.props('modelValue')).toBe('Apricot')
    wrapper.unmount()
  })

  it('R5.3 Escape closes the dropdown first, then clears the search text', async () => {
    const wrapper = mountCombo()
    await type(wrapper, 'ap')
    await key(wrapper, 'Escape')
    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(false)
    expect(input(wrapper).element.value).toBe('ap')

    await key(wrapper, 'Escape')
    expect(input(wrapper).element.value).toBe('')
    wrapper.unmount()
  })

  it('R5.4 Home and End jump to the first and last option', async () => {
    const wrapper = mountCombo()
    await type(wrapper, 'ap')
    await key(wrapper, 'End')
    expect(wrapper.find('.ac-option--active').text()).toContain('Grape')
    await key(wrapper, 'Home')
    expect(wrapper.find('.ac-option--active').text()).toContain('Apple')
    wrapper.unmount()
  })

  it('R5.5 Tab closes the dropdown', async () => {
    const wrapper = mountCombo()
    await type(wrapper, 'ap')
    await key(wrapper, 'Tab')
    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(false)
    wrapper.unmount()
  })

  it('R5.7 the first match is auto-highlighted whenever the filtered list changes', async () => {
    const wrapper = mountCombo()
    await type(wrapper, 'ap')
    await key(wrapper, 'End')
    await type(wrapper, 'apr')
    expect(wrapper.find('.ac-option--active').text()).toContain('Apricot')
    wrapper.unmount()
  })
})

describe('6. accessibility', () => {
  it('R6.1/R6.2 exposes the combobox and listbox roles with the right wiring', async () => {
    const wrapper = mountCombo({ multiple: true, modelValue: ['Apple'] })
    const combo = input(wrapper)
    expect(combo.attributes('role')).toBe('combobox')
    expect(combo.attributes('aria-autocomplete')).toBe('list')
    expect(combo.attributes('aria-expanded')).toBe('false')

    await combo.trigger('focus')
    expect(combo.attributes('aria-expanded')).toBe('true')
    const listbox = wrapper.find('[role="listbox"]')
    expect(combo.attributes('aria-controls')).toBe(listbox.attributes('id'))
    expect(listbox.attributes('aria-multiselectable')).toBe('true')

    const options = wrapper.findAll('[role="option"]')
    expect(options.length).toBe(FRUITS.length)
    expect(options[0].attributes('aria-selected')).toBe('true')
    expect(options[1].attributes('aria-selected')).toBe('false')
    wrapper.unmount()
  })

  it('R6.3 aria-activedescendant tracks the highlighted option', async () => {
    const wrapper = mountCombo()
    await type(wrapper, 'ap')
    await key(wrapper, 'ArrowDown')
    const activeId = wrapper.find('.ac-option--active').attributes('id')
    expect(input(wrapper).attributes('aria-activedescendant')).toBe(activeId)
    wrapper.unmount()
  })

  it('R6.4 renders a visible label wired to the input, or aria-label when hidden', () => {
    const visible = mountCombo({ label: 'Fruit' })
    const labelEl = visible.find('label')
    expect(labelEl.text()).toBe('Fruit')
    expect(labelEl.attributes('for')).toBe(input(visible).attributes('id'))
    expect(input(visible).attributes('aria-label')).toBeUndefined()
    visible.unmount()

    const hidden = mountCombo({ label: 'Fruit', hideLabel: true })
    expect(hidden.find('label').exists()).toBe(false)
    expect(input(hidden).attributes('aria-label')).toBe('Fruit')
    hidden.unmount()
  })

  it('provides an accessible input name when no visible label is rendered', () => {
    const named = mountCombo({ ariaLabel: 'Choose fruit' })
    expect(named.find('label').exists()).toBe(false)
    expect(input(named).attributes('aria-label')).toBe('Choose fruit')
    named.unmount()

    const placeholderFallback = mountCombo({ placeholder: 'Search fruit' })
    expect(input(placeholderFallback).attributes('aria-label')).toBe('Search fruit')
    placeholderFallback.unmount()

    const defaultFallback = mountCombo()
    expect(input(defaultFallback).attributes('aria-label')).toBe('Autocomplete')
    defaultFallback.unmount()
  })

  it('describes selected multi-select values to assistive technology', () => {
    const wrapper = mountCombo({
      multiple: true,
      modelValue: ['Apple', 'Cherry'],
      label: 'Fruit',
    })
    const descriptionIds = input(wrapper).attributes('aria-describedby')?.split(' ') ?? []
    const selectedDescription = wrapper.find('.ac-sr-only')

    expect(selectedDescription.text()).toBe('Selected: Apple, Cherry')
    expect(descriptionIds).toContain(selectedDescription.attributes('id'))
    wrapper.unmount()
  })

  it('announces result counts and empty states through a polite status region', async () => {
    const wrapper = mountCombo({ label: 'Fruit' })
    const status = () => wrapper.find('[role="status"]')

    await type(wrapper, 'ap')
    expect(status().attributes('aria-live')).toBe('polite')
    expect(status().text()).toBe('3 suggestions available.')
    expect(input(wrapper).attributes('aria-describedby')?.split(' ')).toContain(
      status().attributes('id'),
    )

    await type(wrapper, 'zzz')
    expect(status().text()).toBe('No matching options')
    wrapper.unmount()
  })

  it('uses a larger chip remove target for pointer and touch users', () => {
    expect(autoComboSource).toMatch(/\.ac-chip__remove\s*{[^}]*width:\s*24px;/s)
    expect(autoComboSource).toMatch(/\.ac-chip__remove\s*{[^}]*height:\s*24px;/s)
  })
})

describe('7. general API and states', () => {
  it('R7.2 disabled blocks the input, the dropdown, and chip removal', async () => {
    const wrapper = mountCombo({ multiple: true, modelValue: ['Apple'], disabled: true })
    expect(input(wrapper).attributes('disabled')).toBeDefined()

    await key(wrapper, 'ArrowDown')
    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(false)

    await wrapper.find('.ac-chip__remove').trigger('click')
    expect(wrapper.props('modelValue')).toEqual(['Apple'])
    wrapper.unmount()
  })

  it('R7.2 closes the dropdown when disabled becomes true', async () => {
    const wrapper = mountCombo()
    await input(wrapper).trigger('focus')
    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(true)

    await wrapper.setProps({ disabled: true })
    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(false)
    expect(input(wrapper).attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('R7.3 hides the placeholder once multi-select values exist', async () => {
    const wrapper = mountCombo({ multiple: true, modelValue: [], placeholder: 'Pick fruit…' })
    expect(input(wrapper).attributes('placeholder')).toBe('Pick fruit…')
    await wrapper.setProps({ modelValue: ['Apple'] })
    expect(input(wrapper).attributes('placeholder')).toBe('')
    wrapper.unmount()
  })

  it('R7.4 the clear button empties the selection', async () => {
    const wrapper = mountCombo({ multiple: true, modelValue: ['Apple', 'Cherry'] })
    await wrapper.find('.ac-clear').trigger('click')
    expect(wrapper.props('modelValue')).toEqual([])

    const single = mountCombo({ modelValue: 'Apple' })
    await single.find('.ac-clear').trigger('click')
    expect(single.props('modelValue')).toBeNull()
    expect(input(single).element.value).toBe('')
    single.unmount()
    wrapper.unmount()
  })

  it('R7.4 clearable=false hides the clear button', () => {
    const wrapper = mountCombo({ modelValue: 'Apple', clearable: false })
    expect(wrapper.find('.ac-clear').exists()).toBe(false)
    wrapper.unmount()
  })

  it('R7.5 emits search as the query changes', async () => {
    const wrapper = mountCombo()
    await type(wrapper, 'a')
    await type(wrapper, 'ap')
    expect(wrapper.emitted('search')).toEqual([['a'], ['ap']])
    wrapper.unmount()
  })

  it('R7.6 openOnFocus=false keeps the dropdown closed until typing or arrows', async () => {
    const wrapper = mountCombo({ openOnFocus: false })
    await input(wrapper).trigger('focus')
    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(false)

    await key(wrapper, 'ArrowDown')
    expect(wrapper.find('[role="listbox"]').isVisible()).toBe(true)
    wrapper.unmount()
  })

  it('R7.7 removes its document listener on unmount', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const wrapper = mountCombo()
    wrapper.unmount()
    expect(removeSpy.mock.calls.some(([type]) => type === 'mousedown')).toBe(true)
    removeSpy.mockRestore()
  })

  it('R7.1 reflects external model changes (fully controlled)', async () => {
    const wrapper = mountCombo({ modelValue: 'Apple' })
    expect(input(wrapper).element.value).toBe('Apple')
    await wrapper.setProps({ modelValue: 'Cherry' })
    expect(input(wrapper).element.value).toBe('Cherry')
    wrapper.unmount()
  })
})
