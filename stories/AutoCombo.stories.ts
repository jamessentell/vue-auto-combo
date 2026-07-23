import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import AutoCombo from '../src/AutoCombo.vue'
import type { AutoComboValue } from '../src/AutoCombo.vue'
import './theming.css'

/** Number of selected values regardless of single/multi mode. */
const selectionCount = (value: AutoComboValue) =>
  Array.isArray(value) ? value.length : value ? 1 : 0

const FRUITS = [
  'Apple',
  'Apricot',
  'Banana',
  'Blackberry',
  'Blueberry',
  'Cherry',
  'Dragonfruit',
  'Grape',
  'Grapefruit',
  'Kiwi',
  'Lemon',
  'Lime',
  'Mango',
  'Nectarine',
  'Orange',
  'Papaya',
  'Peach',
  'Pear',
  'Pineapple',
  'Plum',
  'Raspberry',
  'Strawberry',
  'Watermelon',
]

const meta: Meta<typeof AutoCombo> = {
  title: 'Components/AutoCombo',
  component: AutoCombo,
  tags: ['autodocs'],
  args: {
    options: FRUITS,
    label: 'Fruit',
    placeholder: 'Search fruit…',
  },
  argTypes: {
    modelValue: { control: false },
    filter: { control: false },
    rules: { control: false },
  },
}

export default meta
type Story = StoryObj<typeof AutoCombo>

/** Renders the component with a live v-model binding and shows the bound value below it. */
function bound(initial: string | string[] | null): Story['render'] {
  return (args) => ({
    components: { AutoCombo },
    setup() {
      const value = ref<string | string[] | null>(initial)
      // Reset the model when the multiple control is toggled, so the type stays valid.
      watch(
        () => args.multiple,
        (multiple) => {
          value.value = multiple ? [] : null
        },
      )
      return { args, value }
    },
    template: `
      <div style="min-height: 320px; font-family: system-ui, sans-serif;">
        <AutoCombo v-bind="args" v-model="value" />
        <p style="margin-top: 1rem; color: #666; font-size: 0.85rem;">
          v-model: <code>{{ JSON.stringify(value) }}</code>
        </p>
      </div>
    `,
  })
}

export const SingleSelect: Story = {
  render: bound(null),
  args: {},
}

export const MultiSelectChips: Story = {
  render: bound(['Apple', 'Kiwi']),
  args: {
    multiple: true,
    chips: true,
  },
}

export const MultiSelectSummary: Story = {
  name: 'Multi-select (no chips)',
  render: bound(['Apple', 'Kiwi']),
  args: {
    multiple: true,
    chips: false,
  },
}

export const FreeTextSingle: Story = {
  name: 'Free text (single)',
  render: bound(null),
  args: {
    freeText: true,
    placeholder: 'Pick a fruit or type your own…',
  },
}

export const FreeTextNoAddRow: Story = {
  name: 'Free text without "Add" row',
  render: bound(null),
  args: {
    freeText: true,
    createOption: false,
    placeholder: 'Type anything, Enter commits when nothing matches…',
  },
}

export const FreeTextTags: Story = {
  name: 'Free text tags (multi + chips)',
  render: bound(['Apple']),
  args: {
    multiple: true,
    chips: true,
    freeText: true,
    placeholder: 'Add tags…',
  },
}

export const MaxSelections: Story = {
  render: bound([]),
  args: {
    multiple: true,
    maxSelections: 3,
    label: 'Pick up to 3 fruits',
  },
}

export const StartsWithFilter: Story = {
  name: 'Custom filter (startsWith)',
  render: bound(null),
  args: {
    filter: (option: string, query: string) =>
      option.toLowerCase().startsWith(query.toLowerCase()),
  },
}

export const Disabled: Story = {
  render: bound(['Apple', 'Cherry']),
  args: {
    multiple: true,
    disabled: true,
  },
}

export const OpenOnFocusDisabled: Story = {
  name: 'openOnFocus: false',
  render: bound(null),
  args: {
    openOnFocus: false,
    placeholder: 'Type or press ↓ to open',
  },
}

