# INVARIANTS.md — constitutional rules

> These never break. Tier 1 are constitutional safety rules — violations are crashes, not bugs. Tier 2 are structural rules — caught by CI. Tier 3 are quality SLOs — monitored, can drift slightly.
>
> Format: `INV-N` is a unique stable ID. Once assigned, never reused even if the invariant is retired.

## Tier 1 — Constitutional safety (NEVER violated)

### INV-1: Fiber containment
**Rule:** ∀ fiber f spawned by `createAtom`, `useAsyncAtom`, `familyAtom`, or any composable that internally creates fibers, `Fiber.interrupt(f)` is called before the surrounding `effectScope` is disposed.

**Rationale:** Orphan fibers leak resources, may continue updating disposed components, and create undefined behavior. Vue scope is the universal owner.

**Witnesses:**
- `packages/core/test/familyAtom.test.ts > "cleans up all family member fibers when the parent scope disposes (INV-1 at family level)"` — explicitly disposes a scope containing a familyAtom with three members; asserts no throws and idempotent re-disposal.
- Property test (planned slice 3+): create N atoms in a manually-managed `effectScope`, dispose, verify all fibers report status `Interrupted` within one event loop tick.

### INV-2: Type fidelity
**Rule:** ∀ atom `a` created from `Effect.Effect<A, E, R>`, the type of `a.value` is exactly `A | undefined`. The atom never silently widens, narrows, or coerces.

**Rationale:** Type fidelity is the whole point. If atoms drift from their source's success type, users lose confidence in the type system at exactly the boundary effect-vue is supposed to make trustworthy.

**Witness:** Type-level test (`@ts-expect-error` regressions) confirming that `createAtom(Effect.succeed("x" as const))` returns `Ref<"x" | undefined>`, not `Ref<string | undefined>`.

### INV-3: Layer monotonicity
**Rule:** A `provideAtomRuntime(layer)` call extends the runtime available to the descendant subtree. It does not, must not, weaken or shadow a runtime provided by an ancestor in a way that loses ancestor services.

**Rationale:** Layer composition must be predictable. If a child can silently weaken the parent's services, debugging becomes impossible.

**Witness:** Integration test — provide `LayerA` at parent, `LayerA + LayerB` at child, verify child sees both A and B services. (Note: this rule is naturally satisfied by Vue's `provide`/`inject` shadowing semantics; we're encoding the property explicitly to catch any drift.)

### INV-4: Pending precedes resolved
**Rule:** For any async source (Effect or Stream that does not resolve synchronously), `data.value === undefined` ∧ `pending.value === true` (in `useAsyncAtom`) until the first emission. Then exactly one transition occurs: `data.value` becomes the emitted value AND `pending.value` becomes `false` AND `error.value` remains `undefined`.

**Rationale:** Pending state must be observable before resolution; otherwise loading UIs flicker or never appear.

**Witness:** `packages/core/test/useAsyncAtom.test.ts > "INV-4: pending precedes resolved — atomic transition exactly once"` — collects every render's `pending`/`data` snapshot, asserts the impossible intermediate states (pending=false ∧ data=undefined; pending=true ∧ data=resolved) never occur. Slice 2 (2026-04-30).

### INV-5: Cleanup idempotence
**Rule:** Disposing an atom (or a scope containing atoms) more than once is a no-op. Multiple `Fiber.interrupt` calls on the same fiber, or `onScopeDispose` callbacks firing twice, never throw or corrupt state.

**Rationale:** Vue can dispose a scope multiple times in some lifecycle paths (e.g., HMR, SSR rehydration). We tolerate that.

**Witness:** Test — dispose an atom's scope twice, assert no throw, assert second disposal is a silent no-op.

## Tier 2 — Structural (CI-enforced)

### INV-6: Spec-before-implementation
**Rule:** Every public composable in `@effect-vue/core` has a corresponding `specs/<name>.allium` file checked into the repo.

**Witness:** CI script — list all named exports from `packages/core/src/index.ts`, list all `.allium` files in `specs/`, fail if any export lacks a spec.

### INV-7: Test-before-merge
**Rule:** Every public composable has at least one test in `packages/core/test/` that exercises its happy path AND at least one test that exercises a failure mode.

**Witness:** CI script — for each export, assert ≥2 test cases referring to it.

### INV-8: Bundle size ceiling
**Rule:** `dist/index.mjs` (gzipped) ≤ 5KB.

**Witness:** CI step in `.github/workflows/ci.yml` — run `pnpm --filter @effect-vue/core build`, measure gzipped size, fail if >5KB.

### INV-9: No VDOM-specific imports
**Rule:** `@effect-vue/core` never imports `h`, `defineComponent` (in non-test code), or any VDOM-specific function. Vapor-forward by construction.

**Witness:** ESLint rule (custom or via `import/no-restricted-imports`).

### INV-10: Effect/Vue peer-dep only (in published artifact)
**Rule:** The published `@effect-vue/core` tarball MUST NOT bundle `effect` or `vue`. They are declared as `peerDependencies` and consumers provide them.

`devDependencies` may include `effect` and `vue` for the package's own tests and typechecking — this is fine because devDependencies are not installed by consumers. The boundary that matters is the published tarball.

**Witness:** CI script that runs `pnpm pack` and asserts the resulting tarball's `package.json` has `effect` and `vue` in `peerDependencies` only, AND that no `node_modules/effect` or `node_modules/vue` paths are bundled inside the tarball.

## Tier 3 — Quality SLOs (monitored, may drift)

### INV-11: Bundle size budget for new features
**Target:** Each new composable adds <0.5KB gzip to the core bundle.

**Action on miss:** Justify the size in the CHANGELOG entry; consider whether the feature belongs in core or a peripheral package.

### INV-12: Test pass rate
**Target:** 100% test pass rate on every push to main.

**Action on miss:** Block merge; investigate.

### INV-13: TypeScript strictness
**Target:** `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` in `tsconfig.base.json`. Never relaxed.

**Action on miss:** Block merge; the user-facing types are the product.

### INV-14: ESLint clean
**Target:** Zero ESLint errors on `main`. Warnings allowed but tracked.

**Action on miss:** Block merge.

### INV-15: Documentation completeness
**Target:** Every public export has a JSDoc block AND a README example AND an Allium spec.

**Action on miss:** Track in `LESSONS.md`; fix in next slice.

## Retired invariants

(none yet)
