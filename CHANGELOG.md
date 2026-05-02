# CHANGELOG

All notable changes to this project will be documented here. Append-only.

## [2026-05-02] — drop bare-name `effect-vue` meta-package

### [refactor] go scope-only — `@effect-vue/*` family, no bare-name package

The bare-name `effect-vue` meta-package shipped on 2026-04-30 to (a) land-grab the obvious npm name and (b) offer a shorter `pnpm add effect-vue` install line. After Danny reserved the `@effect-vue` scope on npm (2026-05-02), the land-grab argument collapses — the scope namespace IS the moat — and the install-line convenience is outweighed by the asymmetry trap with future siblings: a bare-name root next to scoped siblings (`@effect-vue/nuxt`, `@effect-vue/devtools`) creates two install patterns users have to learn ("the root is unscoped, but extensions are scoped — why?"). VueUse (the closest analog: `@vueuse/core` headline + `@vueuse/integrations` siblings) is purely scoped and demonstrably works. We mirror that.

Changes:

- **Removed `packages/effect-vue/`** (the bare-name meta) — directory deleted, src/index.mjs + src/index.d.ts + test/reexport.check.ts + tsconfig.test.json + package.json + README.md gone. Nothing was published to npm under that name; no consumer impact.
- **`scripts/verify-published-tarball.mjs`** — default `packagesToCheck` list now contains only `packages/core`. Calling with explicit args still works (preserves the witness's flexibility).
- **`ROADMAP.md`** — slice 4 marker for the meta-package flipped from ✅ to ⏭️ DROPPED with the rationale captured inline.
- **`HANDOFF.md`** — regenerated with simplified single-package publish flow (one `pnpm publish` instead of the publish-core-then-meta sequence).
- **`README.md`** — already documented `@effect-vue/core` as the canonical install path; no edit needed.
- **`CHANGELOG.md` / `LESSONS.md`** — append-only, history preserved. The 2026-04-30 entry that introduced the meta-package, the 2026-04-30 entry about its dogfood, and the 2026-05-01 LESSONS entry about CI/dist-ordering ALL stay verbatim — they're accurate history. This entry supersedes them.

The naming-strategy reasoning is captured in this CHANGELOG entry rather than a new ADR because the question is fully resolved by the existing ADR-001 (monorepo from day one) plus the implicit "scope-only" choice now formalized. If a future contributor reopens the question, they'll find it here under the date it was decided.



### [chore] vue-tsc catalog bump 2.x → 3.2.7

- Catalog `vue-tsc` bumped from `^2.1.0` (resolved 2.2.12) to `^3.2.0` (resolved 3.2.7). Resolves the long-standing `pnpm install` peer-dep warning where `tsdown 0.21.10 → rolldown-plugin-dts 0.23.2` wanted vue-tsc `~3.2.0` but the catalog pinned 2.x.
- All 34 tests pass, typecheck clean, build identical (4.61 kB raw / 1.26 kB gzip — bundle did not drift).
- The slot-scope generic propagation guarantee from ADR-007 was sabotage-verified end-to-end against vue-tsc 3.x: replacing `data.items.join(", ")` with `data.nonExistentField.toUpperCase()` in `examples/basic/src/App.vue` produces the same precise type error vue-tsc 2.x produced (`Property 'nonExistentField' does not exist on type '{ items: string[]; }'`). The volar 2 rewrite preserved AtomBoundary's SFC generic surface; ADR-007's discipline (use blessed `<script setup generic>` syntax rather than ad-hoc casts) is what made this upgrade risk-free.

### [feat] INV-10 mechanical witness shipped — `scripts/verify-published-tarball.mjs`

- Per INVARIANTS.md INV-10's spec, machine-checked: `pnpm pack` each package, extract the published `package.json`, assert (a) `effect` + `vue` are in `peerDependencies` and NOT in `dependencies`, and (b) no `node_modules/effect/` or `node_modules/vue/` paths appear in the tarball file list.
- Wired into each package's `prepublishOnly` script — runs automatically before any `npm publish`. Workspace-level `pnpm verify:tarballs` exposes it for ad-hoc + CI use.
- Sabotage-proven: temporarily added `vue` to `@effect-vue/core`'s `dependencies` block and confirmed the witness fails with `[INV-10] FAIL @effect-vue/core: 'vue' present in dependencies (must be peer only)` and exit code 1. Restored.
- Promoted INV-10 from doc-only to mechanical in `INVARIANTS.md` — witness line now points at the script and describes the exact assertions.

### [test] Fresh-install dogfood — both packages

- `/tmp/effect-vue-fresh-core/` — minimal consumer project with the packed `effect-vue-core-0.1.0.tgz` + `vue` + `effect` from npm. `test.ts` imports every public symbol (`createAtom`, `AtomBoundary`, `familyAtom`, `injectAtomRuntime`, `provideAtomRuntime`, `useAsyncAtom`, `useMatch`, `AsyncAtomState`, `AtomSource`) and binds each through `void (() => { ... })()` blocks so plain `tsc --noEmit` (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes) verifies the published types resolve. Sabotage-proven by changing `const _v: number = aPlain.value` to `const _v: string`; tsc fails with `Type 'number' is not assignable to type 'string'`. Restored.
- `/tmp/effect-vue-fresh-meta/` — same dogfood but importing from `effect-vue` (the bare-name meta-package). Required `pnpm.overrides` to redirect `@effect-vue/core@^0.1.0` to the local tarball during pre-publish testing (the registry doesn't have it yet). After publish, the override is no longer needed; the meta-package will resolve `@effect-vue/core` from npm normally. Sabotage-proven identically.
- The dogfood caught one real surprise: `AsyncAtomState<A, E>` is the `{ data, error, pending }` ref triple itself, not a discriminated-union wrapper around it — visible only when consuming the public API the way users will. Test corrected. This is exactly the failure mode the dogfood done-criteria was added to catch (LESSONS.md, slice 3).

### [chore] Repository URL fix — `dannydevs` → `Danny-Devs`

- Both packages' `package.json` `homepage` and `repository.url` fields were pointing at `https://github.com/dannydevs/effect-vue` (no hyphen — a different GitHub user). Corrected to `https://github.com/Danny-Devs/effect-vue` (the actual `gh auth status` user). Also added `bugs` field linking to `/issues`. Standardized `repository.url` to canonical `git+https://...git` form.

### [chore] Meta-package dep semantics — `workspace:*` → `workspace:^`

- `packages/effect-vue/package.json` previously depended on `@effect-vue/core: workspace:*`, which pnpm rewrites to the exact version (`0.1.0`) on publish. That made every patch release require both packages to bump together. Switched to `workspace:^`, which rewrites to `^0.1.0` — patch updates of core flow to consumers automatically; only minor/major bumps require a paired meta-package release.
- Tarball inspection confirms the rewrite: `tar -xOzf effect-vue-0.1.0.tgz package/package.json` shows `"@effect-vue/core": "^0.1.0"` in the published manifest.

### [chore] CI workflow extended — INV-10 step + examples/basic dogfood

- `.github/workflows/ci.yml` gained `pnpm verify:tarballs` (INV-10 mechanical witness) and the `examples/basic` typecheck + build steps (slice-3 dogfood done-criteria). Lint moved earlier in the chain so it fails fast.
- Added `permissions: contents: read` (least-privilege default; reduces blast radius if any future workflow gets a token).

### [docs] Roadmap + INVARIANTS housekeeping

- `ROADMAP.md` slice 4 updated to reflect actual state: `examples/basic` shipped, `examples/nuxt-ssr` deferred to Phase 2 (alongside `@effect-vue/nuxt` package itself), README polish shipped, meta-package shipped, Tier-1 publish-readiness complete.
- `INVARIANTS.md` INV-10 witness pointer now references the actual script.

### Publish-day note (for future agents reading this CHANGELOG)

The meta-package's pre-publish dogfood uses `pnpm.overrides` to short-circuit `@effect-vue/core@^0.1.0` to the local tarball. **After core is published to npm, this override is unnecessary** — the meta-package resolves core from the registry like any other dependency. The recommended publish order is therefore: (1) publish `@effect-vue/core@0.1.0` first, (2) verify it resolves (`pnpm view @effect-vue/core`), (3) publish `effect-vue@0.1.0` second. The `prepublishOnly` hook on each package runs the INV-10 witness before either publish proceeds.



### [docs] README polish — install, quick-start, 6-composable table, examples link

- Install snippet (`pnpm add @effect-vue/core effect vue`) with peer-dep note
- Quick-start covers 4 composables in one snippet (createAtom value, createAtom Effect, useAsyncAtom) with template-side consumption
- Table of all 6 composables with one-line purpose each
- "Examples" section linking to `examples/basic` with `pnpm example:basic` run command
- "Learn more" section linking to PRINCIPLES, ARCHITECTURE, NON-GOALS, GLOSSARY, specs/, docs/adr/
- Per NON-GOALS line 19, does NOT teach Effect-TS — links to effect.website

### [feat] `effect-vue` meta-package (claims the bare npm name)

- New `packages/effect-vue/` — thin re-export of `@effect-vue/core` (`export * from "@effect-vue/core"`). Same API, shorter import path: `import { ... } from "effect-vue"`.
- **Zero-build approach**: hand-authored `src/index.mjs` + `src/index.d.ts`. No tsdown, no SFC compilation needed. The package is essentially a one-line shim with a workspace dep on `@effect-vue/core`.
- Versions in lockstep with `@effect-vue/core`.
- Bundle weight at consumer side: ~zero (consumer's bundler dedupes via the workspace dep, ends up with one copy of core).
- README in the meta-package directs users to either install path; main README's install snippet uses the `@effect-vue/core` form (canonical) but documents both.

### [test] Dogfooded re-export verification with sabotage proof

- `packages/effect-vue/test/reexport.check.ts` — TS-only assertion file importing every public symbol from `effect-vue` (NOT from `@effect-vue/core` directly) and exercising each through `void (() => { ... })` blocks that bind exact types.
- New `tsconfig.test.json` for the meta-package; new `typecheck` script runs vue-tsc against it.
- **Sabotage-verified**: replaced `const _v: number = counter.value` with `const _v: string`; vue-tsc failed with `Type 'number' is not assignable to type 'string'`. The check IS being checked.
- Per the new dogfooding done-criteria from LESSONS.md: every public API surface needs a consumer that exercises it the way users will. The meta-package IS a public surface (the bare `effect-vue` import path), even though it's a thin re-export, so the dogfood is mandatory.

## [2026-04-30] — slice 4 begins: AtomBoundary refactored to .vue SFC + ADR-007

### [refactor] @effect-vue/core — `<AtomBoundary>` ships as `.vue` SFC

Slice 4 dogfooding (`examples/basic`) immediately exposed an INV-2 (type fidelity) violation in the original `defineComponent` + export-cast implementation: the cast preserved generics through `h(AtomBoundary, ...)` render-function usage but FAILED to propagate generics through Vue's SFC template type-checking. Templates are Vue's primary usage pattern, so the contract was silently broken in the most common case.

Architectural fix:

- **AtomBoundary now ships as `packages/core/src/AtomBoundary.vue`** using `<script setup lang="ts" generic="A, E">` with `defineProps<{state: AsyncAtomState<A, E>}>()` and `defineSlots<{...}>()`. Slot scope generics (`data: A`, `error: E`) propagate end-to-end through SFC templates verified by sabotage in `examples/basic`.
- **Build pipeline now compiles SFCs.** tsdown gains `@vitejs/plugin-vue` for JS bundling; `vue-tsc -p tsconfig.build.json` runs in a separate step for type emission (TypeScript itself does NOT understand .vue files; only vue-tsc does).
- **Vitest config gains `@vitejs/plugin-vue`** so tests can import the SFC.
- **Workspace devDeps gain `@vitejs/plugin-vue`, `vue`, `effect`** at the root level (vitest's plugin loader requires explicit resolution paths; previously `@vue/test-utils` provided indirect access).
- **Published artifact:** `dist/index.mjs` (4.61 kB raw / 1.26 kB gzip — was 1.21 kB → +0.05 kB for SFC runtime helpers, well under INV-8's 5 kB ceiling) + `dist/*.d.ts` per-file (vue-tsc emits per-file; `dist/index.d.ts` re-exports including from `./AtomBoundary.vue`).
- **`exports` map updated** from `./dist/index.d.mts` → `./dist/index.d.ts` (vue-tsc emits the latter).

All 34 existing tests (including the 6 AtomBoundary runtime tests and the .check.ts type-assertion file) pass without modification — the API surface is identical, only the implementation file changed.

### [docs] ADR-007 supersedes ADR-006

- `docs/adr/0007-sfc-for-generic-components.md` — formal record of the build-pipeline change. ADR-006's INV-9 import allowlist/denylist split remains valid; the implementation strategy (`.ts` + export-cast) is replaced.
- `docs/adr/0006-defineComponent-permitted-vdom-helpers-forbidden.md` — status updated to "Superseded by ADR-007"; original content preserved (append-only convention).
- `INVARIANTS.md` INV-9 — references both ADRs; adds `.vue` SFC carve-out clarifying that an SFC's `<template>` block produces VNodes via Vue's compiler, which is legitimate authoring surface, NOT an INV-9 violation.
- `ARCHITECTURE.md` Boundaries context — flow updated to reflect the SFC implementation; new subsection explaining the slice 4 revision.
- `specs/AtomBoundary.allium` — source pointer updated to the .vue file; ADR references updated.

### [chore] Sabotage-verification of the architectural fix

Per LESSONS.md "A check that compiles ≠ a check that's being checked," the example's typecheck was sabotaged after the refactor: replaced `data.items.join(", ")` in the `#default` slot with `data.nonExistentField.toUpperCase()`. vue-tsc failed with `Property 'nonExistentField' does not exist on type '{ items: string[]; }'` — confirming the slot scope is genuinely typed `{ items: string[] }` end-to-end through the SFC build, the published types, and the consumer's vue-tsc. Restored.

## [2026-04-30] — slice 3 continues: useMatch shipped (Pattern matching context LIVE)

### [feat] @effect-vue/core — `useMatch` reactive Vue ↔ Effect.Match bridge

- `useMatch(source, matcher)` returns a `ComputedRef<A>` that re-evaluates the matcher whenever the source ref changes. The matcher is typed `(input: I) => A` (NOT `Matcher<...>`) so users can pass `Match.value(s).pipe(...)`, pre-built `Match.type<I>().pipe(...)` matchers, or even plain switch expressions.
- Implementation is intentionally one line — `computed(() => matcher(source.value))`. The semantic value is real despite the triviality: documents intent (pattern-matching, not arbitrary derivation), provides a unified mental model alongside the other 5 composables, gives a hook for future enhancements without refactoring call sites.
- Type-level exhaustiveness comes for free from `Match.exhaustive`'s type signature — useMatch propagates it without special exhaustiveness logic.
- 5 vitest cases (27 total): basic match, re-evaluation on source change, computed dedup on equal values, composition with useAsyncAtom + Match.when(undefined), throw propagation via Vue computed.
- Bundle: 4.15 kB / gzip 1.09 kB (was 1.05 kB → +0.04 kB; trivial because computed is one line).

### [docs] specs + architecture updated

- `specs/useMatch.allium` — first behavioral spec for the pattern-matching context. Documents the deliberate single-source design, the type-flexible matcher signature, and the composition pattern with useAsyncAtom.
- `ARCHITECTURE.md` Pattern matching context #7 marked LIVE. New subsection explains why useMatch does NOT impose Effect.Match on the matcher type AND why useMatch does NOT cross multiple refs (computed is for multi-ref derivations).

### [chore] slice 3 essentially done

Remaining slice 3 work: DevTools breadcrumb hooks (interfaces only). Likely deferring to slice 4 since DevTools panel itself is Phase 3.

## [2026-04-30] — slice 3 continues: AtomBoundary shipped + INV-9 clarified via ADR-006

### [feat] @effect-vue/core — `<AtomBoundary>` async-state slot dispatcher

- `AtomBoundary` is a defineComponent over `AsyncAtomState<A, E>` that dispatches one of three slots based on the state: `pending` (no scope), `error` (scope: `{ error: E }`), `default` (scope: `{ data: A }`). The slot scopes carry narrowed types — `data: A` (not `A | undefined`), `error: E` (not `E | undefined`) — preserving INV-2 type fidelity at the rendering boundary.
- Implementation: defineComponent + setup-returned render function that invokes user slots directly via `slots.pending?.()` etc. ZERO `h()` / `createVNode` calls — Vapor-forward by construction. The component itself constructs no VNodes; all VNode/Vapor-block creation happens upstream in user slot templates.
- Generic-typed via the export-cast pattern (Vue 3 + plain `.ts` doesn't natively support generic components — the `.vue` SFC `<script setup generic>` syntax is the alternative; we use the cast to avoid adding rolldown-plugin-vue to the build).
- 5 vitest cases (21 total): pending slot, default slot with typed data, error slot with typed error, empty render when no matching slot, reactive transition pending → resolved with no remount.
- Bundle: 4.01 kB / gzip 1.05 kB (was 0.86 kB → +0.19 kB; under INV-11's 0.5 kB per-composable budget).

### [docs] ADR-006 — `defineComponent` permitted, VDOM constructors forbidden

- Original INV-9 wording forbade `defineComponent` in non-test code. On inspection: `defineComponent` is a runtime no-op type helper (returns its arg unchanged); the actual VDOM weight comes from `h` / `createVNode` / `createElementVNode`. The original wording conflated a TS helper with VDOM constructors.
- ADR-006 splits the rule. INV-9 now has an explicit allowlist (defineComponent, defineProps, defineEmits, defineSlots, plus reactivity/scope/DI) and an explicit denylist (h, createVNode, createElementVNode, createBlock, createElementBlock, Fragment, Text, Comment).
- Tests retain a carve-out for `h` (component-mounting test utilities).
- ESLint enforcement is still doc-only (TODO); manual code review enforces until then.

### [docs] ARCHITECTURE.md — Boundaries context added

- New bounded context #6 (Boundaries) split out from Async ergonomics. Useful because useAsyncAtom can be consumed by template-only patterns without dragging AtomBoundary into the bundle, and AtomBoundary can be replaced by a different rendering policy without changing useAsyncAtom.

### [chore] slice 3 progress

Remaining slice 3 work: Pattern Matching primitive (`useMatch`), DevTools breadcrumb hooks. Tracked in ROADMAP.md.

## [2026-04-30] — slice 3 begins: familyAtom shipped

### [feat] @effect-vue/core — `familyAtom` parametric atom factory

- `familyAtom(factory)` produces a function `(key) => Ref` that caches by key. Same key → same Ref instance (factory invoked exactly once per distinct key).
- Supports Effect, Stream, and plain-value factories with the same overload structure as `createAtom`. R-preservation overloads included (type-safe runtime parameter + unsafe injected-runtime variant).
- Runtime is resolved ONCE at `familyAtom` call time (not per-key) — `family(k)` is safe to call from event handlers, watchers, microtasks, or any non-`setup()` context.
- Parent `effectScope` is captured at family-creation time; all members' fibers register cleanup with that scope (NOT the call-site's scope), so transient child scopes can't prematurely interrupt cached members.
- 6 new vitest cases (16 total): cache hit/miss identity, factory-call-count, async Effect resolution, Stream-based factory subscription, runtime captured at creation time + safe non-setup call, and INV-1+INV-5 family-scope cleanup proven via `Effect.never` + `Effect.onInterrupt` counter (proves fibers were *actually* interrupted, not merely that `scope.stop()` did not throw).
- Bundle: 3.49 kB / gzip 0.86 kB (was 0.67 kB → +0.19 kB; under INV-11's 0.5 kB per-composable budget).

### [docs] specs + architecture updated

- `specs/familyAtom.allium` — first behavioral spec for the families context. Documents API surface, key equality, family-level cleanup semantics, and the deliberate divergence from atom-react (runtime capture at family time, not per-key).
- `ARCHITECTURE.md` — Families context marked LIVE; new subsection explains why runtime + parent scope are captured at family-creation time.

### [fix] @effect-vue/core — `injectAtomRuntime` hardened

- `injectAtomRuntime` now early-returns `undefined` when no Vue component instance is active (`getCurrentInstance()` check). Previously, calling it from a standalone `effectScope` triggered Vue's "inject() can only be used inside setup() or functional components" warning. The gate lives in `injectAtomRuntime` (one place) rather than at every caller, which keeps `createAtom`, `useAsyncAtom`, and `familyAtom` clean.
- `INVARIANTS.md` INV-1 updated to enumerate `useAsyncAtom` and `familyAtom` alongside `createAtom`, with the family-cleanup test cited as the witness.

### [chore] slice 3 in progress

Remaining slice 3 work: `<AtomBoundary>` SFC, Pattern Matching primitive (`useMatch`), DevTools breadcrumb hooks. Tracked in ROADMAP.md.

## [2026-04-30] — handoffs/ archive convention added

### [docs] HANDOFF.md archive pattern

Single HANDOFF.md captures present cursor (regenerated each session); `handoffs/YYYY-MM-DD-{slug}.md` is curated archive of milestone handoffs only. Lossy by default, archive when significant. Git history covers everything not curated.

First archive entry: `handoffs/2026-04-30-slice-2-shipped.md` (this session — slice 2 shipped, ADR layer added, HANDOFF.md invented).

S3 memory updated with the archive convention.

## [2026-04-30] — HANDOFF.md added as 11th S3 layer + ADR layer

### [docs] HANDOFF.md introduced — Continuity layer of Swee Spec Stack

Added `HANDOFF.md` to capture present-cursor state at session end. Discovered as a real gap during this session when AI instance approached ~330K tokens and handoff to a fresh instance became practical. Distinct from CHANGELOG (history), ROADMAP (future), LESSONS (mistakes), AGENTS (rules) — captures *where the cursor is right now*. Regeneratable, not appended; overwritten each session like Night Suite's STATUS.md.

S3 methodology updated in `project_swee_spec_stack.md` memory: now eleven layers, with HANDOFF as layer 11 (Continuity). effect-vue is the first reference implementation of the full 11-layer stack.

### [docs] AGENTS.md reading order extended to include HANDOFF.md

### [docs] ADR layer (0001-0005) added — capturing decisions while fresh

- 0001 Monorepo from day one
- 0002 Atom IS a Vue Ref (not a separate Atom type like atom-react)
- 0003 tsdown (Rolldown-based) for library builds
- 0004 pnpm 9 catalog protocol for shared dependency versions
- 0005 R-preservation via overload set

## [2026-04-30] — slice 2: useAsyncAtom + R-preservation in createAtom

### [feat] @effect-vue/core slice 2 shipped

- `useAsyncAtom(effect)` — returns `{ data, error, pending }` reactive ref triple. Typed errors via Effect's `E` channel. Supports R = never, R-with-explicit-runtime, and R-with-injected-runtime overloads (same shape as createAtom).
- `createAtom` extended with R-preservation overloads — Effects/Streams with requirements R can be passed type-safely (with explicit runtime) or ergonomically (relying on injected runtime). Removes the previous v0.1.0 limitation captured in LESSONS.md.
- INV-4 (Pending precedes resolved) gets its constitutional witness test — observes every render snapshot and asserts impossible intermediate states never occur.
- 4 new vitest cases (10 total now passing): success path, typed-failure path, INV-4 witness, Layer-injected runtime.
- Layer-injection test updated to remove unsound cast — typecheck is clean.

### [docs] specs + lessons updated

- `specs/useAsyncAtom.allium` — first behavioral spec for the async-ergonomics composable
- `specs/createAtom.allium` — overload table updated with R-preservation overloads
- `LESSONS.md` — R-tracking lesson marked [FIXED slice 2]
- `INVARIANTS.md` INV-4 now points to its witness test by name
- `ARCHITECTURE.md` — context 4 (Async ergonomics) marked LIVE

## [2026-04-30] — initial bootstrap + slice 1 + spec stack foundation

### [feat] @effect-vue/core slice 1 shipped

- `createAtom(value | Effect | Stream)` — atoms as Vue refs (value path + Effect path implemented; Stream path stubbed for slice 2)
- `provideAtomRuntime(layer)` / `injectAtomRuntime()` — typed Layer DI bridge to Vue's provide/inject
- 4 vitest cases passing (plain value, sync Effect, delayed Effect, Layer injection)
- Bundle: dist/index.mjs = 1.42 kB (gzip 0.52 kB)

### [chore] monorepo scaffold + tooling

- pnpm 9 workspace + catalog: protocol for shared dep versions
- tsdown (Rolldown-based) for library builds
- vitest + happy-dom + @vue/test-utils for testing
- @antfu/eslint-config (flat) for linting
- simple-git-hooks + lint-staged for pre-commit
- vue-tsc for type-checking
- CI workflow for typecheck + test + build + lint

### [docs] Swee Spec Stack (S3) foundation laid

Following Danny's S3 methodology, the v0.1.0 subset of spec docs created:
- AGENTS.md — agent reading order, working rules
- PRINCIPLES.md — design philosophy (12 principles)
- NON-GOALS.md — what we explicitly will NOT build
- GLOSSARY.md — ubiquitous language (atoms, runtime, layer, fiber, scope)
- INVARIANTS.md — Tier 1 (constitutional), Tier 2 (structural), Tier 3 (quality SLOs)
- ARCHITECTURE.md — eight bounded contexts, three-layer effect recursion, data flow diagrams
- ROADMAP.md — slices 1-4 + Phase 2/3 plan
- LESSONS.md — first entry: createAtom does not preserve Effect requirements R
- specs/createAtom.allium — first behavioral spec
- specs/provideAtomRuntime.allium — first behavioral spec for DI

Deferred to later slices: TASTE.md, additional ADRs.

### [test] Stream path coverage + plain-object case

Slice 1 audit revealed Stream code path was implemented but untested. Added two test cases:
- Stream subscription: createAtom with Stream.fromIterable confirms emissions update the ref
- Plain object pass-through: createAtom({ foo: "bar" }) confirms non-Effect non-Stream objects fall through to value path

### [docs] Spec coherence audit fixes

Audit identified and corrected:
- ROADMAP.md slice 4 now explicitly plans the `effect-vue` meta-package addition
- ARCHITECTURE.md + ROADMAP.md now align on Pattern Matching context (slice 2 investigation, slice 3+ implementation)
- AGENTS.md → LESSONS.md reference now resolves (file created)
- PRINCIPLES.md item 12 distinguishes `@effect-vue/*` family from sibling projects
- GLOSSARY.md atom states clarified for v0.1.0 createAtom vs slice 2 useAsyncAtom
- INVARIANTS.md INV-10 wording cleaned: rule is about published tarball, not devDependencies
- specs/createAtom.allium return type accurately reflects overload-based Ref<A> vs Ref<A | undefined>
- specs/createAtom.allium documents R-tracking limitation
