<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

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
  /** Accessible label. Rendered as a visible <label> unless `hideLabel` is set. */
  label?: string
  /** Accessible name used when no visible label is rendered. */
  ariaLabel?: string
  hideLabel?: boolean
  /** Open the dropdown when the input gains focus or is clicked. */
  openOnFocus?: boolean
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
  label: undefined,
  ariaLabel: undefined,
  hideLabel: false,
  openOnFocus: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | null]
  search: [query: string]
  open: []
  close: []
  select: [value: string]
  remove: [value: string]
  create: [value: string]
}>()

const uid = useId()
const inputId = `${uid}-input`
const listboxId = `${uid}-listbox`
const selectedDescriptionId = `${uid}-selected`
const statusId = `${uid}-status`

const rootEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLElement | null>(null)

const query = ref('')
const isOpen = ref(false)
const activeIndex = ref(-1)

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
})

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
  if (!items.value.length) return props.noResultsText
  const count = items.value.length
  return `${count} ${count === 1 ? 'suggestion' : 'suggestions'} available.`
})

const inputDescriptionIds = computed(() =>
  [
    selectedDescription.value ? selectedDescriptionId : '',
    statusText.value ? statusId : '',
  ].filter(Boolean).join(' ') || undefined,
)

function isSelected(value: string) {
  return selectedValues.value.includes(value)
}

function open() {
  if (props.disabled || isOpen.value) return
  isOpen.value = true
  activeIndex.value = items.value.length ? 0 : -1
  emit('open')
}

function close() {
  if (!isOpen.value) return
  isOpen.value = false
  activeIndex.value = -1
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

function onBlur(event: FocusEvent) {
  const next = event.relatedTarget as Node | null
  if (next && rootEl.value?.contains(next)) return
  closeAndReconcile()
}

function onControlMousedown(event: MouseEvent) {
  if (props.disabled) return
  if (event.target !== inputEl.value) {
    event.preventDefault()
    inputEl.value?.focus()
  }
  if (props.openOnFocus) open()
}

function onDocumentMousedown(event: MouseEvent) {
  if (!rootEl.value?.contains(event.target as Node)) closeAndReconcile()
}

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMousedown))

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
</script>

<template>
  <div ref="rootEl" class="auto-combo" :class="{ 'auto-combo--disabled': disabled }">
    <label v-if="label && !hideLabel" class="ac-label" :for="inputId">{{ label }}</label>
    <div class="ac-control" @mousedown="onControlMousedown">
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
        :aria-label="inputLabel"
        :aria-describedby="inputDescriptionIds"
        :aria-expanded="isOpen"
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
    <ul v-show="isOpen" :id="listboxId" ref="listEl" class="ac-listbox" role="listbox" :aria-multiselectable="multiple || undefined">
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
      <li v-if="!items.length" class="ac-empty" role="presentation">{{ noResultsText }}</li>
    </ul>
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

.auto-combo--disabled .ac-control {
  background: #f3f4f6;
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
  background: #eee;
}

.ac-clear:focus-visible {
  outline: 2px solid var(--ac-border-focus);
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
  box-shadow: 0 8px 24px rgba(15, 20, 40, 0.12);
  max-height: 260px;
  overflow-y: auto;
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
