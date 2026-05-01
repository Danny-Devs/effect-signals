# ADR-007: Generic components ship as `.vue` SFCs (supersedes ADR-006)

**Status:** Accepted
**Date:** 2026-04-30
**Supersedes:** [ADR-006](./0006-defineComponent-permitted-vdom-helpers-forbidden.md) (defineComponent permitted in core; VDOM constructors forbidden)

## Context

ADR-006 (2026-04-30, earlier same day) clarified INV-9 to permit `defineComponent` while forbidding VDOM constructors, and shipped `<AtomBoundary>` as a `.ts` file using the export-cast pattern: `AtomBoundaryImpl as unknown as new<A, E>() => { $props, $slots }`. The `.check.ts` type-assertion file verified the cast preserved generics through the `h(AtomBoundary, ...)` render-function path.

Slice 4 dogfooding (the `examples/basic` Vue 3 + Vite app) immediately exposed a contract failure: the export-cast does NOT propagate generics through Vue's SFC template type-checking. A consumer writing `<AtomBoundary :state="x"><template #default="{ data }">...</template></AtomBoundary>` in a `.vue` SFC saw `data: unknown` despite the typed state prop. vue-tsc's SFC compilation reads slot types from Vue's official type machinery (`$slots`, `defineSlots`, `<script setup generic>`), not from manually-cast constructor signatures.

This means ADR-006's contract held in ONE of three template-checking paths:
1. ✅ `h(AtomBoundary, ...)` render functions — slot types explicit at the call site, .check.ts validated this
2. ❌ `template:` strings in `defineComponent` — NOT typechecked at all (Vue's runtime template compiler)
3. ❌ `.vue` SFC templates — typechecked by vue-tsc's SFC compiler, but the export cast doesn't reach it

**Templates are Vue's primary usage pattern.** Shipping a typed contract that holds only in render functions ships an INV-2 (type fidelity) violation in the most common usage. ADR-006's argument against the SFC build pipeline ("avoid build deps") was sound under its constraints but did not survive the dogfooding evidence.

## Decision

`<AtomBoundary>` and any future generic component in `@effect-vue/core` SHIPS AS A `.vue` SFC using `<script setup lang="ts" generic="A, E">`. The build pipeline now compiles SFCs:

- **JS bundling:** `tsdown` with `@vitejs/plugin-vue` (Rollup-API-compatible, works with Rolldown)
- **Type emission:** `vue-tsc -p tsconfig.build.json` runs in a separate step. Cannot be done by tsdown's `rolldown-plugin-dts` because TypeScript itself does not understand `.vue` files; only vue-tsc does.
- **Test runtime:** `vitest` config gains `@vitejs/plugin-vue` so tests can import the SFC
- **Published artifact:** `dist/index.mjs` (bundled JS, AtomBoundary inlined) + `dist/*.d.ts` per-file (vue-tsc emits per-file; `dist/index.d.ts` re-exports including from `./AtomBoundary.vue`)

INV-9 wording from ADR-006 still applies inside the `<script>` block of any SFC: VDOM constructors (`h`, `createVNode`, etc.) remain forbidden; only the SFC's `<template>` block produces VNodes/Vapor-blocks (which is what SFCs are FOR — that's not an INV-9 violation, it's the legitimate use of Vue's authoring surface).

## Alternatives Considered

- **Option A: Keep ADR-006's `.ts` + export-cast pattern, document the SFC-template generics gap as a KNOWN LIMITATION.** Forces users into render functions for typed slot scopes. Rejected — templates are Vue's primary usage pattern; shipping a typed contract that silently breaks in templates ships an INV-2 violation in the most common case.

- **Option B: Use the `.ts` form but add `defineSlots` with non-generic type parameters.** Would give `unknown` slot scopes uniformly (the type info has nowhere to come from without `<script setup generic>`). Worse than Option A — at least Option A worked in render functions.

