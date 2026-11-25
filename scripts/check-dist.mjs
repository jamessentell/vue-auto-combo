// Smoke test for the built package against whatever Vue is installed.
//
// Loads dist/ the way consumers do (native ESM import and CommonJS require),
// then server-renders two comboboxes and checks their ARIA ids are distinct.
// CI runs it against the oldest and newest Vue 3.4 releases after building with
// the repo's Vue, which is how a missing export (like Vue 3.5's useId) slipped
// into 0.1.2: the ES module failed to load at all on Vue 3.4.
import { createRequire } from 'node:module'
import { createSSRApp, h, version } from 'vue'
import { renderToString } from 'vue/server-renderer'

const require = createRequire(import.meta.url)
const failures = []

const esm = await import('../dist/vue-auto-combo.js').catch((error) => {
  failures.push(`ESM import failed: ${error.message}`)
})
let cjs
try {
  cjs = require('../dist/vue-auto-combo.umd.cjs')
} catch (error) {
  failures.push(`CommonJS require failed: ${error.message}`)
}

for (const [kind, mod] of [['ESM', esm], ['CommonJS', cjs]]) {
  if (!mod) continue
  try {
    const { AutoCombo } = mod
    const html = await renderToString(
      createSSRApp({
        render: () => [
          h(AutoCombo, { options: ['Apple'], label: 'First', appendTo: 'self' }),
          h(AutoCombo, { options: ['Banana'], label: 'Second', appendTo: 'self' }),
        ],
      }),
    )
    const inputs = html.match(/<input[^>]*role="combobox"[^>]*>/g) ?? []
    const ids = inputs.map((tag) => tag.match(/\sid="([^"]+)"/)?.[1])
    if (ids.length !== 2 || !ids[0] || ids[0] === ids[1]) {
      failures.push(`${kind}: expected 2 distinct combobox ids, got ${JSON.stringify(ids)}`)
    } else {
      console.log(`${kind}: rendered on Vue ${version}, combobox ids ${ids.join(', ')}`)
    }
  } catch (error) {
    failures.push(`${kind} render failed: ${error.message}`)
  }
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
