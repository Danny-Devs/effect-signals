# ARCHITECTURE.md — how effect-vue actually works

> Living document. Updated alongside CHANGELOG.md when changes are architectural.
>
> Each subsystem section includes: STATUS (LIVE/STUB/DEPRECATED), FLOW (one-line data flow), SOURCE (file + section), LAST VERIFIED (date).

## Bounded contexts (DDD)

effect-vue decomposes into eight bounded contexts. Each owns a clear responsibility, has well-defined boundaries, and may evolve independently.

| # | Context | Owns | Concretely |
|---|---|---|---|
| 1 | **Atoms** | Reactive containers wrapping value/Effect/Stream | `createAtom` |
| 2 | **Runtime** | Effect runtime + Layer DI bridge | `provideAtomRuntime`, `injectAtomRuntime` |
| 3 | **Derivations** | Computed-style atom transformations | `deriveAtom` (slice 2) |
| 4 | **Async ergonomics** | Pending/error/data triple for async sources | `useAsyncAtom` (slice 2) |
| 5 | **Families** | Parametric atom factories | `familyAtom` (slice 3) |
| 6 | **Pattern matching** | Exhaustive view-state matching (Effect.Match → templates) | (investigated in slice 2, may land slice 3+) |
| 7 | **Messaging** | Cross-component pub/sub on Effect.Hub | (deferred — `@effect-vue/messaging` future) |
| 8 | **Telemetry** | OpenTelemetry from browser | (deferred — `@effect-vue/telemetry` future) |

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

## Runtime — bounded context detail

**STATUS:** LIVE (slice 1 shipped)
**FLOW:** parent's `provideAtomRuntime(layer)` → ManagedRuntime.make(layer) → Vue.provide(SYMBOL, runtime) → child's `injectAtomRuntime()` → atom uses runtime.runFork instead of Effect.runFork
**SOURCE:** `packages/core/src/runtime.ts` — `provideAtomRuntime`, `injectAtomRuntime`
**LAST VERIFIED:** 2026-04-30

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
