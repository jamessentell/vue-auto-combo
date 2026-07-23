<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

export type AutoComboValue = string | string[] | null

export interface AutoComboProps {
  /** Selected value(s). `string | null` in single-select, `string[]` in multi-select. */
  modelValue?: string | string[] | null
  /** The list of suggestions to autocomplete from. */
  options: string[]
  /** Allow selecting multiple values. */
  multiple?: boolean
  /** Render multi-select values as removable chips (falls back to a text summary when false). */
  chips?: boolean
  /** Allow committing text that is not in `options`. */
  freeText?: boolean
  /** Show the `Add "<query>"` row in the dropdown (free-text mode only). */
  createOption?: boolean
  /** Custom matcher; defaults to case-insensitive substring matching. */
  filter?: (option: string, query: string) => boolean
  /** Maximum number of values in multi-select mode. */
  maxSelections?: number
  placeholder?: string
  disabled?: boolean
  /** Show a button that clears the whole selection. */
  clearable?: boolean
  /** Message shown when nothing matches (strict mode). */
  noResultsText?: string
  /** Show the no-results message when nothing matches; when false the dropdown hides instead. */
  showNoResults?: boolean
  /** Accessible label. Rendered as a visible <label> unless `hideLabel` is set. */
  label?: string
  /** Accessible name used when no visible label is rendered. */
  ariaLabel?: string
  hideLabel?: boolean
  /** Open the dropdown when the input gains focus or is clicked. */
  openOnFocus?: boolean
  /** Validation rules; each returns `true` when valid or an error message string. */
  rules?: Array<(value: AutoComboValue) => true | string>
  /** Show a loading spinner in the control. Purely visual. */
  loading?: boolean
  /** Show a character counter for the search text below the control. */
  showCounter?: boolean
  /** Maximum search-text length, enforced on the input and reflected by the counter. */
  maxlength?: number
  /**
   * Where to render the dropdown. `'body'` (default) teleports it to
   * `<body>` so it escapes ancestor `overflow` clipping and stacking contexts
   * (e.g. inside a modal); a CSS selector or element teleports there instead;
   * `'self'` renders it in place, positioned relative to the control.
   */
  appendTo?: 'body' | 'self' | string | HTMLElement
}

const props = withDefaults(defineProps<AutoComboProps>(), {
  modelValue: null,
  multiple: false,
  chips: true,
  freeText: false,
  createOption: true,
  filter: undefined,
  maxSelections: undefined,
  placeholder: '',
  disabled: false,
  clearable: true,
  noResultsText: 'No matching options',
  showNoResults: true,
  label: undefined,
  ariaLabel: undefined,
  hideLabel: false,
  openOnFocus: true,
  rules: undefined,
  loading: false,
  showCounter: false,
  maxlength: undefined,
  appendTo: 'body',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | null]
  search: [query: string]
  open: []
  close: []
  select: [value: string]
  remove: [value: string]
  create: [value: string]
  validation: [valid: boolean, message: string | null]
}>()

const uid = useId()
const inputId = `${uid}-input`
const listboxId = `${uid}-listbox`
const selectedDescriptionId = `${uid}-selected`
const statusId = `${uid}-status`
const errorId = `${uid}-error`

const rootEl = ref<HTMLElement | null>(null)
const controlEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLElement | null>(null)

const query = ref('')
const isOpen = ref(false)
const activeIndex = ref(-1)
const placement = ref<'bottom' | 'top'>('bottom')
const panelStyle = ref<Record<string, string>>({})
const themeVars = ref<Record<string, string>>({})
const maxHeightCap = ref(260)
const mounted = ref(false)

const appendToSelf = computed(() => props.appendTo === 'self')
// Teleport stays disabled (in place) until mounted so SSR/hydration render the
// panel in the component tree; it moves to the target on the client.
const teleportDisabled = computed(() => appendToSelf.value || !mounted.value)
const teleportTo = computed(() => (appendToSelf.value ? 'body' : props.appendTo))

function uniqueValues(values: string[]) {
  return [...new Set(values)]
}

const normalizedOptions = computed(() => uniqueValues(props.options))

const selectedValues = computed(() => {
  if (props.multiple) return Array.isArray(props.modelValue) ? uniqueValues(props.modelValue) : []
  return typeof props.modelValue === 'string' && props.modelValue !== '' ? [props.modelValue] : []
})

