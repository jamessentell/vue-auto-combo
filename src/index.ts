import type { App } from 'vue'
import AutoCombo from './AutoCombo.vue'

export { AutoCombo }
export type { AutoComboProps } from './AutoCombo.vue'

export default {
  install(app: App) {
    app.component('AutoCombo', AutoCombo)
  },
}