- **Option C: `unplugin-vue` instead of `@vitejs/plugin-vue`.** unplugin-vue is bundler-agnostic and might handle both JS compilation AND type emission in one pass. Rejected — `@vitejs/plugin-vue` is already in the workspace catalog (used by `examples/basic`), works with Rolldown's Rollup API compatibility, and the `vue-tsc`-for-types separation is the canonical Vue-library build pattern. Adding `unplugin-vue` would be a second SFC compiler in the dep tree.

- **Option D (chosen): `.vue` SFC + `<script setup generic>` + tsdown(@vitejs/plugin-vue) + vue-tsc.** Generic types propagate end-to-end through SFC templates because vue-tsc reads slot types from `defineSlots<{...}>()` declarations parameterized by the SFC's `generic="A, E"` block. Verified by sabotage: the example's `<AtomBoundary :state="x">` slot scope IS typed `data: A` end-to-end; replacing `data.items` with `data.nonExistentField` fails vue-tsc with the precise type error.

## Consequences

**Positive:**
- INV-2 (type fidelity) holds in template usage — Vue's primary user-facing pattern
- Generic component authoring is the standard Vue 3.3+ ergonomic (`<script setup generic>`); contributors familiar with Vue need no special-purpose patterns
- The SFC build pipeline is reusable for any future generic component in core (`<MatchBoundary>`, `<DefectBoundary>`, etc.)
- The build is now closer to how downstream Vue UI libraries are typically structured, easing the cognitive load for maintainers and contributors

**Negative:**
- Bundle grew from 1.21 kB → 1.26 kB gzip (+0.05 kB, ~50 bytes — SFC runtime helpers). Still well under INV-8's 5 kB ceiling (~3.74 kB headroom).
- Build script is now two commands: `tsdown && vue-tsc -p tsconfig.build.json`. Slightly slower; documented in package.json scripts.
- d.ts files are per-file rather than bundled. Consumers' TypeScript follows imports through them naturally, but a single bundled `index.d.ts` would be slightly nicer DX. Future ADR may add a dts-bundler (api-extractor / dts-bundle-generator) if this becomes a real friction.
- One additional dep at workspace root: `@vitejs/plugin-vue` (already in the catalog, just hoisted).
- `vue` and `effect` had to be added to root devDeps so vitest's plugin loader resolves them. Prior, vue-test-utils provided the resolution path indirectly; @vitejs/plugin-vue requires the explicit declaration.

**Risks:**
- vue-tsc and Vue's SFC compiler API have moved fast across 3.3 → 3.5; future Vue major versions may change the `<script setup generic>` compilation. Mitigation: pinned to `^3.5.0` and watch Vue's release notes.
- The `.d.ts` extension change (was `.d.mts` per ADR-006's tsdown defaults; now `.d.ts` per vue-tsc's emission) is a published-types-path change. Consumers' `import` resolution still works (TypeScript searches both); only matters if anyone is referencing `./dist/index.d.mts` directly (unlikely).

## What was verified before accepting this ADR

- `pnpm test`: 34/34 tests pass against the new SFC, including the unmodified runtime AtomBoundary tests (the API surface is identical, only the implementation file changed)
- `pnpm typecheck`: clean across both src and test tsconfigs, including the .check.ts file with two-sided `@ts-expect-error` assertions
- `pnpm lint`: clean
- `pnpm --filter '@effect-vue/core' build`: 4.61 kB raw / 1.26 kB gzip, well under INV-8 ceiling
- `examples/basic` typechecks AND builds: 246 kB / 83 kB gzip total (most is Effect-TS itself), AtomBoundary slot scopes carry full generic types in the SFC template
- **Sabotage-verification:** deliberately replaced `data.items.join(", ")` with `data.nonExistentField.toUpperCase()` in the example's `#default` slot; vue-tsc failed with `Property 'nonExistentField' does not exist on type '{ items: string[]; }'`. Restored. **The slot scope generics are genuinely typed end-to-end in the consumer's SFC template.**