const singleValue = computed(() =>
  !props.multiple && typeof props.modelValue === 'string' ? props.modelValue : null,
)

const hasSelection = computed(() => selectedValues.value.length > 0)

const atMax = computed(
  () =>
    props.multiple &&
    Number.isFinite(props.maxSelections) &&
    props.maxSelections !== undefined &&
    selectedValues.value.length >= props.maxSelections,
)

const defaultFilter = (option: string, q: string) =>
  option.toLowerCase().includes(q.toLowerCase())

const filteredOptions = computed(() => {
  const q = query.value.trim()
  // Reopening a single-select whose input still shows the committed value
  // should offer every option again, not just the committed one.
  if (!q || (!props.multiple && q === singleValue.value)) return normalizedOptions.value
  const match = props.filter ?? defaultFilter
  return normalizedOptions.value.filter((o) => match(o, q))
})

const exactMatch = computed(() => {
  const q = query.value.trim().toLowerCase()
  return normalizedOptions.value.find((o) => o.toLowerCase() === q) ?? null
})

interface ListItem {
  kind: 'option' | 'create'
  value: string
}

const items = computed<ListItem[]>(() => {
  const trimmedQuery = query.value.trim()
  const list: ListItem[] = filteredOptions.value.map((value) => ({ kind: 'option', value }))
  if (
    props.freeText &&
    props.createOption &&
    trimmedQuery &&
    !exactMatch.value &&
    !isSelected(trimmedQuery) &&
    !(props.multiple && atMax.value)
  ) {
    list.push({ kind: 'create', value: trimmedQuery })
  }
  return list
})

watch(items, (list) => {
  activeIndex.value = list.length ? 0 : -1
  // The panel's height tracks the list, so re-check whether it still fits
  // below the control while open (R1.10).
  if (isOpen.value) nextTick(updatePlacement)
})

// With the no-results row suppressed, an open dropdown with no items renders
// nothing — reflect that in visibility and aria-expanded alike.
const panelVisible = computed(
  () => isOpen.value && (items.value.length > 0 || props.showNoResults),
)

const activeDescendant = computed(() =>
  isOpen.value && activeIndex.value >= 0 ? `${uid}-opt-${activeIndex.value}` : undefined,
)

const shownPlaceholder = computed(() =>
  props.multiple && hasSelection.value ? '' : props.placeholder,
)

const inputLabel = computed(() => {
  if (props.label && !props.hideLabel) return undefined
  return props.label || props.ariaLabel || props.placeholder || 'Autocomplete'
})

const selectedDescription = computed(() => {
  if (!props.multiple || !selectedValues.value.length) return ''
  return `Selected: ${selectedValues.value.join(', ')}`
})

const statusText = computed(() => {
  if (!isOpen.value) return ''
  if (!items.value.length) return props.showNoResults ? props.noResultsText : ''
  const count = items.value.length
  return `${count} ${count === 1 ? 'suggestion' : 'suggestions'} available.`
})

// --- Validation (R8) ---

const validationMessage = ref<string | null>(null)

/**
 * Runs the `rules` against the current model value, updates the shown message,
 * and emits `validation`. Also exposed so parents can trigger it (e.g. on
 * form submit). Returns whether the value is valid.
 */
function runValidation(): boolean {
  let message: string | null = null
  for (const rule of props.rules ?? []) {
    const result = rule(props.modelValue ?? null)
    if (result !== true) {
      message = result
      break
    }
  }
  validationMessage.value = message
  const valid = message === null
  emit('validation', valid, message)
  return valid
}

watch(
  () => props.modelValue,
  () => {
    if (props.rules?.length) runValidation()
  },
  { deep: true },
)

const errorText = computed(() => validationMessage.value || '')
const invalid = computed(() => !!errorText.value)

const counterText = computed(() => {
  const length = query.value.length
  return props.maxlength !== undefined ? `${length} / ${props.maxlength}` : `${length}`
})

const atCharLimit = computed(
  () => props.maxlength !== undefined && query.value.length >= props.maxlength,
)

const inputDescriptionIds = computed(() =>
  [
    selectedDescription.value ? selectedDescriptionId : '',
    statusText.value ? statusId : '',
    errorText.value ? errorId : '',
  ].filter(Boolean).join(' ') || undefined,
)

