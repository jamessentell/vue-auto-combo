import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|js)', '../stories/**/*.mdx'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
}

export default config
