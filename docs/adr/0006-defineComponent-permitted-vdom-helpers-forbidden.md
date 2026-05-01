# ADR-006: `defineComponent` permitted in core; VDOM constructors forbidden

**Status:** Accepted
**Date:** 2026-04-30
**Supersedes:** N/A (clarifies INV-9, does not supersede prior ADR)

## Context

INV-9 ("No VDOM-specific imports") was authored during slice 1 with the wording:

> **Rule:** `@effect-vue/core` never imports `h`, `defineComponent` (in non-test code), or any VDOM-specific function. Vapor-forward by construction.

Slice 3's `<AtomBoundary>` is the first composable in `@effect-vue/core` that needs to be a *component* rather than a pure composable. A typed component definition with named slots (slot scopes carry generic types from `AsyncAtomState<A, E>`) requires either:
- `defineComponent({ ... })` (Vue 3's TS-inferring component factory), OR
- A plain object `{ setup, render }` (loses TS inference for slots), OR
- A `.vue` SFC (requires adding rolldown-plugin-vue to tsdown — significant build complexity)

The strict reading of INV-9 forbids `defineComponent` in non-test code. But on inspection: `defineComponent` is a **runtime no-op type helper**. Its implementation in Vue 3 source is approximately `(arg) => arg` — it returns its argument unchanged. The function exists purely for TypeScript inference (slot types, prop types, emit types). It drags zero VDOM weight into the bundle.

By contrast, `h(tag, props, children)` and `createVNode(...)` and `createElementVNode(...)` are the actual VDOM constructors. They allocate VNode objects, are NOT Vapor-compatible (Vapor compiles to direct DOM mutations, bypassing VNodes entirely), and represent the runtime cost INV-9 was written to prevent.

The original INV-9 wording conflated the *type helper* (`defineComponent`) with the *VDOM constructors* (`h`, `createVNode`, etc.) under the umbrella "VDOM-specific imports." This ADR splits them.

## Decision

INV-9 is clarified as follows:
- **FORBIDDEN in `@effect-vue/core/src`:** `h`, `createVNode`, `createElementVNode`, `createBlock`, `createElementBlock`, `Fragment`, `Text`, `Comment`, and any other Vue export from the `@vue/runtime-core` VDOM construction surface.
- **PERMITTED in `@effect-vue/core/src`:** `defineComponent`, `defineProps`, `defineEmits`, `defineSlots`, `getCurrentInstance`, `getCurrentScope`, `effectScope`, `onScopeDispose`, `provide`, `inject`, `ref`, `computed`, `watch`, `watchEffect`, and any Vue export that is either (a) a runtime no-op type helper or (b) part of Vue's reactivity / scope / DI system that is preserved in Vapor mode.

The principle: **forbid imports that produce VDOM nodes; permit imports that don't**.

`AtomBoundary` is implemented as `defineComponent({ setup() { return () => slots.pending?.() ?? slots.error?.({ error }) ?? slots.default?.({ data }) } })`. Slots are invoked as functions and their return values (whatever VNodes the *user's template* produces) are returned directly. The component itself constructs zero VNodes.

## Alternatives Considered

- **Option A: Strict reading — forbid `defineComponent`.** Forces shipping `<AtomBoundary>` as a `.vue` SFC. Adds rolldown-plugin-vue to the build, increases build complexity, ships the SFC compiler's runtime helpers (slightly larger bundle than the defineComponent path). Adds a build dependency we don't otherwise need. **Rejected** — solves a non-problem (defineComponent isn't actually VDOM weight).

- **Option B: Plain object component (`{ setup, render }`).** Avoids `defineComponent`, satisfies strict INV-9. Loses TypeScript inference for `state` prop, slot scopes (`data: A`, `error: E`), and emit types. Forces users to lose type safety at exactly the boundary effect-vue is supposed to make trustworthy (per PRINCIPLES.md #2 and INV-2). **Rejected** — sacrifices type fidelity for an arbitrary letter-of-the-rule.

- **Option C (chosen): Permit `defineComponent`, forbid VDOM constructors.** Matches the *spirit* of INV-9 (no VDOM bundle weight, Vapor-forward by construction) without the *cost* of the over-broad letter. `defineComponent` is a TS helper that returns its argument unchanged at runtime; `h`/`createVNode`/etc. are the actual VDOM weight. The split is principled and machine-checkable (a future ESLint rule can pattern-match imports from `vue` against an allowlist).

## Consequences

**Positive:**
- `<AtomBoundary>` ships as a typed component with full slot/prop inference
- Bundle stays minimal — no SFC compiler runtime, no rolldown-plugin-vue build dep
- INV-9 is now precise enough to be ESLint-enforceable in the future
- The VDOM/non-VDOM distinction is documented for the next agent designing a component composable

**Negative:**
- INV-9 is no longer a one-line rule; it requires the import allowlist split
- Casual readers may still assume the strict reading of "no VDOM imports" without checking the ADR
- A future ESLint rule needs to be written to enforce the allowlist (currently INV-9 is doc-only, never machine-enforced)

**Risks:**
- If Vue 4 / Vapor-GA changes the runtime behavior of `defineComponent` (unlikely — it would break the entire Vue 3 component ecosystem), this ADR's premise weakens. Watch for Vapor-stable announcements; revisit if the API contract changes.
- The "permitted imports" allowlist could drift from the actual Vapor-compatible surface as Vue 3.x evolves. Re-verify when Vue 3.6+ or Vapor-stable lands.
