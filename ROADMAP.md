# ROADMAP.md — what's coming, in what order

> Slice-based delivery. Each slice ships green (build + test + typecheck + lint) and adds an Allium spec for every new composable.

## v0.1.0 — `@effect-vue/core` foundational layer

### Slice 1 — atoms + runtime ✅ SHIPPED 2026-04-30

- `createAtom(value | Effect | Stream)` — value path + Effect path implemented; Stream path stubbed
- `provideAtomRuntime(layer)` / `injectAtomRuntime()`
- 4 vitest cases passing
- Bundle: 1.42 kB (gzip 0.52 kB)

### Slice 2 — async ergonomics + R-tracking fix ✅ SHIPPED 2026-04-30

- ✅ Extended `createAtom` overload set to preserve Effect requirements `R` (LESSONS.md fix)
- ✅ `useAsyncAtom(effect)` — returns `{ data, error, pending }` ref triple
- ✅ Allium specs added (`useAsyncAtom.allium`, `createAtom.allium` updated)
- ✅ Witness test for INV-4 (pending precedes resolved with atomic transition)
- ⏭️ `deriveAtom(fn)` — DROPPED. For plain derivations, use Vue's `computed` directly. An Effect-aware `deriveAtom` (re-runs Effect when reactive deps change) is potentially valuable but defers to slice 3+ if user demand emerges.
- ⏭️ Pattern Matching — defers to slice 3+ (Effect.Match → template-friendly composable)
- Bundle: 2.11 kB (gzip 0.67 kB) — under 5 kB ceiling

### Slice 3 — families + boundaries + DevTools breadcrumbs

### Slice 3 — families + boundaries + Pattern Matching + DevTools breadcrumbs

- `familyAtom(keyFn)` — parametric atom factories (e.g., `userFamily(userId)` returns the same atom for the same userId)
- `<AtomBoundary>` SFC component for error/loading wrapping
- Pattern Matching primitive (Effect.Match → template-friendly composable) — investigation moved here
- Effect-aware `deriveAtom` (if user demand emerges)
- DevTools breadcrumb hooks (interfaces only — actual panel deferred to `@effect-vue/devtools` Phase 3)

### Slice 4 — examples + docs + publish

- `examples/basic` — full demo of all six composables
- `examples/nuxt-ssr` — Nuxt SSR example showing Layer-DI on server
- README polish + diagrams
- **Add `packages/effect-vue/`** as a meta-package that re-exports `@effect-vue/core`. This claims the bare `effect-vue` npm name (verified available 2026-04-30) and lets users `pnpm add effect-vue` for the simplest install.
- Publish `effect-vue` AND `@effect-vue/core` to npm in lockstep
- Blog post + YouTube video: "effect-vue is smaller and clearer than effect-react"

## Phase 2 — `@effect-vue/nuxt`

Independent package. Begins after v0.1.0 ships and gathers feedback.

- Nitro middleware: HTTP handlers as Effects
- Server-side runtime that survives across requests
- SSR atom hydration (atoms created on server, transferred to client, resumed)
- Layer-DI on server (e.g., `DatabaseLayer` provided once, used everywhere)

## Phase 3 — `@effect-vue/devtools`

Vue DevTools panel.

- Live atom tree view
- Per-atom: source, fiber status, last-resolved-at, value snapshot
- Layer graph visualization
- Recent atom events (resolved, failed, disposed) timeline

## Phase 4 — sibling projects (separate Linear issues, separate repos)

- `pinia-colada-effect` — Effect-flavored Pinia Colada bridge (DAN-423 scope)
- `pinia-colada-effect-storage` — IDB/OPFS/SQLite-WASM as Effect Layers (DAN-423 scope)
- `dapp-kit-vue` POC — dogfoods effect-vue (DAN-422)

## Phase 5 — content + community

- "Why effect-vue is smaller and clearer than effect-react" blog post (1.5K words)
- "effect-vue from scratch" YouTube video (12-15 min)
- Conf talk proposal: "Spec-engineered, AI-implemented Vue libraries" (could fold into AI Engineer Fair talk)
- Discord presence in Effect-TS server + Vue chat — answer questions, harvest feedback

## Versioning policy

- v0.1.x — slice 1-4 of `@effect-vue/core` only. Pre-1.0; minor breaking changes allowed.
- v0.2.x — `@effect-vue/nuxt` GA. Core API stabilizes.
- v1.0.0 — `@effect-vue/core` API frozen. Semver from this point.
- New packages (`devtools`, etc.) version independently.

## Anti-roadmap (things explicitly NOT planned)

- React, Solid, Svelte, Angular bindings (separate projects, separate maintainers)
- A "Vue ↔ Effect" cheatsheet generator
- A bundled state management story (Pinia is fine)
- A bundled query library (Pinia Colada + `pinia-colada-effect` is fine)
- An effect-vue CLI