function isSelected(value: string) {
  return selectedValues.value.includes(value)
}

const PANEL_GAP = 4 // px between control and panel
const VIEWPORT_MARGIN = 8 // px the panel keeps clear of its boundary

// The panel's `--ac-*` theme comes from the component root. When teleported it
// leaves that subtree, so these are forwarded onto it (see `readThemeVars`).
const THEME_VARS = [
  '--ac-bg', '--ac-border', '--ac-border-focus', '--ac-text', '--ac-muted',
  '--ac-chip-bg', '--ac-chip-text', '--ac-active-bg', '--ac-error',
  '--ac-radius', '--ac-shadow', '--ac-font', '--ac-listbox-max-height', '--ac-listbox-z',
]

/** Snapshot the resolved theme so a teleported panel styles like the control. */
function readThemeVars(): Record<string, string> {
  const root = rootEl.value
  if (!root) return {}
  const cs = getComputedStyle(root)
  const out: Record<string, string> = {}
  for (const name of THEME_VARS) {
    const value = cs.getPropertyValue(name)
    if (value) out[name] = value
  }
  // The root applies `color: var(--ac-text)` and the font; the teleported panel
  // is outside it and can't inherit them, so pass the resolved values along.
  if (cs.color) out.color = cs.color
  if (cs.fontFamily) out.fontFamily = cs.fontFamily
  if (cs.fontSize) out.fontSize = cs.fontSize
  return out
}

/** The design `max-height` cap in px (`--ac-listbox-max-height`, default 260). */
function readMaxHeightCap(): number {
  const root = rootEl.value
  const raw = root ? getComputedStyle(root).getPropertyValue('--ac-listbox-max-height').trim() : ''
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 260
}

/**
 * The rectangle (viewport coordinates) the panel must stay inside. When
 * teleported it has escaped ancestor `overflow`, so only the viewport bounds
 * it; rendered in place, the nearest overflow-clipping ancestor (a modal body
 * or scroll pane) bounds it instead. Inset by `VIEWPORT_MARGIN`.
 */
function panelBounds(control: HTMLElement): { top: number; bottom: number } {
  const viewportBottom = window.innerHeight || document.documentElement.clientHeight
  let top = 0
  let bottom = viewportBottom
  if (teleportDisabled.value) {
    let node = control.parentElement
    while (node && node !== document.body && node !== document.documentElement) {
      const s = getComputedStyle(node)
      if (/(auto|scroll|hidden|clip)/.test(s.overflow + s.overflowY + s.overflowX)) {
        const rect = node.getBoundingClientRect()
        top = Math.max(top, rect.top)
        bottom = Math.min(bottom, rect.bottom)
        break
      }
      node = node.parentElement
    }
  }
  return { top: top + VIEWPORT_MARGIN, bottom: bottom - VIEWPORT_MARGIN }
}

/**
 * Position the panel the way mature combobox libraries do (PrimeVue, Reka UI,
 * Vuetify): flip above the control when the list can't fit below and there is
 * more room above, then *size it to the available space* — exposed as
 * `--ac-available-height` — so it scrolls internally instead of overflowing.
 * When teleported, also pin it to the control in page coordinates (R1.10).
 */
function updatePlacement() {
  const control = controlEl.value
  const list = listEl.value
  if (!control || !list) return
  const rect = control.getBoundingClientRect()
  const bounds = panelBounds(control)
  const natural = list.scrollHeight // intrinsic content height, ignoring clamps
  // The panel never grows past its design cap, so flip against the *capped*
  // height: don't flip up when the (capped) panel already fits below.
  const wanted = Math.min(natural, maxHeightCap.value)
  const spaceBelow = bounds.bottom - rect.bottom - PANEL_GAP
  const spaceAbove = rect.top - bounds.top - PANEL_GAP
  const flip = wanted > spaceBelow && spaceAbove > spaceBelow
  placement.value = flip ? 'top' : 'bottom'
  const available = Math.max(0, flip ? spaceAbove : spaceBelow)

  const style: Record<string, string> = { '--ac-available-height': `${available}px` }
  if (!teleportDisabled.value) {
    // Teleported: forward the theme, then pin to the control in page
    // coordinates so it tracks the control as the page scrolls.
    Object.assign(style, themeVars.value)
    const height = Math.min(wanted, available) // actual rendered panel height
    const top = flip ? rect.top - height - PANEL_GAP : rect.bottom + PANEL_GAP
    style.position = 'absolute'
    style.top = `${top + window.scrollY}px`
    style.left = `${rect.left + window.scrollX}px`
    style.right = 'auto'
    style.width = `${rect.width}px`
    style.margin = '0'
  }
  panelStyle.value = style
}

