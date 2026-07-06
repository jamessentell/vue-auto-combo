import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import AutoCombo from '../src/AutoCombo.vue'

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
