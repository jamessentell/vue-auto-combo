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
- Client-side validation: `rules` functions, a `validation` event, and an exposed `validate()` method
- `prefix` / `suffix` slots for icons or icon buttons inside the control
- Loading spinner (`loading`) — a purely visual busy indicator inside the control
- Character counter (`showCounter`) with native `maxlength` enforcement
- Themeable via `--ac-*` CSS custom properties; zero runtime dependencies besides Vue

## Usage

### Installation

```bash
npm install vue-auto-combo
```

Or with pnpm:

```bash
pnpm add vue-auto-combo
```

Works with Vue 3.4 and later. CI tests every change on Vue 3.4.0, 3.4.38 and the
current 3.5 release.

Then import the component and its stylesheet:

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
| `rules` | `Array<(value) => true \| string>` | — | Validation rules; run on change and blur, first failing message is shown |
| `loading` | `boolean` | `false` | Show a spinner in the control (purely visual) |
| `showCounter` | `boolean` | `false` | Show a character counter for the search text |
| `maxlength` | `number` | — | Max search-text length (native enforcement + counter) |
| `appendTo` | `'body' \| 'self' \| string \| HTMLElement` | `'body'` | Where to render the dropdown. `'body'` teleports it out so it escapes ancestor `overflow`/stacking (e.g. a modal); a selector/element teleports there; `'self'` renders it in place |

### Events

`update:modelValue`, `search`, `open`, `close`, `select`, `remove`, `create`,
`validation` (`(valid: boolean, message: string | null)`, emitted on every validation run)

### Slots

| Slot | Description |
| --- | --- |
| `prefix` | Rendered at the front of the control, before chips and the input — icons or icon buttons; interactive elements keep their native behavior |
| `suffix` | Rendered after the input, before the clear button |

### Exposed methods (template ref)

| Method | Description |
| --- | --- |
| `validate(): boolean` | Run `rules` now (e.g. on form submit); shows/clears the message and returns validity |
| `focus(): void` | Focus the text input |

## Styling

The component ships usable default styles in `dist/vue-auto-combo.css` (import
it once: `import 'vue-auto-combo/style.css'`). Customize the look by targeting
its classes from your own stylesheet.

The component's own `<style>` block is `scoped`, but scoping only affects
selectors written *inside that block* — the class names are plain and stable,
so a normal (non-scoped) stylesheet loaded after the component's CSS can
target them directly.

### Theming with CSS custom properties

The fastest way to reskin the component is to reassign its `--ac-*` custom
properties on the `.auto-combo` class (or on a wrapper class around it).
Custom properties inherit through the DOM, so setting them anywhere above
the component in the tree works too.

| Property | Default | Used for |
| --- | --- | --- |
| `--ac-border` | `#c8ccd4` | Control and dropdown border |
| `--ac-border-focus` | `#4f6df5` | Focus ring/border, active option check, match underline |
| `--ac-bg` | `#fff` | Control and dropdown background |
| `--ac-text` | `#1f2430` | Primary text color |
| `--ac-muted` | `#7a8194` | Placeholder, icons, counter text |
| `--ac-chip-bg` | `#eef1ff` | Multi-select chip background |
| `--ac-chip-text` | `#35439c` | Chip text, create-option row, selected-check color |
| `--ac-active-bg` | `#eef1ff` | Highlighted/hovered option background |
| `--ac-error` | `#cf3a3a` | Error border, error text, counter-at-limit text |
| `--ac-disabled-bg` | `#f3f4f6` | Control background when `disabled` |
| `--ac-shadow` | `0 8px 24px rgba(15, 20, 40, 0.12)` | Dropdown panel shadow |
| `--ac-radius` | `6px` | Control and dropdown corner radius |
| `--ac-font` | `inherit` | Font shorthand for the whole component |
| `--ac-listbox-max-height` | `260px` | Design cap on dropdown height (the panel also shrinks to fit available space) |
| `--ac-listbox-z` | `9999` | z-index of the teleported dropdown (with `appendTo: 'body'`) |

Set these on the component (`.auto-combo`) as usual — when the dropdown teleports
to `<body>`, its resolved `--ac-*` theme is forwarded onto the panel so it stays
styled outside the component tree.

```css
/* Theme every instance from a global stylesheet */
.auto-combo {
  --ac-bg: #262a36;
  --ac-text: #e7e9f0;
  --ac-border: #3a3f4f;
  --ac-border-focus: #8ea2ff;
  --ac-chip-bg: #333a52;
  --ac-chip-text: #c3cbff;
}

/* Or scope a theme to a subset of instances with an extra class */
.theme-dark.auto-combo {
  --ac-bg: #262a36;
  --ac-text: #e7e9f0;
}
```

