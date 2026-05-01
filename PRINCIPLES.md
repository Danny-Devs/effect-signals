# PRINCIPLES.md — design philosophy

> The "why" behind every API decision. When in doubt, return here.

## 1. Vue's reactivity is an algebra. Effect is a runtime semantics. Their composition is structural, not bolted-on.

Vue's `ref` / `computed` / `watch` form an algebra over reactive *values*. Effect-TS forms a runtime semantics over *programs* (typed value, typed error, typed environment). They live at different abstraction levels and compose naturally — Vue's effectScope ⊇ Effect's Scope ⊇ Effect's Fiber. Our job is to make the composition feel structural, not to invent a third abstraction.

## 2. Atoms are refs first, effects second.

A `createAtom(value)` returns a `Ref<T>`. Period. No `useAtomValue` wrapper, no subscription handle, no opaque atom type. The atom IS the ref. Vue's reactivity does the subscription. This is the single largest divergence from `atom-react` and the largest win.

## 3. Lifecycle = effectScope. Always.

Every fiber spawned by an atom is tied to the surrounding `effectScope` via `onScopeDispose`. There are no exceptions. There is no escape hatch. There are no orphan fibers. *(See INV-1 in INVARIANTS.md.)*

## 4. Layers are typed. provide/inject is the bridge, not the mental model.

The mental model is Effect's `Layer` — typed, composable, services-as-values. The implementation uses Vue's `provide`/`inject` because that's the runtime mechanism Vue offers. Users think in Layers; Vue plumbs them.

## 5. Bundle size is moat.

`@effect-vue/core` <5KB gzip is a hard ceiling. Every API addition must justify its bytes. We ship a runtime semantics layer, not a kitchen sink. Slice 1 shipped at 0.52KB gzip. **Don't blow it.**

## 6. Documentation is product.

Every public API has:
- A one-paragraph description in JSDoc
- A runnable example in the package README
- An entry in the live demo (`examples/basic`)
- A behavioral spec in `specs/*.allium`

Undocumented APIs are bugs.

## 7. Vapor-forward by construction.

We use only composition API + reactivity primitives that survive the Vue 3 → Vapor transition. We never depend on VDOM internals. When Vapor goes GA, effect-vue gets faster, not broken.

## 8. Test-first, always.

Red → green → refactor. Property tests for invariants. Integration tests for composables. We do not commit code without a test. We do not ship a feature without an `.allium` spec.

## 9. Don't reinvent atom-react. Diverge where Vue idioms are cleaner.

Tim Smart's `@effect-atom/atom-react` is prior art. Study it. Borrow what's good. Diverge where Vue's reactivity model offers a cleaner path. We are not a port; we are a peer.

## 10. Errors are values, not exceptions.

Effect models failure with typed `E` channels. We surface those typed errors as values in `useAsyncAtom`'s `error` ref. We do NOT throw across the Vue boundary. The user pattern-matches on `error.value` like any other ref.

## 11. The user owns the runtime.

`provideAtomRuntime` is opt-in. Atoms work without it (using `Effect.runFork` on the default runtime). Users who want typed DI provide a Layer; users who don't, don't pay the cost.

## 12. The library is small, the ecosystem is big.

`@effect-vue/core` is intentionally tiny. The full vision lives in two constellations:
- **The `@effect-vue/*` family** — packages we own under this scope: `@effect-vue/core`, `@effect-vue/nuxt`, `@effect-vue/devtools`. They co-evolve with this monorepo.
- **Sibling projects (separate repos, separate packages)** — `pinia-colada-effect`, `pinia-colada-effect-storage`, `@dannydevs/dapp-kit-vue`. These are independent libraries that *consume* effect-vue but are not part of its scope.

We resist the temptation to absorb everything into `@effect-vue/core`. Each package has a single, clear responsibility.

## Threat model (minimal, library-scoped)

- **Trust boundary:** atoms execute Effect programs in the user's runtime. The user trusts the Effects they pass. We do not sandbox.
- **Supply chain:** peer-dep-only on `effect` and `vue`. No transitive surprises. CI builds are reproducible.
- **Memory safety:** every fiber must be cleaned up by `onScopeDispose`. INV-1 enforces this. Failures here are *constitutional bugs*, not normal bugs.
