# ADR-0005: R-preservation in createAtom and useAsyncAtom via overload set

**Status:** Accepted
**Date:** 2026-04-30
**Supersedes:** v0.1.0 limitation captured in LESSONS.md (2026-04-30)

## Context

Effect-TS's central type is `Effect.Effect<A, E, R>`:
- `A` — success type
- `E` — error channel
- `R` — required services (environment / DI)

When R = never, the Effect needs no services and can be run with `Effect.runFork(...)`. When R != never, it must be run via a `ManagedRuntime<R, never>` that provides the services.

Slice 1 shipped with createAtom typed as `createAtom<A, E>(source: Effect.Effect<A, E>): Ref<A | undefined>`, implicitly constraining R = never. Effects with services (like `Effect.flatMap(Greeter, g => g.hello())` where R = Greeter) did not match this overload — they fell through to the catch-all value overload, returning `Ref<Effect>` instead of `Ref<A | undefined>`.

The Layer-injection test worked at runtime because the implementation used `injectAtomRuntime()` to find a Greeter-providing runtime. But the user had to write an unsound cast `as Effect.Effect<string, never, Greeter>` to silence the type system. This is exactly the kind of "type system lying about runtime" pattern PRINCIPLES.md item 10 forbids.

## Decision

**Extend the overload set to express R explicitly. Three patterns per source kind (Effect, Stream):**

```text
// Pattern 1: R = never (existing v0.1.0 case)
createAtom<A, E>(source: Effect.Effect<A, E>): Ref<A | undefined>

// Pattern 2: R != never, runtime passed explicitly (TYPE-SAFE)
createAtom<A, E, R>(
  source: Effect.Effect<A, E, R>,
  runtime: ManagedRuntime.ManagedRuntime<R, never>,
): Ref<A | undefined>

// Pattern 3: R != never, relying on injected runtime (UNSAFE — runtime error if no provider)
createAtom<A, E, R>(source: Effect.Effect<A, E, R>): Ref<A | undefined>
```

Same pattern triple for Stream sources. Same pattern triple for `useAsyncAtom`.

**Overload declaration order matters.** The catch-all `<A>(source: A): Ref<A>` MUST come LAST so Effect/Stream-typed sources match the more specific overloads first.

## Alternatives considered

- **Atom-react style (preserve R in atom type):** would require introducing a separate `Atom<A, E, R>` type. Rejected by ADR-0002 — atoms are Refs in this library.
- **Always require explicit runtime:** would force every R-using user to pass `runtime` at every call site. Rejected as too much friction for ergonomic use.
- **Use TypeScript module augmentation to make `injectAtomRuntime` typed-tight:** explored. Vue's `inject` returns `unknown` and provide-side type information cannot propagate to inject sites at the type level. Cannot achieve full type-safety for the injected-runtime path; the unsafe overload is the necessary escape valve.
- **Throw at runtime if R != never and no runtime is provided:** done, but only as a fallback. The explicit-runtime path is the documented happy path for typed R.

## Consequences

**Positive:**
- Layer-injection test no longer needs the unsound cast — typecheck is clean.
- Users with R-using Effects have two clean paths: type-safe (pass runtime) or ergonomic (rely on injection).
- The unsafe overload is documented in JSDoc and Allium specs; users opt in knowingly.

**Negative:**
- More overloads = more API surface = slightly more cognitive load when reading the type signatures.
- The unsafe overload exists; users may write code that runtime-fails if they forget to provide a runtime. Mitigation: clear error message would help (slice 3 task — improve "no runtime provided for R-using Effect" error).

**Risks:**
- Future Vue + TypeScript work may introduce typed inject. If so, we can deprecate the unsafe overload in favor of the now-typed inject-based path. Watch Vue 3.6+ and `script setup` enhancements.
