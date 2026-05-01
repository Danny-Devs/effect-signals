# NON-GOALS.md — what effect-vue is NOT

> The most underrated spec doc. Without explicit non-goals, every feature request becomes plausible. With them, scope creep dies on contact.

## We are NOT a state management library

Pinia is Vue's state management library. It's good. We don't compete with it.

`createAtom(value)` is for *atomic reactive containers* tied to component scopes — closer to `ref()` than to a Pinia store. Use Pinia for app-wide state.

## We are NOT a query/mutation library

Pinia Colada is Vue's query library. `pinia-colada-effect` is the Effect-flavored bridge. Atoms are not queries. They don't have cache invalidation, retry policies (that's Schedule, used inside the Effect), or refetch semantics. They are reactive containers.

## We are NOT a Suspense replacement

Vue's Suspense is fine. We integrate with it (an atom can be awaited). We do not introduce a parallel boundary system. `<AtomBoundary>` (slice 3) is a thin error/loading wrapper, not a Suspense alternative.

## We are NOT a wholesale Effect-TS tutorial

We assume the user knows Effect basics — `Effect`, `Stream`, `Layer`, `Context.Tag`, `pipe`. Our docs explain Vue+Effect *integration*, not Effect itself. Users new to Effect should read effect.website first.

## We are NOT supporting Vue 2 or the options API

Vue 3 composition API only. Period. No `data()` blocks, no `methods` objects, no `mixins`. Vue 2 EOL was 2023; effect-vue starts in 2026.

## We are NOT bundling Effect-TS or Vue

Both are peer dependencies. Users provide their own versions. We pin loose ranges (`^3.x` for Effect, `^3.5` for Vue) and let pnpm dedupe.

## We will NOT add features just because Effect has them

Effect has `STM`, `Cluster`, `RPC`, `SQL`, `AI`, `OpenTelemetry`, etc. These have first-class places in Effect's ecosystem — but not all of them belong in `@effect-vue/core`. We add features only when they enable new Vue patterns. STM might land in `@effect-vue/core` (atomic multi-ref updates ARE genuinely missing in Vue). Cluster will not — it's a server primitive, lives in `@effect-vue/nuxt` if anywhere.

## We will NOT chase atom-react API parity

If a Vue idiom is cleaner, we use the Vue idiom. `useAtomValue(atom)` is React's necessity, not Vue's. We diverge with intent.

## We will NOT support React, Svelte, Solid, or Angular

This library is `effect-vue`. The name is descriptive. Other framework bindings are great, separate projects. We do not generalize prematurely.

## We will NOT replace VueUse

VueUse is a vast composable utility library. effect-vue does not duplicate it. If a VueUse composable solves the problem, we point users there.

## We will NOT solve transactional state

`STM` may land later, but for v0.1.0 we don't try. Vue's `ref` is single-cell; multi-cell atomic updates are out of scope.

## We will NOT generate types from Move / GraphQL / OpenAPI / SQL

Schema-driven type generation belongs in tooling (e.g., `gql.tada`, `drizzle-zod`). effect-vue accepts whatever types the user has and reactivity-wraps them.

## We will NOT add a global "configureEffectVue()" function

No global state. No registration. Each composable is independently usable. No magic.

## We will NOT prioritize options API users, Vue 2 users, or non-TypeScript users

This is a TypeScript-first library. JavaScript users can use it (TS types compile to nothing) but we do not make API decisions to accommodate untyped users.

## We will NOT add a CLI

No `effect-vue init`. No scaffolders. The library is small enough that a `pnpm add` + a snippet from the README is all anyone needs.
