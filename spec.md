# AutoCombo — Component Specification

`AutoCombo` is a dependency-free autocomplete / combo box component for Vue 3.
It is built on raw HTML elements (`<input>`, `<ul>`, `<li>`, `<button>`) with no
third-party runtime dependencies, and follows the
[WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

## 1. Core behavior

- **R1.1** The component renders a text input. As the user types, a dropdown
  listbox opens showing options that match the typed text.
- **R1.2** Options are provided as a flat list of strings via the `options` prop.
- **R1.3** Matching is case-insensitive substring matching by default.
- **R1.4** A custom `filter` function prop `(option, query) => boolean` may
  replace the default matching.
- **R1.5** The matched portion of each suggestion is visually highlighted.
- **R1.6** When no options match, a "no results" message is shown (configurable
  via the `noResultsText` prop). In free-text mode an "Add …" affordance is
  shown instead (see R4), unless it is disabled via `createOption: false`
  (R4.5), in which case the "no results" message is shown again.
- **R1.7** The dropdown opens on typing, on ArrowDown/ArrowUp, and on clicking
  the input; it closes on selection (single-select), Escape, blur/click
  outside, or Tab.
- **R1.8** Options already selected are marked as selected in the list
  (`aria-selected="true"` plus a visual indicator). In multi-select mode,
  clicking a selected option deselects it (toggle).

## 2. Selection modes

- **R2.1** `multiple: false` (default) — single-select. `v-model` is
  `string | null`. Selecting an option fills the input with it and closes the
  dropdown.
- **R2.2** `multiple: true` — multi-select. `v-model` is `string[]`. Selecting
  an option adds it, clears the search text, and keeps the dropdown open for
  further selections.
- **R2.3** Multi-select never stores duplicate values.
- **R2.4** `maxSelections` (multi-select only) caps the number of selected
  values; once reached, further selections are ignored until one is removed.
- **R2.5** In single-select mode, clearing the input text and closing the
  dropdown (blur/Escape) with strict matching on resets the model to the last
  valid value; emptying the input and blurring clears the selection
  (model becomes `null`).

## 3. Chip display

- **R3.1** `chips: true` renders each selected value (multi-select) as a chip
  inside the control, before the input.
- **R3.2** Each chip has a remove button (`×`) that deselects the value.
- **R3.3** When the input is empty, Backspace removes the last chip.
- **R3.4** `chips: false` with `multiple: true` renders selections as a plain
  comma-separated summary text instead of chips.
- **R3.5** Chip remove buttons are keyboard-focusable and expose an accessible
  label ("Remove <value>").

## 4. Free text vs. strict mode

- **R4.1** `freeText: false` (default) — strict mode. The committed value(s)
  must come from `options`. Text that doesn't exactly match an option cannot be
  committed: Enter with no highlighted option does nothing, and on blur the
  stray text is discarded (input reverts to the selected value, or empty).
- **R4.2** `freeText: true` — the user may commit arbitrary text with Enter
  (or via the "Add "<query>"" option shown in the dropdown), even if it isn't
  in `options`.
- **R4.3** In free-text mode, committing text that exactly (case-insensitively)
  matches an existing option selects that option rather than creating a
  near-duplicate.
- **R4.4** The `create` event is emitted when a free-text value not present in
  `options` is committed, so callers can append it to their options list.
- **R4.5** `createOption: true` (default) shows the "Add "<query>"" row from
  R4.2 in the dropdown. `createOption: false` hides the row while keeping
  free-text entry available: Enter still commits the typed text when no option
  is highlighted (i.e. nothing matches). While options do match, Enter commits
  the highlighted option as usual. The prop has no effect when `freeText` is
  off.

## 5. Keyboard interaction (WAI-ARIA combobox pattern)

- **R5.1** `ArrowDown` / `ArrowUp` open the dropdown and move the active
  (highlighted) option down/up, wrapping at the ends.
- **R5.2** `Enter` commits the active option (or free text per R4.2). The
  default is prevented so surrounding forms don't submit.
- **R5.3** `Escape` closes the dropdown; if already closed, it clears the
  search text.
- **R5.4** `Home` / `End` move the active option to the first/last match when
  the dropdown is open.
- **R5.5** `Tab` closes the dropdown and lets focus move on naturally.
- **R5.6** `Backspace` in an empty input removes the last selected value
  (multi-select).
- **R5.7** The first matching option is auto-highlighted whenever the filtered
  list changes, so Enter always commits something visible (strict mode).

## 6. Accessibility

- **R6.1** The input has `role="combobox"`, `aria-expanded`,
  `aria-autocomplete="list"`, and `aria-controls` pointing at the listbox.
- **R6.2** The dropdown is a `role="listbox"` element whose options have
  `role="option"`, unique `id`s, and `aria-selected`.
- **R6.3** The active option is conveyed via `aria-activedescendant` on the
  input (focus never leaves the input while navigating).
- **R6.4** A visible label can be associated via the `label` prop (rendered
  `<label for>`); `aria-label` is used as a fallback via the same prop when
  `hideLabel` is set. When no visible label is rendered, `ariaLabel`,
  `placeholder`, or a generic fallback keeps the input named.
- **R6.5** Chip remove buttons have `aria-label="Remove <value>"` (R3.5).
- **R6.6** All interactive parts have visible keyboard focus styling.

## 7. General API & states

- **R7.1** `v-model` (`modelValue` / `update:modelValue`) is the single source
  of truth for the selection. The component works fully controlled.
- **R7.2** `disabled: true` disables the input, chips, and clear button; the
  dropdown never opens.
- **R7.3** `placeholder` is forwarded to the input (hidden while values are
  selected in multi-select chip mode).
- **R7.4** `clearable: true` (default) shows a clear button when there is a
  selection; clicking it empties the selection and search text.
- **R7.5** Events: `update:modelValue`, `search` (query text changed), `open`,
  `close`, `select` (value added/chosen), `remove` (value deselected),
  `create` (free-text value committed, R4.4).
- **R7.6** `openOnFocus: true` (default) opens the dropdown when the input is
  clicked or focused; set to `false` to require typing or arrow keys.
- **R7.7** The component is SSR-safe (no direct `window`/`document` access at
  setup time) and cleans up its global listeners on unmount.
- **R7.8** Styling uses plain scoped CSS with CSS custom properties
  (`--ac-*`) as theming hooks; no CSS framework required.

## 8. Library packaging

- **R8.1** The package builds as an ES module + UMD bundle via Vite library
  mode, with `vue` as an external peer dependency.
- **R8.2** TypeScript declarations are emitted; all props/events are typed.
- **R8.3** The only runtime dependency is Vue itself.
- **R8.4** Named export `AutoCombo` from the package root; styles importable
  as `vue-auto-combo/style.css`.
