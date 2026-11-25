import { afterEach, describe, expect, it, vi } from 'vitest'
import * as vue from 'vue'
import { createApp, createSSRApp, defineComponent, h, version } from 'vue'
import { renderToString } from 'vue/server-renderer'
import AutoCombo from '../src/AutoCombo.vue'
import { useUniqueId } from '../src/useUniqueId'

const isVue35 = Number(version.split('.')[1]) >= 5
const hasNativeUseId = isVue35 && 'useId' in vue

// Two comboboxes side by side, rendered in place so their panels stay in the tree.
const TwoCombos = defineComponent({
  render: () =>
    h('div', [
      h(AutoCombo, { options: ['Apple'], label: 'First', appendTo: 'self' }),
      h(AutoCombo, { options: ['Banana'], label: 'Second', appendTo: 'self' }),
    ]),
})

function ariaIds(root: ParentNode) {
  return [...root.querySelectorAll('input[role="combobox"]')].map((input) => ({
    input: input.id,
    listbox: input.getAttribute('aria-controls'),
  }))
}

const mounted: Array<() => void> = []
function mountApp(app: vue.App, html = '', { unmount = true } = {}) {
  const el = document.createElement('div')
  el.innerHTML = html
  document.body.appendChild(el)
  app.mount(el)
  mounted.push(() => {
    if (unmount) app.unmount()
    el.remove()
  })
  return el
}

afterEach(() => {
  mounted.splice(0).forEach((cleanup) => cleanup())
})

describe(`useUniqueId (Vue ${version})`, () => {
  it('gives each combobox its own ARIA ids', () => {
    const el = mountApp(createApp(TwoCombos))
    const [a, b] = ariaIds(el)
    expect(a.input).toMatch(/^v-/)
    expect(a.input).not.toBe(b.input)
    expect(a.listbox).not.toBe(b.listbox)
    expect(el.querySelector(`#${CSS.escape(a.listbox!)}`)?.getAttribute('role')).toBe('listbox')
    expect(el.querySelector(`label[for="${a.input}"]`)?.textContent).toBe('First')
  })

  it('uses app.config.idPrefix', () => {
    const app = createApp(TwoCombos)
    ;(app.config as { idPrefix?: string }).idPrefix = 'shop'
    const [a] = ariaIds(mountApp(app))
    expect(a.input).toMatch(/^shop-/)
  })

  it('throws outside setup()', () => {
    expect(() => useUniqueId()).toThrow(/during setup/)
  })

  it.runIf(hasNativeUseId)('never collides with the app’s own useId() calls', () => {
    const appIds: string[] = []
    const Parent = defineComponent({
      setup() {
        const useId = (vue as unknown as { useId: () => string }).useId
        appIds.push(useId())
        return () => h('div', [h(AutoCombo, { options: [], label: 'A', appendTo: 'self' }), h(Child)])
      },
    })
    const Child = defineComponent({
      setup() {
        const useId = (vue as unknown as { useId: () => string }).useId
        appIds.push(useId())
        return () => h('span')
      },
    })
    const el = mountApp(createApp(Parent))
    const [combo] = ariaIds(el)
    expect(appIds).toHaveLength(2)
    expect(appIds).not.toContain(combo.input.replace(/-input$/, ''))
    expect(new Set([...appIds, combo.input.replace(/-input$/, '')]).size).toBe(3)
  })

  it('renders the same ids on the server and hydrates without mismatches', async () => {
    const html = await renderToString(createSSRApp(TwoCombos))
    const serverIds = ariaIds(Object.assign(document.createElement('div'), { innerHTML: html }))

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      // Vue 3.4 itself throws when unmounting a hydrated app that holds a
      // disabled <Teleport> (fixed in 3.5), so leave the app mounted there.
      const el = mountApp(createSSRApp(TwoCombos), html, { unmount: isVue35 })
      expect(ariaIds(el)).toEqual(serverIds)
      const messages = [...warn.mock.calls, ...error.mock.calls]
        .map((args) => String(args[0]))
        .filter((m) => /hydration/i.test(m))
        // Early Vue 3.4 releases misreport v-show's inline style as a mismatch;
        // that's Vue's own bug and has nothing to do with ids.
        .filter((m) => isVue35 || !/style mismatch|contains mismatches/i.test(m))
      expect(messages).toEqual([])
    } finally {
      warn.mockRestore()
      error.mockRestore()
    }
  })
})
