// Used by `pnpm test:dist`: points the test suite at the built package in dist/
// instead of the source, so the suite checks what actually ships to npm.
export { AutoCombo as default } from '../dist/vue-auto-combo.js'
