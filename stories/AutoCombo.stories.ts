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

export const AppendToComparison: Story = {
  name: 'appendTo — body vs self',
  render: () => ({
    components: { AutoCombo },
    setup() {
      const teleported = ref<string | null>(null)
      const inline = ref<string | null>(null)
      return { teleported, inline, FRUITS }
    },
    // Two identical `overflow: hidden` boxes; only `appendTo` differs. Open each
    // field to compare: 'body' (default) teleports the panel out of the box, so
    // it floats on top and extends past the box — over the content below —
    // escaping the box's overflow and stacking context. 'self' renders the panel
    // inside the box, so size-to-fit keeps it within the box and it scrolls
    // internally (never covering the content below). (R1.11)
    template: `
      <div style="display: flex; gap: 40px; padding: 24px; font-family: system-ui, sans-serif;">
        <div style="width: 280px;">
          <h3 style="margin: 0 0 4px; font-size: 0.9rem;">appendTo: 'body' <span style="color:#888;font-weight:400;">(default)</span></h3>
          <p style="margin: 0 0 10px; color: #666; font-size: 0.8rem;">Teleports out — floats on top, escapes the box.</p>
          <div style="height: 120px; overflow: hidden; border: 1px solid #d0d4dd; border-radius: 8px; padding: 12px; background: #fbfbfd;">
            <AutoCombo :options="FRUITS" v-model="teleported" append-to="body" label="Fruit" placeholder="Open me" />
          </div>
          <div style="margin-top: 8px; padding: 10px 12px; background: #eef1ff; border-radius: 6px; font-size: 0.8rem; color: #35439c;">Content below the box — the panel floats over this.</div>
        </div>
        <div style="width: 280px;">
          <h3 style="margin: 0 0 4px; font-size: 0.9rem;">appendTo: 'self'</h3>
          <p style="margin: 0 0 10px; color: #666; font-size: 0.8rem;">Renders in place — stays inside the box, scrolls.</p>
          <div style="height: 120px; overflow: hidden; border: 1px solid #d0d4dd; border-radius: 8px; padding: 12px; background: #fbfbfd;">
            <AutoCombo :options="FRUITS" v-model="inline" append-to="self" label="Fruit" placeholder="Open me" />
          </div>
          <div style="margin-top: 8px; padding: 10px 12px; background: #eef1ff; border-radius: 6px; font-size: 0.8rem; color: #35439c;">Content below the box — the panel never reaches this.</div>
        </div>
      </div>
    `,
  }),
  // Top-align the canvas so the 'body' panel has room below and opens downward,
  // clearly extending past its box.
  parameters: { layout: 'fullscreen' },
}

export const FlipComparison: Story = {
  name: 'Flip — opens down vs flips up',
  render: () => ({
    components: { AutoCombo },
    setup() {
      const down = ref<string | null>(null)
      const up = ref<string | null>(null)
      return { down, up, FRUITS }
    },
    // `appendTo: 'self'` bounds the flip to each box, so the direction is
    // deterministic regardless of the viewport: a field near the top has room
    // below and opens downward; a field near the bottom has none and flips up.
    // Both are sized to the space available and scroll internally (R1.10).
    template: `
      <div style="display: flex; gap: 40px; padding: 24px; font-family: system-ui, sans-serif;">
        <div style="width: 280px;">
          <h3 style="margin: 0 0 10px; font-size: 0.9rem;">Room below → opens down</h3>
          <div style="height: 220px; overflow: auto; border: 1px solid #d0d4dd; border-radius: 8px; padding: 12px; background: #fbfbfd;">
            <AutoCombo :options="FRUITS" v-model="down" append-to="self" label="Fruit" placeholder="Opens downward" />
            <div style="height: 150px;"></div>
          </div>
        </div>
        <div style="width: 280px;">
          <h3 style="margin: 0 0 10px; font-size: 0.9rem;">No room below → flips up</h3>
          <div style="height: 220px; overflow: auto; border: 1px solid #d0d4dd; border-radius: 8px; padding: 12px; background: #fbfbfd;">
            <div style="height: 150px;"></div>
            <AutoCombo :options="FRUITS" v-model="up" append-to="self" label="Fruit" placeholder="Flips upward" />
          </div>
        </div>
      </div>
    `,
  }),
  parameters: { layout: 'centered' },
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
