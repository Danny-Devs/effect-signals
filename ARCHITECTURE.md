# ARCHITECTURE.md — how effect-vue actually works

> Living document. Updated alongside CHANGELOG.md when changes are architectural.
>
> Each subsystem section includes: STATUS (LIVE/STUB/DEPRECATED), FLOW (one-line data flow), SOURCE (file + section), LAST VERIFIED (date).

## Bounded contexts (DDD)

effect-vue decomposes into nine bounded contexts. Each owns a clear responsibility, has well-defined boundaries, and may evolve independently.

| # | Context | Owns | Concretely |
|---|---|---|---|
| 1 | **Atoms** | Reactive containers wrapping value/Effect/Stream | `createAtom` |
| 2 | **Runtime** | Effect runtime + Layer DI bridge | `provideAtomRuntime`, `injectAtomRuntime` |
| 3 | **Derivations** | Computed-style atom transformations | `deriveAtom` (slice 2) |
| 4 | **Async ergonomics** | Pending/error/data triple for async sources | `useAsyncAtom` ✅ slice 2 LIVE |
| 5 | **Families** | Parametric atom factories | `familyAtom` ✅ slice 3 LIVE |
| 6 | **Boundaries** | UI rendering of async-atom state via slot dispatch | `AtomBoundary` ✅ slice 3 LIVE |
| 7 | **Pattern matching** | Reactive Vue ↔ Effect.Match bridge | `useMatch` ✅ slice 3 LIVE |
| 8 | **Messaging** | Cross-component pub/sub on Effect.Hub | (deferred — `@effect-vue/messaging` future) |
| 9 | **Telemetry** | OpenTelemetry from browser | (deferred — `@effect-vue/telemetry` future) |