function open() {
  if (props.disabled || isOpen.value) return
  isOpen.value = true
  activeIndex.value = items.value.length ? 0 : -1
  emit('open')
  // Snapshot the theme cap / vars once per open (they don't change on scroll).
  maxHeightCap.value = readMaxHeightCap()
  themeVars.value = teleportDisabled.value ? {} : readThemeVars()
  // Decide below-vs-above once the panel is in the DOM and measurable (R1.10).
  nextTick(updatePlacement)
}

function close() {
  if (!isOpen.value) return
  isOpen.value = false
  activeIndex.value = -1
  placement.value = 'bottom'
  emit('close')
}

/** Close and throw away any uncommitted text (strict and free-text alike). */
function closeAndReconcile() {
  close()
  if (props.multiple) {
    query.value = ''
  } else if (!query.value.trim() && singleValue.value) {
    // The user deliberately emptied a committed single-select: clear it (R2.5).
    emit('update:modelValue', null)
    emit('remove', singleValue.value)
  } else {
    query.value = singleValue.value ?? ''
  }
  // Leaving the field is the natural "touched" point for validation (R8.2).
  if (props.rules?.length) runValidation()
}

function commitOption(value: string) {
  if (props.multiple) {
    if (isSelected(value)) {
      removeValue(value)
      return
    }
    if (atMax.value) return
    emit('update:modelValue', [...selectedValues.value, value])
    emit('select', value)
    query.value = ''
  } else {
    emit('update:modelValue', value)
    emit('select', value)
    query.value = value
    close()
  }
}

function commitItem(item: ListItem) {
  if (item.kind === 'create') {
    commitCreatedValue(item.value)
  } else {
    commitOption(item.value)
  }
}

function commitCreatedValue(value: string) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return
  if (props.multiple && (isSelected(trimmedValue) || atMax.value)) return
  emit('create', trimmedValue)
  commitOption(trimmedValue)
}

function removeValue(value: string) {
  if (props.disabled) return
  if (props.multiple) {
    emit(
      'update:modelValue',
      selectedValues.value.filter((v) => v !== value),
    )
  } else if (singleValue.value === value) {
    emit('update:modelValue', null)
    query.value = ''
  }
  emit('remove', value)
}

function clearAll() {
  if (props.disabled) return
  emit('update:modelValue', props.multiple ? [] : null)
  query.value = ''
  inputEl.value?.focus()
}

function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value
  emit('search', query.value)
  if (!isOpen.value) open()
}

function moveActive(delta: number) {
  const count = items.value.length
  if (!count) return
  activeIndex.value = (activeIndex.value + delta + count) % count
  scrollActiveIntoView()
}

function scrollActiveIntoView() {
  nextTick(() => {
    const el = listEl.value?.children[activeIndex.value] as HTMLElement | undefined
    el?.scrollIntoView?.({ block: 'nearest' })
  })
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (!isOpen.value) open()
      else moveActive(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      if (!isOpen.value) open()
      else moveActive(-1)
      break
    case 'Home':
      if (isOpen.value && items.value.length) {
        event.preventDefault()
        activeIndex.value = 0
        scrollActiveIntoView()
      }
      break
    case 'End':
      if (isOpen.value && items.value.length) {
        event.preventDefault()
        activeIndex.value = items.value.length - 1
        scrollActiveIntoView()
      }
      break
    case 'Enter': {
      event.preventDefault()
      const active = isOpen.value ? items.value[activeIndex.value] : undefined
      if (active) {
        commitItem(active)
      } else if (props.freeText && query.value.trim()) {
        // Dropdown closed but text pending: exact matches select the existing
        // option, anything else is created (R4.2/R4.3).
        const existing = exactMatch.value
        if (existing) {
          if (props.multiple && isSelected(existing)) {
            query.value = ''
          } else {
            commitOption(existing)
          }
        } else {
          commitCreatedValue(query.value)
        }
      }
      break
    }
    case 'Escape':
      if (isOpen.value) {
        event.preventDefault()
        close()
      } else if (query.value) {
        query.value = ''
        emit('search', '')
      }
      break
    case 'Backspace':
      if (props.multiple && !query.value && selectedValues.value.length) {
        removeValue(selectedValues.value[selectedValues.value.length - 1])
      }
      break
    case 'Tab':
      closeAndReconcile()
      break
  }
}

