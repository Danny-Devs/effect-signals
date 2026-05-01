# effect-vue

Vue 3 bindings for [Effect-TS](https://effect.website).

> Status: pre-alpha. v0.1.0 in development.

## Why

Effect-TS gives you principled async, structured failure, typed DI, and resource safety. Vue gives you the cleanest reactivity primitive in the JS ecosystem. `effect-vue` is the glue.

## Packages

| Package | Description | Status |
|---|---|---|
| [`@effect-vue/core`](./packages/core) | Atoms, runtime, composables | 🚧 v0.1.0 in development |
| [`@effect-vue/nuxt`](./packages/nuxt) | Nuxt server runtime integration | 📋 Phase 2 |
| [`@effect-vue/devtools`](./packages/devtools) | Vue DevTools panel | 📋 Phase 3 |

## Why this is architecturally cleaner than the React port

- **No `.value` boilerplate in templates** — Vue auto-unwraps refs in `<template>`.
- **provide/inject > React Context for Layer DI** — typed dependency injection, no manual provider wrapping.
- **`onScopeDispose` for cleanup** — explicit fiber cancellation tied to Vue's effect scope.
- **No dependency arrays** — Vue tracks deps via reactivity proxies.
- **Async without Suspense** — Vue's reactivity tracks async natively.

## Quick start

```ts
import { createAtom } from "@effect-vue/core"
import { Effect } from "effect"

const greeting = createAtom(
  Effect.succeed("hello, effect-vue")
)

// in <template>: <h1>{{ greeting }}</h1>
```

## License

MIT
