# GLOSSARY.md — ubiquitous language

> Terms used precisely. Every contributor and every AI agent agrees on these definitions.

## The three "effects"

This library sits at the intersection of three concepts that share the word "effect." Distinguishing them is foundational.

| Term | Meaning here | Lineage |
|---|---|---|
| **Vue effect** | A reactive computation that re-runs when its dependencies change (`watchEffect`, internal effects in `computed`/`watch`) | Vue 3 reactivity system |
| **Side-effect** | An observable interaction with the outside world (network, IO, mutation) | General programming term |
| **Effect** (capitalized) | A `Effect.Effect<A, E, R>` value from Effect-TS — a typed, lazily-described program that, when run, may produce a value of type `A`, fail with `E`, or require services `R` | Effect-TS / ZIO / Cats Effect |

When this library says "effect" without qualification, context determines which:
- "Effect-TS effect" or "Effect" = the typed program-as-value
- "Vue effect" = the reactive computation
- "side-effect" = the observable interaction

## Core terms

### Atom
A reactive container. Concretely: `Ref<A | undefined>` (for async sources) or `Ref<A>` (for plain values), produced by `createAtom`. Tied to a Vue effect scope; cleaned up on scope dispose.

> **NOT** an opaque "atom type" like in `@effect-atom/atom-react`. In effect-vue, an atom IS a Vue ref.

### Source
The argument to `createAtom`. One of: a plain value, an `Effect.Effect<A, E>`, or a `Stream.Stream<A, E>`.

### Runtime
A `ManagedRuntime.ManagedRuntime<R, never>` produced by `provideAtomRuntime(layer)`. Runs Effects within the scope of its provided Layer. Atoms in descendant components automatically use it. Inherited via Vue's `provide`/`inject`.

### Layer
A typed, composable description of services. From Effect-TS: `Layer.Layer<R, E, In>` — produces services of type `R`, may fail with `E`, requires services `In` to construct. Effect-vue accepts these directly via `provideAtomRuntime`.

### Fiber
A lightweight concurrent computation. Spawned when an atom is created from an `Effect` or `Stream`. Owns the work of executing the source. Lifecycle is bounded by the surrounding Vue effect scope.

### Scope
**Effect.Scope** in Effect-TS — bounds resource allocation/cleanup. **Vue.EffectScope** in Vue — bounds reactive effect ownership. effect-vue treats them as aligned: every Fiber lives within an Effect Scope, which is itself within a Vue EffectScope.

### Bridge
The conceptual mapping point where a Vue primitive meets an Effect-TS primitive. The three bridges in effect-vue:
1. **Stream → Ref bridge** — `Stream` emissions update a `Ref` via `Stream.runForEach`
2. **Layer → Vue.provide bridge** — `provideAtomRuntime` puts a `ManagedRuntime` into Vue's injection tree
3. **Scope → onScopeDispose bridge** — `onScopeDispose` calls `Fiber.interrupt` on the atom's fiber

### Composable
A Vue 3 composition API function (`useX`, `createX`, `provideX`, `injectX`). All effect-vue exports are composables.

## Atom states

For `createAtom` (slice 1, value/Effect/Stream sources):

| State | Meaning | `ref.value` |
|---|---|---|
| **pending** | Source spawned, no value yet (only async sources) | `undefined` |
| **resolved** | Source produced (most recent) value | the emitted value |
| **disposed** | Owning effectScope ended; fiber interrupted | observation from outside scope is undefined behavior |

For `useAsyncAtom` (slice 2, exposes typed errors):

| State | Meaning | `data` | `error` | `pending` |
|---|---|---|---|---|
| **idle** | Effect not yet started (lazy mode) | `undefined` | `undefined` | `false` |
| **pending** | Effect running | `undefined` | `undefined` | `true` |
| **resolved** | Effect succeeded | `A` | `undefined` | `false` |
| **failed** | Effect failed with typed error | `undefined` | `E` | `false` |

## Lifecycle terms

### Mount
A component's `setup()` runs. Its `effectScope` is created. Atoms created in `setup()` live within this scope.

### Dispose
The owning `effectScope` ends (component unmount, manual scope cleanup). All registered `onScopeDispose` handlers fire. Effect-vue's handler interrupts the atom's fiber.

## The three-layer effect recursion

This library composes three abstraction layers, each historically called "effect":

```
Vue reactivity     ← "effect" as in watchEffect (reactive computations)
   ↑
Pinia Colada       ← "effect" as in side-effects (queries / mutations)
   ↑
Effect-TS          ← "Effect" as in algebraic effect (typed program)
```

The `pinia-colada-effect` package is the bridge between layers 2 and 3. The `@effect-vue/core` package is the bridge between layers 1 and 3.