## Three-layer effect recursion

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Vue reactivity                                  │
│   - "effect" as in watchEffect                           │
│   - Synchronous value-propagation algebra                │
│   - Primitives: ref, computed, watch, effectScope        │
└─────────────────────────────────────────────────────────┘
                           ↑
                  bridge: createAtom
                  (sets ref.value when Effect resolves)
                           ↑
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Effect-TS                                       │
│   - "Effect" as in algebraic effect                      │
│   - Typed program-as-value runtime                       │
│   - Primitives: Effect, Stream, Layer, Fiber, Schedule   │
└─────────────────────────────────────────────────────────┘
```

Layer 2 (Pinia Colada side-effects) lives in the sibling `pinia-colada-effect` package. Both `@effect-vue/core` and `pinia-colada-effect` bridge from Layer 3 upward.

## Atoms — bounded context detail

**STATUS:** LIVE (slice 1 shipped)
**FLOW:** source (value | Effect | Stream) → Fiber spawned in injected runtime → Stream.runForEach or Effect.tap writes to Ref → onScopeDispose calls Fiber.interrupt
**SOURCE:** `packages/core/src/atom.ts` — `createAtom`
**LAST VERIFIED:** 2026-04-30

### Aggregate root: Atom

An atom IS a Vue `Ref<A>` or `Ref<A | undefined>`. There is no separate "Atom" type. The aggregate consists of:
- The `Ref` itself (the public surface)
- The `Fiber` (private, owned by createAtom)
- The `onScopeDispose` registration (private, ties fiber to scope)

These three are created together, owned together, disposed together. They are the unit of consistency.

### Domain events

- `atom.created(source)` — fired by `createAtom` invocation
- `atom.resolved(value)` — fired when source produces a value (for Effect/Stream sources)
- `atom.failed(error)` — fired when source fails (only surfaced via `useAsyncAtom`)
- `atom.disposed` — fired when surrounding effectScope ends

(Events are conceptual — not literally emitted on a bus. They describe the lifecycle vocabulary used in tests and specs.)

## Families — bounded context detail

**STATUS:** LIVE (slice 3 first composable shipped — boundaries + matching + DevTools still pending in slice 3)
**FLOW:** factory + (key) → cache lookup → (miss: factory(key) → createMember runs in captured parent scope; hit: return cached Ref)
**SOURCE:** `packages/core/src/familyAtom.ts` — `familyAtom`
**LAST VERIFIED:** 2026-04-30

### Aggregate root: Family

A family is a closure over three pieces of state captured at `familyAtom` call time:
- the cache `Map<K, Ref<A> | Ref<A | undefined>>` (lazy, populated on first access per key)
- the parent `EffectScope` (captured via `getCurrentScope()`)
- the resolved runtime (captured via `runtimeOverride ?? injectAtomRuntime<R>()`)

These three are immutable for the life of the family. The family function itself has no identity — it's a thin closure over the cache.

### Why runtime is captured at family-creation time

Vue's `inject()` only works inside `setup()` or a functional component's render function. If `familyAtom` deferred runtime resolution to per-key calls, calling `family(k)` from an event handler, watcher, or microtask would crash. By resolving the runtime once at family-creation time and capturing it in closure, `family(k)` is safe to call from anywhere — the family carries its own DI context.

### Why parent scope is captured at family-creation time

Each cached atom's fiber needs cleanup tied to the family's lifetime, NOT the call-site's lifetime. If `family(k)` were called from a transient child scope (e.g., inside a temporary `effectScope`), the atom's fiber would be interrupted prematurely while the family still expected it cached. Running member creation inside `parentScope.run(() => createMember(...))` ensures every member's `onScopeDispose` registers with the family's scope.

## Boundaries — bounded context detail

**STATUS:** LIVE (slice 3 second composable shipped)
**FLOW:** state.pending/error/data reactive reads → setup-returned render fn → slot dispatch (one of `pending` / `error({error})` / `default({data})`) → user's slot template renders to VNode/Vapor block
**SOURCE:** `packages/core/src/AtomBoundary.ts` — `AtomBoundary`
**LAST VERIFIED:** 2026-04-30

### Aggregate root: AtomBoundary

A defineComponent-wrapped reactive renderer over `AsyncAtomState<A, E>`. Holds no state of its own; delegates rendering to one of three user-provided slots based on the state-reading branch chosen at render time. The setup function returns a closure-captured render function — all reactivity lives in Vue's reactive system, not in the component.

### Why this is its own bounded context (not folded into Async ergonomics)

`useAsyncAtom` (context 4) owns the *state shape* — the `{data, error, pending}` triple's semantics, atomicity (INV-4), and lifecycle. AtomBoundary owns the *rendering policy* — how to map state to UI. Splitting them means useAsyncAtom can be consumed by template-only patterns (raw `v-if/v-else-if/v-else`) without dragging AtomBoundary into the bundle, and AtomBoundary can be replaced by a different rendering policy (e.g., a future Suspense-integrated boundary) without changing useAsyncAtom.

### Why defineComponent is permitted here despite INV-9

INV-9 forbids VDOM constructors (`h`, `createVNode`, etc.) but permits `defineComponent` per ADR-006 (2026-04-30). `defineComponent` is a runtime no-op type helper that returns its argument unchanged — it drags zero VDOM weight. The AtomBoundary implementation invokes user slots directly (`slots.pending?.()`) and returns the slot's return value, NEVER constructing VNodes itself. Vapor compatibility is preserved because all VNode creation happens upstream (in user templates that get compiled to Vapor blocks).

## Pattern matching — bounded context detail

**STATUS:** LIVE (slice 3 third composable shipped)
**FLOW:** source ref/computed → user-provided matcher fn → computed wrapper → ComputedRef of result
**SOURCE:** `packages/core/src/useMatch.ts` — `useMatch`
**LAST VERIFIED:** 2026-04-30

### Aggregate root: useMatch

The thinnest-possible bridge between Vue's reactive `Ref` and Effect-TS's `Match` pattern-matching DSL. Implementation is one line: `computed(() => matcher(source.value))`. The semantic value is real despite the implementation triviality:
- Documents the *intent* (this is a pattern-match, not arbitrary derivation) so codebases stay self-documenting
- Provides a unified mental model alongside `createAtom` / `useAsyncAtom` / `familyAtom` / `AtomBoundary`
- Surfaces a hook for future enhancements (memoization keyed on tag, telemetry, etc.) without requiring users to refactor call sites

### Why useMatch does NOT impose Effect.Match on the matcher type

The matcher is typed `(input: I) => A` rather than `Matcher<I, ..., A>` from Effect's type universe. This lets users:
- Build the matcher with `Match.value(input).pipe(...)` inline (the canonical Effect pattern)
- Pre-build a reusable matcher with `Match.type<I>().pipe(...)` and pass it directly (since the resulting Matcher is callable as a function)
- Use a plain switch expression or ternary chain when Effect.Match is overkill

The composable does NOT require `effect/Match` to be imported by the user. Effect.Match is the recommended pattern but not enforced at the type level.

### Why useMatch does NOT cross multiple refs

Multi-ref derivations are what Vue's `computed` is for. useMatch's single-source-ref signature is deliberately narrow — adding multi-ref support would dilute the semantic ("this is pattern-matching on ONE state").

## Runtime — bounded context detail

**STATUS:** LIVE (slice 1 shipped, hardened slice 3)
**FLOW:** parent's `provideAtomRuntime(layer)` → ManagedRuntime.make(layer) → Vue.provide(SYMBOL, runtime) → child's `injectAtomRuntime()` → atom uses runtime.runFork instead of Effect.runFork
**SOURCE:** `packages/core/src/runtime.ts` — `provideAtomRuntime`, `injectAtomRuntime`
**LAST VERIFIED:** 2026-04-30 (slice 3 hardened: `injectAtomRuntime` guards on `getCurrentInstance()` to avoid Vue's "inject() outside setup()" warning when called from standalone effectScope)

### Aggregate root: Runtime

A `ManagedRuntime.ManagedRuntime<R, never>` is the root. It wraps a Layer and exposes `runFork`. The runtime owns the Layer's resources; disposing the runtime cleans them up.

### Anti-corruption layer

The boundary between Effect's `Layer` and Vue's `provide`/`inject`:
- Effect's Layer is type-safe at construction
- Vue's `inject` returns `unknown` at the type level (defaulting to a typed key only when consumers specify)
- We use a typed `InjectionKey<ManagedRuntime<unknown, never>>` symbol to bridge — the cast at the inject site is the only place type information is lost, and it's recovered by the user's generic parameter on `injectAtomRuntime<R>()`

## Data flow — atoms with injected runtime

```
┌──────────────────────────────────────────────────────┐
│ Parent component setup()                              │
│   const runtime = provideAtomRuntime(MyLayer)         │
│   provide(ATOM_RUNTIME_KEY, runtime)                  │
└──────────────────────────────────────────────────────┘
                        │
                        ↓
