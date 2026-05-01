# CHANGELOG

All notable changes to this project will be documented here. Append-only.

## [2026-04-30] — slice 3 begins: familyAtom shipped

### [feat] @effect-vue/core — `familyAtom` parametric atom factory

- `familyAtom(factory)` produces a function `(key) => Ref` that caches by key. Same key → same Ref instance (factory invoked exactly once per distinct key).
- Supports Effect, Stream, and plain-value factories with the same overload structure as `createAtom`. R-preservation overloads included (type-safe runtime parameter + unsafe injected-runtime variant).
- Runtime is resolved ONCE at `familyAtom` call time (not per-key) — `family(k)` is safe to call from event handlers, watchers, microtasks, or any non-`setup()` context.
- Parent `effectScope` is captured at family-creation time; all members' fibers register cleanup with that scope (NOT the call-site's scope), so transient child scopes can't prematurely interrupt cached members.
- 5 new vitest cases (15 total): cache hit/miss identity, factory-call-count, async resolution, runtime captured at creation time + safe non-setup call, family-scope cleanup with INV-5 idempotence.
- Bundle: 3.52 kB / gzip 0.86 kB (was 0.67 kB → +0.19 kB; under INV-11's 0.5 kB per-composable budget).

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
