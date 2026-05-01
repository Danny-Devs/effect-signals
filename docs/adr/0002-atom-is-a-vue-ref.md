# ADR-0002: Atom IS a Vue Ref (not a separate Atom type)

**Status:** Accepted
**Date:** 2026-04-30
**Supersedes:** none

## Context

The reference React bindings library is `@effect-atom/atom-react` by Tim Smart. Its core abstraction is the **Atom** — a separate, opaque type that wraps an Effect or Stream. Users access an atom's value via a hook: `const value = useAtomValue(atom)`. Every atom read site requires the wrapper.

This shape exists because React's snapshot reactivity model has no way to subscribe a component to a value without a hook (hook position determines subscription identity across re-renders). The Atom type is necessary to give the hook something opaque to subscribe to.

Vue's reactivity model is fundamentally different. A `Ref<T>` is *itself* a subscription identity. Vue's templates auto-unwrap refs (`{{ myRef }}` in `<template>` displays `myRef.value`). The reactivity proxy tracks dependencies automatically.

## Decision

**An atom IS a Vue `Ref<T>`.** The function `createAtom(source)` returns either `Ref<T>` (for plain values) or `Ref<T | undefined>` (for async sources). There is no separate Atom type. There is no `useAtomValue` wrapper.

```ts
// React (atom-react):
const counter = Atom.make(0) // Atom<number>
const value = useAtomValue(counter) // hook required to subscribe

// Vue (effect-vue):
const counter = createAtom(0) // Ref<number> — IS the subscription
// in template: {{ counter }}              — auto-unwrap, no wrapper
```

## Alternatives considered

- **Mirror atom-react verbatim:** introduce `Atom<A, E, R>` type + `useAtomValue(atom)` composable. Rejected — it imports React-specific friction into Vue without any benefit. Vue's reactivity already does what the wrapper does.
- **Hybrid: atom = ref + extra metadata:** introduce a wrapper that contains both a ref and metadata (fiber handle, layer, etc.). Rejected — leaks implementation details to users. The fiber+disposer should be private aggregate state, not user-visible.

## Consequences

**Positive:**
- **Zero boilerplate at every read site.** Templates show `{{ atom }}`, scripts read `atom.value`. No wrapper to import or call.
- **Composes with the entire Vue ecosystem for free.** VueUse, Pinia, vue-router — anything that takes a `Ref<T>` works with our atoms unchanged.
- **The architectural truth is honest.** The atom IS the ref. We are not lying about what it is for the sake of API symmetry with React.
- **Smaller bundle.** No wrapper functions to ship.

**Negative:**
- **Diverges from atom-react's mental model.** Users coming from atom-react may briefly look for `useAtomValue` — solved by clear docs.
- **Atoms backed by Effects with R != never can't preserve R at the type level when read.** The ref's type is `Ref<A | undefined>` — `R` is discharged at fiber-spawn time, not at read time. This was a v0.1.0 limitation captured in LESSONS.md and resolved in slice 2 via overload extension.

**Risks:**
- If we later want runtime introspection (devtools panel showing all live atoms), we need to track them in a registry separate from the refs themselves. Phase 3 — `@effect-vue/devtools` — will need this. Not a problem yet.