┌──────────────────────────────────────────────────────┐
│ Child component setup()                               │
│   const greeting = createAtom(                        │
│     Effect.flatMap(MyService, s => s.hello())         │
│   )                                                   │
│                                                       │
│   Internally:                                         │
│     1. injectAtomRuntime() → MyLayer's runtime        │
│     2. runtime.runFork(program with tap → ref.value)  │
│     3. onScopeDispose(() => Fiber.interrupt(fiber))   │
│                                                       │
│   Returns: Ref<string | undefined>                    │
└──────────────────────────────────────────────────────┘
                        │
                        ↓
┌──────────────────────────────────────────────────────┐
│ Child template                                        │
│   <p>{{ greeting }}</p>                               │
│   ← Vue auto-unwraps the ref, displays "hello..."     │
└──────────────────────────────────────────────────────┘
```

## Dependencies

| External | Reason | Pinned to | Fallback if disappeared |
|---|---|---|---|
| `effect` | Core runtime; the whole point | `^3.x` peer-dep | None — would re-derive Effect runtime; entire library invalidated |
| `vue` | Target framework | `^3.5` peer-dep | None — would target a different framework |
| `tsdown` | Bundler (build tool only) | `^0.21` devDep | Switch to `unbuild` (antfu) |
| `vitest` | Test runner | `^2.x` devDep | Switch to `node:test` |
| `happy-dom` | DOM mock for tests | `^15.x` devDep | Switch to `jsdom` |
| `@vue/test-utils` | Component test utilities | `^2.4` devDep | Hand-roll mounting helpers |

## Future architecture (deferred packages)

### @effect-vue/nuxt (Phase 2)

Nitro middleware integration. Server-side runtime that survives across requests. Layer-aware request handlers as Effects. SSR atom hydration story.

### @effect-vue/devtools (Phase 3)

Vue DevTools panel showing live atom tree, fiber status, Layer graph, recent events. Inspired by atom-react devtools but using Vue DevTools' panel API.

### pinia-colada-effect (sibling project)

Effect-flavored bridge for Pinia Colada queries. Typed errors via Effect's `E` channel. Retry/timeout/backoff via `Schedule`. Cache via Effect's `Cache` primitive (optional).

### pinia-colada-effect-storage (sibling project)

Storage Layer abstractions: IndexedDB, OPFS, SQLite-WASM. Each is a `Layer.Layer<Storage, never>`. Bidirectional Schema codecs replace `JSON.stringify` + `as Type` casts.
