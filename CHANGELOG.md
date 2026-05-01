# CHANGELOG

All notable changes to this project will be documented here. Append-only.

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