```vue
<template>
  <AutoCombo v-model="fruit" :options="fruits" class="theme-dark" />
</template>
```

> `--ac-radius` shapes both the control **and** the dropdown panel, so
> cranking it up to a pill value (e.g. `999px`) ovals out the dropdown along
> with the input. For a true pill input, keep `--ac-radius` at a normal value
> and round just the control with a class override (see below) instead.

### Class reference

For changes the custom properties don't cover — padding, shape, borders on
individual parts — target the classes directly.

| Class | Element | Notes |
| --- | --- | --- |
| `.auto-combo` | Root wrapper | Add `--ac-*` overrides here |
| `.auto-combo--disabled` | Root wrapper | Present when `disabled` |
| `.auto-combo--error` | Root wrapper | Present when a validation rule fails |
| `.ac-label` | `<label>` | Visible label (`label` prop, `hideLabel` unset) |
| `.ac-field` | Wrapper around control + dropdown | Positioning context for the dropdown |
| `.ac-control` | The bordered box | Contains prefix, chips/summary, input, spinner, suffix, clear button |
| `.ac-prefix` / `.ac-suffix` | Slot wrappers | Wrap the `prefix`/`suffix` slot content |
| `.ac-chip` | One selected value (multi-select + `chips`) | |
| `.ac-chip__text` | Chip label text | |
| `.ac-chip__remove` | Chip's `&times;` remove button | |
| `.ac-summary` | Comma-joined value text | Multi-select with `chips: false` |
| `.ac-input` | The `<input>` element | |
| `.ac-spinner` | Loading spinner | Present when `loading` |
| `.ac-clear` | Clear-all `&times;` button | Present when `clearable` and a value is selected |
| `.ac-footer` | Row under the control | Holds the error message and/or counter |
| `.ac-error` | Error message text | |
| `.ac-counter` | Character counter text | |
| `.ac-counter--limit` | Counter | Present at `maxlength` |
| `.ac-listbox` | Dropdown `<ul>` | |
| `.ac-option` | One `<li>` row | |
| `.ac-option--active` | Option | Keyboard/mouse-highlighted row |
| `.ac-option--selected` | Option | Already-selected value |
| `.ac-option--create` | Option | The `Add "…"` free-text row |
| `.ac-option__text` | Option label span | Wraps the highlighted match |
| `.ac-option__check` | Selected-option checkmark | |
| `.ac-match` | Matched substring within an option | Wrapped in `<mark>` |
| `.ac-empty` | No-results row | Shown when `showNoResults` and nothing matches |

```css
/* Example: square corners on chips, bolder active-option highlight */
.auto-combo .ac-chip {
  border-radius: 4px;
}

.auto-combo .ac-option--active {
  background: var(--ac-chip-text);
  color: #fff;
}
```

See the **Styling** page in [Storybook](https://jamessentell.github.io/vue-auto-combo/)
for live, editable examples of both approaches.

## Development

```bash
pnpm install
pnpm storybook   # interactive demos at http://localhost:6006
pnpm test        # Vitest component tests (one per spec requirement)
pnpm build       # library build (ESM + UMD + types) into dist/
pnpm test:dist   # the same tests against the built package in dist/
pnpm check:dist  # load dist/ as ESM and CommonJS and server-render it
```

To check another Vue version, build first, then swap Vue without rebuilding:
`pnpm build && pnpm add -D vue@3.4.38 --ignore-scripts && pnpm test && pnpm test:dist && pnpm check:dist`
(undo with `git checkout package.json pnpm-lock.yaml && pnpm install`).

## Releasing

Every push to `main` publishes a new version. `.github/workflows/release.yml`
works out the version, tests, builds, publishes to npm with trusted publishing
(no token) and creates a GitHub release with generated notes.

- **Patch releases are automatic:** if `package.json` matches the newest tag,
  the workflow bumps the patch number (v0.1.2 → 0.1.3), commits that back to
  `main` and tags it.
- **Minor and major releases:** set the version in `package.json` yourself
  (for example `npm version minor --no-git-tag-version` → 0.2.0) and merge.
  Because it's ahead of the newest tag, that version is released as-is, and
  patch bumps continue from there (0.2.1, 0.2.2, …).
- **Skip a release:** put `[skip release]` in the merge commit message.

If `main` is protected so that nothing can push to it directly, the workflow's
version commit needs a bypass. Either add GitHub Actions to the bypass list of
the rule protecting `main` (if the list offers it), or add a `RELEASE_TOKEN` repository secret (a
fine-grained token or GitHub App token with Contents: read and write that the
rule lets push), which the workflow uses instead of the default token.
The same applies to a rule protecting `v*` tags.
