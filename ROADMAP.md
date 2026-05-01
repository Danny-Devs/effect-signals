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

- ✅ `familyAtom(keyFn)` — parametric atom factories. SHIPPED 2026-04-30. Captures parent scope at family-creation time; `family(key)` is safe from any context (event handlers, microtasks, watchers).
- ✅ `<AtomBoundary>` async-state slot dispatcher. SHIPPED 2026-04-30. defineComponent + setup-returned render fn; ZERO `h()` calls; permitted by ADR-006's INV-9 clarification. 5 tests.
- ⏳ Pattern Matching primitive (Effect.Match → template-friendly composable) — NOT STARTED
- 📋 Effect-aware `deriveAtom` (if user demand emerges) — DEFERRED
- 📋 DevTools breadcrumb hooks (interfaces only — actual panel deferred to `@effect-vue/devtools` Phase 3) — NOT STARTED

Slice 3 is roughly 2/3 done. Bundle: 4.01 KB raw / 1.05 KB gzip (verify with `pnpm --filter '@effect-vue/core' build`). Tests: 21 passing.

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

## Strategic context

These are durable insights that inform the roadmap but aren't roadmap items. Migrated here from HANDOFF.md (April 30 2026) because they would otherwise vanish on the next handoff overwrite.

### Vue Vapor compatibility

`effect-vue` uses ONLY composition API + reactivity primitives. Forward-compatible with Vapor by construction. No work required when Vapor goes GA. Verify by ensuring INV-9 (no VDOM-specific imports in core) holds in CI.

### Performance characteristics in Vapor

In a Vapor app, every reactive primitive becomes a fine-grained signal. Atoms are first-class signals — atom updates trigger only the specific DOM nodes that read them, not entire component subtrees. **`effect-vue` perf characteristics improve in Vapor**, not regress. Strategic upside for marketing/positioning.

### YouTube content angle (v0.1.0 launch)

"Why effect-vue is smaller and clearer than effect-react" — the Vue port is architecturally cleaner because Vue's push-based reactivity aligns with Effect's push-based runtime, while React's snapshot-rerender model fights it. Use this framing for the v0.1.0 launch post and the YouTube video.

### Bet on Effect-TS adoption curve

Effect-TS is gaining mainstream momentum in 2026. When it crosses the chasm (~2027), `effect-vue` is the natural Vue bridge that's already there. Timing is good — first-mover position with no Vue+Effect competitors as of April 2026.

### Sibling ecosystem (separate repos, NOT under @effect-vue scope)

- `pinia-colada-effect` — Effect-flavored Pinia Colada bridge
- `pinia-colada-effect-storage` — IDB / OPFS / SQLite-WASM as Effect Layers
- `@dannydevs/dapp-kit-vue` — Sui dapp-kit dogfoods effect-vue

These consume effect-vue but are not part of its scope. See ADR-0002 and PRINCIPLES.md item 12.

## Anti-roadmap (things explicitly NOT planned)

- React, Solid, Svelte, Angular bindings (separate projects, separate maintainers)
- A "Vue ↔ Effect" cheatsheet generator
- A bundled state management story (Pinia is fine)
- A bundled query library (Pinia Colada + `pinia-colada-effect` is fine)
- An effect-vue CLI
