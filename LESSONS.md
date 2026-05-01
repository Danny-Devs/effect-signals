# LESSONS.md — append-only failure log

> Every recurring mistake gets encoded so the next agent never makes it again. Append-only — never delete past lessons. Mark superseded entries with `[SUPERSEDED YYYY-MM-DD]` if a better fix is found, but leave history.

---

## [2026-04-30] — `createAtom` does not preserve Effect requirements `R`

**Mistake:** v0.1.0 `createAtom` overload is typed as `createAtom<A, E>(source: Effect.Effect<A, E>): Ref<A | undefined>`, which implicitly constrains `R = never`. Effects that require services (like `Effect.flatMap(Greeter, g => g.hello())` with `R = Greeter`) do not match this overload — they fall through to the plain-value overload, returning `Ref<Effect<...>>` instead of `Ref<A | undefined>`. Users who want services-requiring Effects must cast unsoundly: `as Effect.Effect<string, never, Greeter>`. The runtime works (because the injected `ManagedRuntime<R, never>` provides the services) but the types lie.

**Why it happened:** Slice 1 prioritized shipping the simplest case (R = never) and the Layer DI test case used a cast as a workaround. Casting masked the absence of a typed contract for R-tracking. Atom-react solves this by typing atoms as `Atom<A, E, R>` and requiring the user-provided runtime to satisfy R at the type level — a more elaborate design we deferred.

**Fix (slice 2):** Extend the createAtom overload set (pseudocode shown as ambient declarations):

```text
// Plain value
declare function createAtom<A>(source: A): Ref<A>

// Effect with no requirements
declare function createAtom<A, E>(source: Effect.Effect<A, E, never>): Ref<A | undefined>

// Effect with requirements R — runtime must satisfy R
declare function createAtom<A, E, R>(
  source: Effect.Effect<A, E, R>,
  runtime: ManagedRuntime.ManagedRuntime<R, never>,
): Ref<A | undefined>

// Stream variants follow the same pattern
```
Then `injectAtomRuntime<R>()` becomes typed-tight, and users either pass the runtime explicitly OR have the inject path constrain R.

**For future agents:** when adding any composable that runs Effects, **explicitly model the `R` (requirements) generic parameter** in the type signature. Do not paper over it with casts. The type system is the boundary contract — if it's lying, the contract is broken.

---