function onFocus() {
  if (props.openOnFocus) open()
}

/** True when a node lives in the control or the (possibly teleported) panel. */
function containsNode(node: Node | null): boolean {
  if (!node) return false
  return !!rootEl.value?.contains(node) || !!listEl.value?.contains(node)
}

function onBlur(event: FocusEvent) {
  if (containsNode(event.relatedTarget as Node | null)) return
  closeAndReconcile()
}

function onControlMousedown(event: MouseEvent) {
  if (props.disabled) return
  // Interactive elements inside the prefix/suffix slots (e.g. icon buttons)
  // keep their native behavior instead of redirecting focus to the input (R9.3).
  const interactive = (event.target as Element | null)?.closest?.('button, a, [tabindex]')
  if (interactive && interactive !== inputEl.value) return
  if (event.target !== inputEl.value) {
    event.preventDefault()
    inputEl.value?.focus()
  }
  if (props.openOnFocus) open()
}

function onDocumentMousedown(event: MouseEvent) {
  // The panel may be teleported out of the root, so check it explicitly.
  if (!containsNode(event.target as Node)) closeAndReconcile()
}

// While the panel is open, keep its placement/size correct as the page or an
// ancestor (a modal body) scrolls, or the viewport resizes. Capture-phase
// catches scrolls on any ancestor, not just the window (R1.10).
function onViewportChange() {
  if (isOpen.value) updatePlacement()
}

onMounted(() => {
  mounted.value = true
  document.addEventListener('mousedown', onDocumentMousedown)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
  window.visualViewport?.addEventListener('resize', onViewportChange)
  window.visualViewport?.addEventListener('scroll', onViewportChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentMousedown)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
  window.visualViewport?.removeEventListener('resize', onViewportChange)
  window.visualViewport?.removeEventListener('scroll', onViewportChange)
})

watch(() => props.disabled, (disabled) => {
  if (disabled) close()
})

// Keep the input text in sync when a single-select model changes from outside.
watch(singleValue, (value) => {
  if (!props.multiple) query.value = value ?? ''
}, { immediate: true })

/** Split an option into [before, match, after] for highlight rendering. */
function highlightParts(option: string): [string, string, string] {
  const q = query.value.trim()
  if (!q || (!props.multiple && q === singleValue.value)) return [option, '', '']
  const at = option.toLowerCase().indexOf(q.toLowerCase())
  if (at === -1) return [option, '', '']
  return [option.slice(0, at), option.slice(at, at + q.length), option.slice(at + q.length)]
}

defineExpose({
  /** Run the `rules` now and show/clear the message; returns validity (R8.5). */
  validate: runValidation,
  /** Move focus to the text input. */
  focus: () => inputEl.value?.focus(),
})
</script>

