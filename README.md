# effect-vue

Vue 3 bindings for [Effect-TS](https://effect.website).

> Status: pre-alpha. v0.1.0 in development.

## Why

Effect-TS gives you principled async, structured failure, typed DI, and resource safety. Vue gives you the cleanest reactivity primitive in the JS ecosystem. `effect-vue` is the glue.

## Install

```bash
pnpm add @effect-vue/core effect vue
```

`effect` and `vue` are peer dependencies — bring your own versions.

## Quick start

```ts
import { createAtom, useAsyncAtom } from "@effect-vue/core"
import { Effect } from "effect"

// Reactive container — atoms ARE Vue refs
const counter = createAtom(0)

// Auto-resolving async — Effects become refs
const greeting = createAtom(
  Effect.succeed("hello").pipe(Effect.delay("250 millis")),
)

// Typed errors via { data, error, pending }
const user = useAsyncAtom(
  Effect.tryPromise({
    try: () => fetch("/api/me").then(r => r.json()),
    catch: (e): Error => e instanceof Error ? e : new Error(String(e)),
  }),
)
```

```vue
<template>
  <p>{{ counter }}</p>
  <p>{{ greeting ?? "loading..." }}</p>
  <p v-if="user.pending.value">
    …
  </p>
  <p v-else-if="user.error.value">
    {{ user.error.value.message }}
  </p>
  <p v-else>
    {{ user.data.value }}
  </p>
</template>
```

## The 6 composables

| Export | Purpose |
|---|---|
| `createAtom(source)` | Wrap a value, `Effect`, or `Stream` as a `Ref` |
| `useAsyncAtom(effect)` | `{ data, error, pending }` triple with typed errors |
| `familyAtom(factory)` | Parametric atom factory; same key returns same `Ref` |
| `<AtomBoundary>` | Slot dispatcher over `useAsyncAtom`'s state |
| `useMatch(source, matcher)` | Reactive Vue ↔ `Effect.Match` bridge |
| `provideAtomRuntime(layer)` | Typed Layer DI via Vue's `provide`/`inject` |

## Examples

A live demo of all six composables: [`examples/basic`](./examples/basic). Run it locally with `pnpm example:basic`.

## Architecturally cleaner than the React port

- **No `.value` boilerplate in templates** — Vue auto-unwraps refs in `<template>`
- **provide/inject for Layer DI** — typed dependency injection, no manual provider wrapping
- **`onScopeDispose` for cleanup** — explicit fiber cancellation tied to Vue's effect scope
- **No dependency arrays** — Vue tracks deps via reactivity proxies
- **Async without Suspense** — Vue's reactivity tracks async natively
- **Vapor-forward by construction** — no VDOM-specific imports in core (per [INV-9](./INVARIANTS.md))

## Packages

| Package | Description | Status |
|---|---|---|
| [`@effect-vue/core`](./packages/core) | Atoms, runtime, composables | 🚧 v0.1.0 in development |
| [`@effect-vue/nuxt`](./packages/nuxt) | Nuxt server runtime integration | 📋 Phase 2 |
| [`@effect-vue/devtools`](./packages/devtools) | Vue DevTools panel | 📋 Phase 3 |

## Learn more

- [PRINCIPLES.md](./PRINCIPLES.md) — design philosophy
- [ARCHITECTURE.md](./ARCHITECTURE.md) — bounded contexts, data flow, three-layer effect recursion
- [NON-GOALS.md](./NON-GOALS.md) — what `effect-vue` is NOT (read this before filing a "missing feature" issue)
- [GLOSSARY.md](./GLOSSARY.md) — atom, runtime, layer, fiber, scope
- [`specs/`](./specs) — per-composable behavioral specifications
- [`docs/adr/`](./docs/adr) — architectural decision records

For Effect-TS itself: [effect.website](https://effect.website).

## License

MIT
