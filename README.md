# vue-auto-combo

A fully-featured, dependency-free autocomplete / combo box component for Vue 3,
built on raw HTML elements and the
[WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
The full behavioral requirements live in [spec.md](./spec.md).

## Features

- Autocomplete over a list of strings (case-insensitive substring matching, or bring your own `filter`)
- Single-select (`v-model` as `string | null`) and multi-select (`string[]`)
- Chip-style display of multi-select values (or a plain text summary with `chips: false`)
- Strict mode (values must come from `options`) or free-text entry (`freeText: true`) with a `create` event
- Full keyboard support: arrows, Home/End, Enter, Escape, Tab, Backspace-to-remove-chip
- Accessible: combobox/listbox roles, `aria-activedescendant`, labelled chip remove buttons
- Themeable via `--ac-*` CSS custom properties; zero runtime dependencies besides Vue

## Usage

```bash
pnpm add vue-auto-combo
```

```vue
<script setup>
import { ref } from 'vue'
import { AutoCombo } from 'vue-auto-combo'
import 'vue-auto-combo/style.css'

const fruit = ref(null)              // single-select
const tags = ref(['vue'])            // multi-select
</script>

<template>
  <AutoCombo v-model="fruit" :options="['Apple', 'Banana', 'Cherry']" label="Fruit" />
  <AutoCombo v-model="tags" :options="['vue', 'react', 'svelte']" multiple chips free-text />
</template>
```

Or register globally: `app.use(VueAutoCombo)` (default export).

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` | `string \| string[] \| null` | `null` | `v-model`; `string[]` when `multiple` |
| `options` | `string[]` | — | Suggestions to autocomplete from |
| `multiple` | `boolean` | `false` | Multi-select mode |
| `chips` | `boolean` | `true` | Chip display for multi-select values |
| `freeText` | `boolean` | `false` | Allow values not present in `options` |
| `createOption` | `boolean` | `true` | Show the `Add "…"` row in free-text mode (Enter-based free text still works when off) |
| `filter` | `(option, query) => boolean` | substring | Custom matcher |
| `maxSelections` | `number` | — | Cap on multi-select values |
| `placeholder` | `string` | `''` | Input placeholder |
| `disabled` | `boolean` | `false` | Disable the whole control |
| `clearable` | `boolean` | `true` | Show a clear-all button |
| `noResultsText` | `string` | `'No matching options'` | Empty-state message |
| `label` | `string` | — | Visible `<label>` (or `aria-label` with `hideLabel`) |
| `hideLabel` | `boolean` | `false` | Use `label` as `aria-label` only |
| `openOnFocus` | `boolean` | `true` | Open the dropdown on focus/click |

### Events

`update:modelValue`, `search`, `open`, `close`, `select`, `remove`, `create`

## Development

```bash
pnpm install
pnpm storybook   # interactive demos at http://localhost:6006
pnpm test        # Vitest component tests (one per spec requirement)
pnpm build       # library build (ESM + UMD + types) into dist/
```