<template>
  <div
    ref="rootEl"
    class="auto-combo"
    :class="{
      'auto-combo--disabled': disabled,
      'auto-combo--error': invalid,
    }"
  >
    <label v-if="label && !hideLabel" class="ac-label" :for="inputId">{{ label }}</label>
    <div class="ac-field">
      <div ref="controlEl" class="ac-control" @mousedown="onControlMousedown">
        <span v-if="$slots.prefix" class="ac-prefix">
          <slot name="prefix" />
        </span>
        <template v-if="multiple && chips">
          <span v-for="value in selectedValues" :key="value" class="ac-chip">
            <span class="ac-chip__text">{{ value }}</span>
            <button
              type="button"
              class="ac-chip__remove"
              :aria-label="`Remove ${value}`"
              :disabled="disabled"
              @mousedown.stop.prevent
              @click.stop="removeValue(value)"
            >
              &times;
            </button>
          </span>
        </template>
        <span v-else-if="multiple && hasSelection" class="ac-summary">
          {{ selectedValues.join(', ') }}
        </span>
        <input
          :id="inputId"
          ref="inputEl"
          class="ac-input"
          type="text"
          role="combobox"
          autocomplete="off"
          :value="query"
          :placeholder="shownPlaceholder"
          :disabled="disabled"
          :maxlength="maxlength"
          :aria-label="inputLabel"
          :aria-describedby="inputDescriptionIds"
          :aria-expanded="panelVisible"
          :aria-invalid="invalid ? 'true' : undefined"
          aria-autocomplete="list"
          :aria-controls="listboxId"
          aria-haspopup="listbox"
          :aria-activedescendant="activeDescendant"
          @input="onInput"
          @keydown="onKeydown"
          @focus="onFocus"
          @blur="onBlur"
        />
        <span
          v-if="selectedDescription"
          :id="selectedDescriptionId"
          class="ac-sr-only"
        >
          {{ selectedDescription }}
        </span>
        <span
          :id="statusId"
          class="ac-sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {{ statusText }}
        </span>
        <span v-if="loading" class="ac-spinner" aria-hidden="true" />
        <span v-if="$slots.suffix" class="ac-suffix">
          <slot name="suffix" />
        </span>
        <button
          v-if="clearable && hasSelection && !disabled"
          type="button"
          class="ac-clear"
          aria-label="Clear selection"
          @mousedown.stop.prevent
          @click.stop="clearAll"
        >
          &times;
        </button>
      </div>
      <Teleport :to="teleportTo" :disabled="teleportDisabled">
        <ul
          v-show="panelVisible"
          :id="listboxId"
          ref="listEl"
          class="ac-listbox"
          :class="{
            'ac-listbox--top': placement === 'top' && teleportDisabled,
            'ac-listbox--floating': !teleportDisabled,
          }"
          :style="panelStyle"
          role="listbox"
          :aria-multiselectable="multiple || undefined"
        >
          <li
            v-for="(item, index) in items"
            :id="`${uid}-opt-${index}`"
            :key="`${item.kind}:${item.value}`"
            class="ac-option"
            :class="{
              'ac-option--active': index === activeIndex,
              'ac-option--selected': item.kind === 'option' && isSelected(item.value),
              'ac-option--create': item.kind === 'create',
            }"
            role="option"
            :aria-selected="item.kind === 'option' && isSelected(item.value)"
            @mousedown.prevent
            @click="commitItem(item)"
            @mousemove="activeIndex = index"
          >
            <template v-if="item.kind === 'option'">
              <span class="ac-option__text">
                <template v-for="(part, i) in highlightParts(item.value)" :key="i">
                  <mark v-if="i === 1 && part" class="ac-match">{{ part }}</mark>
                  <template v-else>{{ part }}</template>
                </template>
              </span>
              <span v-if="isSelected(item.value)" class="ac-option__check" aria-hidden="true">✓</span>
            </template>
            <template v-else>
              <span class="ac-option__text">Add "{{ item.value }}"</span>
            </template>
          </li>
          <li v-if="!items.length && showNoResults" class="ac-empty" role="presentation">{{ noResultsText }}</li>
        </ul>
      </Teleport>
    </div>
    <div v-if="errorText || showCounter" class="ac-footer">
      <span v-if="errorText" :id="errorId" class="ac-error" role="alert">{{ errorText }}</span>
      <span
        v-if="showCounter"
        class="ac-counter"
        :class="{ 'ac-counter--limit': atCharLimit }"
        aria-hidden="true"
      >
        {{ counterText }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.auto-combo {
  --ac-border: #c8ccd4;
  --ac-border-focus: #4f6df5;
  --ac-bg: #fff;
  --ac-text: #1f2430;
  --ac-muted: #7a8194;
  --ac-chip-bg: #eef1ff;
  --ac-chip-text: #35439c;
  --ac-active-bg: #eef1ff;
  --ac-error: #cf3a3a;
  --ac-disabled-bg: #f3f4f6;
  --ac-shadow: 0 8px 24px rgba(15, 20, 40, 0.12);
  --ac-radius: 6px;
  --ac-font: inherit;

  position: relative;
  display: inline-block;
  min-width: 240px;
  font: var(--ac-font);
  color: var(--ac-text);
  text-align: left;
}

.ac-label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}

.ac-field {
  position: relative;
}