export const Validation: Story = {
  name: 'Validation (rules)',
  render: bound([]),
  args: {
    multiple: true,
    label: 'Pick 2 to 4 fruits',
    rules: [
      (value: AutoComboValue) => selectionCount(value) > 0 || 'Pick at least one fruit',
      (value: AutoComboValue) => selectionCount(value) >= 2 || 'Pick at least 2 fruits',
      (value: AutoComboValue) => selectionCount(value) <= 4 || 'No more than 4 fruits',
    ],
  },
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const PrefixIconButton: Story = {
  name: 'Prefix / suffix slots',
  render: (args) => ({
    components: { AutoCombo },
    setup() {
      const value = ref<string | null>(null)
      const month = ref<string | null>(null)
      return { args, value, month, MONTHS }
    },
    template: `
      <div style="min-height: 320px; display: flex; flex-direction: column; gap: 1.5rem; font-family: system-ui, sans-serif;">
        <div>
          <AutoCombo v-bind="args" v-model="value">
            <template #prefix>
              <button
                type="button"
                aria-label="Scan barcode"
                style="display: inline-flex; border: none; background: none; padding: 4px; cursor: pointer; border-radius: 4px;"
                @click="value = 'Mango'"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.5" y2="16.5" />
                </svg>
              </button>
            </template>
            <template #suffix>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l2.4 6.9H22l-5.8 4.4 2.2 6.9-6.4-4.2-6.4 4.2 2.2-6.9L2 8.9h7.6z" />
              </svg>
            </template>
          </AutoCombo>
          <p style="margin-top: 0.5rem; color: #666; font-size: 0.85rem;">
            The magnifier is a real <code>&lt;button&gt;</code> (clicking it selects Mango without
            stealing focus into the input); the star is decorative suffix content.
          </p>
        </div>
        <div>
          <AutoCombo v-model="month" :options="MONTHS" label="Month" placeholder="Pick a month…">
            <template #prefix>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </template>
          </AutoCombo>
          <p style="margin-top: 0.5rem; color: #666; font-size: 0.85rem;">
            The calendar icon is plain decorative prefix content: clicking it focuses the input
            and opens the dropdown, like clicking anywhere else in the control.
          </p>
        </div>
      </div>
    `,
  }),
  args: {
    placeholder: 'Search fruit…',
  },
}

export const Loading: Story = {
  render: bound(null),
  args: {
    loading: true,
    placeholder: 'Spinner shows while loading is true…',
  },
}

export const CharacterCounter: Story = {
  name: 'Character counter',
  render: bound(null),
  args: {
    freeText: true,
    showCounter: true,
    maxlength: 20,
    placeholder: 'Max 20 characters…',
  },
}

export const InModalFlipsUp: Story = {
  name: 'Inside a modal (flips up near the bottom)',
  render: (args) => ({
    components: { AutoCombo },
    setup() {
      const value = ref<string | null>(null)
      return { args, value }
    },
    // A fixed-height, overflow-clipped container stands in for a modal body.
    // The field sits near the bottom edge, so opening the dropdown flips it
    // above the input instead of being clipped off (R1.10).
    template: `
      <div style="font-family: system-ui, sans-serif;">
        <div style="height: 260px; overflow-y: auto; border: 1px solid #d0d4dd; border-radius: 10px; padding: 16px; background: #fff;">
          <p style="margin: 0 0 180px; color: #666; font-size: 0.85rem;">
            Scrollable container (like a modal body). The field is near the bottom edge,
            so opening the dropdown flips it above the input instead of clipping it.
          </p>
          <AutoCombo v-bind="args" v-model="value" />
        </div>
        <p style="margin-top: 1rem; color: #666; font-size: 0.85rem;">
          v-model: <code>{{ JSON.stringify(value) }}</code>
        </p>
      </div>
    `,
  }),
  args: {
    label: 'Fruit',
    placeholder: 'Open me — the list flips up',
  },
}

// --- Styling (see stories/Styling.mdx for the full class/variable reference) ---

export const ThemingDark: Story = {
  name: 'Theming (CSS custom properties)',
  render: bound(['Kiwi']),
  args: {
    multiple: true,
    chips: true,
    label: 'Fruit (dark theme)',
  },
  decorators: [
    (story) => ({
      components: { story },
      template: `
        <div class="theming-demo--dark">
          <story />
        </div>
      `,
    }),
  ],
}

export const ThemingCompactPill: Story = {
  name: 'Theming (compact + pill radius)',
  render: bound(null),
  args: {
    label: 'Fruit (pill style)',
    placeholder: 'Search fruit…',
  },
  decorators: [
    (story) => ({
      components: { story },
      template: `
        <div class="theming-demo--compact-pill">
          <story />
        </div>
      `,
    }),
  ],
}
