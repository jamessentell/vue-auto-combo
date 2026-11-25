import { getCurrentInstance } from 'vue'

type IdState = [prefix: string, next: number, boundaries: number]

// Per-app counters for Vue 3.4, keyed by app context so each app (and each SSR
// request, which creates a fresh app) counts from zero on server and client.
const counters = new WeakMap<object, number>()

function isIdState(ids: unknown): ids is IdState {
  return (
    Array.isArray(ids) &&
    ids.length === 3 &&
    typeof ids[0] === 'string' &&
    typeof ids[1] === 'number' &&
    typeof ids[2] === 'number'
  )
}

/**
 * A unique id for the current component instance, for wiring up ARIA
 * attributes. Must be called during `setup()`.
 *
 * This works like Vue 3.5's `useId()` without importing it. `useId` doesn't
 * exist on Vue 3.4, and naming it in an import (even through `import * as`)
 * breaks the package there: native ES module loaders refuse to link it and
 * webpack fails the build with "export 'useId' was not found in 'vue'".
 *
 * On Vue 3.5+ it draws from the same per-instance id state that `useId()`
 * uses, so ids stay SSR- and hydration-safe (async boundaries included) and
 * never collide with the app's own `useId()` calls. On Vue 3.4 it falls back
 * to a counter per app, which matches between server and client as long as
 * components set up in the same order. Either way the prefix is
 * `app.config.idPrefix`, defaulting to `v`.
 */
export function useUniqueId(): string {
  const instance = getCurrentInstance()
  if (!instance) throw new Error('[vue-auto-combo] useUniqueId() must be called during setup()')

  const prefix = (instance.appContext.config as { idPrefix?: string }).idPrefix || 'v'
  const ids = (instance as { ids?: unknown }).ids
  if (isIdState(ids)) return `${prefix}-${ids[0]}${ids[1]++}`

  const n = counters.get(instance.appContext) ?? 0
  counters.set(instance.appContext, n + 1)
  return `${prefix}-ac${n}`
}