.ac-control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  min-height: 38px;
  background: var(--ac-bg);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  cursor: text;
  box-sizing: border-box;
}

.ac-control:focus-within {
  border-color: var(--ac-border-focus);
  outline: 2px solid color-mix(in srgb, var(--ac-border-focus) 30%, transparent);
  outline-offset: 1px;
}

.auto-combo--error .ac-control {
  border-color: var(--ac-error);
}

.auto-combo--error .ac-control:focus-within {
  outline-color: color-mix(in srgb, var(--ac-error) 30%, transparent);
}

.auto-combo--disabled .ac-control {
  background: var(--ac-disabled-bg);
  cursor: not-allowed;
}

.ac-input {
  flex: 1 1 60px;
  min-width: 60px;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  color: inherit;
  padding: 4px 0;
}

.ac-input::placeholder {
  color: var(--ac-muted);
}

.ac-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.ac-prefix,
.ac-suffix {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--ac-muted);
}

.ac-spinner {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border: 2px solid var(--ac-border);
  border-top-color: var(--ac-border-focus);
  border-radius: 50%;
  animation: ac-spin 0.7s linear infinite;
}

@keyframes ac-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ac-spinner {
    animation-duration: 1.6s;
  }
}

.ac-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 8px;
  background: var(--ac-chip-bg);
  color: var(--ac-chip-text);
  border-radius: calc(var(--ac-radius) - 2px);
  font-size: 0.875rem;
  line-height: 1.4;
}

.ac-chip__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.ac-chip__remove:hover,
.ac-chip__remove:focus-visible {
  background: color-mix(in srgb, var(--ac-chip-text) 15%, transparent);
}

.ac-chip__remove:focus-visible {
  outline: 2px solid var(--ac-border-focus);
  outline-offset: 1px;
}

.ac-summary {
  font-size: 0.9rem;
  color: var(--ac-text);
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ac-clear {
  border: none;
  background: transparent;
  color: var(--ac-muted);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}

.ac-clear:hover,
.ac-clear:focus-visible {
  color: var(--ac-text);
  background: color-mix(in srgb, var(--ac-text) 12%, transparent);
}

.ac-clear:focus-visible {
  outline: 2px solid var(--ac-border-focus);
}

.ac-footer {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.8125rem;
}

.ac-error {
  color: var(--ac-error);
}

.ac-counter {
  margin-left: auto;
  color: var(--ac-muted);
  font-variant-numeric: tabular-nums;
}

.ac-counter--limit {
  color: var(--ac-error);
}

.ac-listbox {
  position: absolute;
  z-index: 10;
  top: 100%;
  left: 0;
  right: 0;
  margin: 4px 0 0;
  padding: 4px;
  list-style: none;
  background: var(--ac-bg);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  box-shadow: var(--ac-shadow);
  box-sizing: border-box;
  /*
   * Size-to-fit: never taller than the design cap, and never taller than the
   * space actually available (set by JS as `--ac-available-height`). The panel
   * scrolls internally instead of overflowing its boundary.
   */
  max-height: min(var(--ac-listbox-max-height, 260px), var(--ac-available-height, 100vh));
  overflow-y: auto;
}

/* Flipped above the control when there isn't room below — in-place mode (R1.10). */
.ac-listbox--top {
  top: auto;
  bottom: 100%;
  margin: 0 0 4px;
}

/*
 * Teleported to `appendTo` (default <body>): position/size come from the inline
 * style pinning it to the control. A high z-index keeps it above modals and
 * overlays; override with `--ac-listbox-z`.
 */
.ac-listbox--floating {
  z-index: var(--ac-listbox-z, 9999);
}

.ac-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: calc(var(--ac-radius) - 2px);
  cursor: pointer;
}

.ac-option--active {
  background: var(--ac-active-bg);
}

.ac-option--selected {
  font-weight: 600;
}

.ac-option--create {
  font-style: italic;
  color: var(--ac-chip-text);
}

.ac-option__check {
  color: var(--ac-chip-text);
}

.ac-match {
  background: transparent;
  color: inherit;
  font-weight: 700;
  text-decoration: underline;
  text-decoration-color: var(--ac-border-focus);
}

.ac-empty {
  padding: 8px 10px;
  color: var(--ac-muted);
}
</style>
