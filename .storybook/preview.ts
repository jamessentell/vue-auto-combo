import type { Preview } from '@storybook/vue3-vite'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
      },
    },
    docs: {
      description: {
        component:
          'A dependency-free, accessible autocomplete / combo box for Vue 3. See spec.md for the full requirements.',
      },
    },
  },
}

export default preview
