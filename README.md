# vue-auto-combo

[![CI](https://github.com/jamessentell/vue-auto-combo/actions/workflows/ci.yml/badge.svg)](https://github.com/jamessentell/vue-auto-combo/actions/workflows/ci.yml)
**[Live Storybook demo →](https://jamessentell.github.io/vue-auto-combo/)**

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

> **Not on the npm registry yet** — install it from a local clone, or straight from GitHub.

### Install from a local clone (recommended)

First, clone and build the library:

```bash
git clone https://github.com/jamessentell/vue-auto-combo.git
cd vue-auto-combo
pnpm install
pnpm build   # emits dist/ (ESM + UMD + types + CSS) — required, the package entry points live in dist/
```

Then add it to your project in one of three ways:

```bash
# Option A — path dependency (simplest; pnpm symlinks the folder)
pnpm add /path/to/vue-auto-combo

# Option B — packed tarball (closest to a real npm install)
pnpm pack                                  # run inside vue-auto-combo/, produces vue-auto-combo-0.1.0.tgz
pnpm add /path/to/vue-auto-combo-0.1.0.tgz # run inside your project

# Option C — global link (for developing the library and app side by side)
pnpm link --global                         # run inside vue-auto-combo/
pnpm link --global vue-auto-combo          # run inside your project
```

With options A and C the install points at the live folder, so re-run `pnpm build`
(or keep `pnpm exec vite build --watch` running) after changing the component to
refresh `dist/`. With option B, re-pack and re-add to pick up changes.

### Install from GitHub

The package can also be installed directly from the GitHub repository. A `prepare`
script builds `dist/` automatically during install, so no manual build step is
needed:

```bash
pnpm add jamessentell/vue-auto-combo
# or
npm install github:jamessentell/vue-auto-combo

# pin to a specific branch, tag, or commit
pnpm add jamessentell/vue-auto-combo#main
```

To pick up upstream changes later, re-run the install (or `pnpm update vue-auto-combo`).

> pnpm 10+ blocks dependency build scripts by default — if the install warns
> about ignored build scripts (imports fail because `dist/` is missing), run
> `pnpm approve-builds` and allow `vue-auto-combo`.

Once installed, imports work exactly as they will when it ships to npm:

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
| `showNoResults` | `boolean` | `true` | Show the empty-state message; when `false` the dropdown hides entirely while nothing matches |
| `label` | `string` | — | Visible `<label>` (or `aria-label` with `hideLabel`) |
| `ariaLabel` | `string` | — | Accessible name used when no visible label is rendered |
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
