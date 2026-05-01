# HANDOFF.md — current cursor position

> **Regeneratable, mutable, present-tense.** Updated (overwritten) at session end. A fresh AI agent or future-Danny reads this AND follows the canonical reading order in [`AGENTS.md` §Reading Order](./AGENTS.md). **This file does not duplicate that list** — single source of truth.
>
> **Last updated:** 2026-04-30 (end of session ~22:25)
> **Last updater:** Claude Opus 4.7 (1M context) — same instance that received slice-2 baton; this session shipped familyAtom + AtomBoundary + useMatch (all three of slice 3's reactivity composables) plus ADR-006 plus 9 LESSONS entries plus this archive
> **Latest milestone archive:** [`handoffs/2026-04-30-slice-3-complete.md`](./handoffs/2026-04-30-slice-3-complete.md) — captures end-of-slice-3 state with full methodology validation

---

## STEP 0 — Verify this handoff is current (run BEFORE trusting anything below)

```bash
git log --oneline -1   # expect: b9cbdcd (or descendant) — see "Current commit" below
git status --short      # expect: empty (no working-tree changes)
```

If `git log --oneline -1` does NOT match the SHA below, **assume this handoff is stale** and verify everything below independently.

---

## How handoffs are versioned

- `HANDOFF.md` (this file) is **always the current cursor**, regenerated each session.
- `handoffs/` is the **curated archive** — milestone handoffs only.
- **Archive when:** end of a slice/milestone, end of a week, before a major architectural pivot, when a blocker is discovered, when the session produced novel insight worth re-reading later.

---

## Current commit on `main`

`b9cbdcd` (or descendant) — *test(s3): self-review of useMatch — add closure-tracking test, encode minimal-primitives lesson*

To re-derive: `git log --oneline -15`

This session shipped 11 commits across slice 3. See `handoffs/2026-04-30-slice-3-complete.md` for the milestone summary.

## Slice status

- **Slice 1 (atoms + runtime):** ✅ SHIPPED
- **Slice 2 (async ergonomics + R-preservation):** ✅ SHIPPED
- **Slice 3 (families + boundaries + matching):** ✅ ESSENTIALLY DONE
  - ✅ `familyAtom` SHIPPED — 6 tests, parent scope captured at family-creation time, R resolved once
  - ✅ `<AtomBoundary>` SHIPPED — 6 tests, defineComponent + setup-returned render fn, ZERO h() calls (ADR-006 clarifies INV-9)
  - ✅ `useMatch` SHIPPED — 6 tests, one-line `computed(() => matcher(source.value))`, type-flexible matcher signature
  - 📋 DevTools breadcrumb hooks — DEFERRED to slice 4 / Phase 3 (interface design coupled to actual panel)
  - 📋 Effect-aware `deriveAtom` — DEFERRED indefinitely (no demand)
- **Slice 4 (examples + docs + publish):** 📋 NEXT — different cadence (examples, docs polish, npm publish)

## Live metrics (verify — do not trust this snapshot blindly)

```bash
pnpm test         # expect: 28/28 passing (atom: 6, useAsyncAtom: 4, familyAtom: 6, AtomBoundary: 6, useMatch: 6)
pnpm typecheck    # expect: clean
pnpm lint         # expect: clean
pnpm --filter '@effect-vue/core' build  # expect: ~4.15 kB / gzip ~1.09 kB
```

## Next concrete action: Begin Slice 4 (examples + publish prep)

**Slice 4 is qualitatively different from slices 1-3.** Slices 1-3 shipped reactivity composables — code with constitutional invariants and self-review discipline. Slice 4 ships USER-FACING ARTIFACTS — examples, README, npm publish. Different mental model: less "is this constitutionally sound?" and more "is this clear and discoverable for a new user?"

### Slice 4 work breakdown (in suggested order)

1. **`examples/basic`** — single Vue 3 + Vite app demonstrating all 6 public composables. One file per composable, plus a combined demo that wires them together (e.g., `userFamily(id)` → `useAsyncAtom`-shape → `<AtomBoundary>` for rendering, `useMatch` for state-derived display strings). This BOTH dogfoods the API (catches DX bugs) AND becomes the first thing users see in the README.
2. **`README.md` polish** — install snippet, 30-second tour, link to examples, link to ARCHITECTURE.md for advanced. Don't try to teach Effect-TS (per NON-GOALS line 19); link to effect.website.
3. **`packages/effect-vue/`** meta-package — re-exports `@effect-vue/core`. The bare `effect-vue` npm name is verified available (per ROADMAP slice 4). Lets users `pnpm add effect-vue` for the simplest install.
4. **`examples/nuxt-ssr`** — Nuxt SSR example showing Layer-DI on server. Validates that the existing composables work in SSR context (likely will surface a real bug — useAsyncAtom + SSR has hydration concerns).
5. **npm publish dry-run** — `pnpm pack` + verify the tarball satisfies INV-10 (no bundled effect/vue, peer-deps only). Audit the d.ts files for type leakage.
6. **npm publish** — `effect-vue` AND `@effect-vue/core` in lockstep. **HUMAN-GATED** — Danny must confirm before publish.

### First keystrokes for whoever picks up

1. Read `ROADMAP.md` Slice 4 section (already accurate)
2. Read `examples/basic/README.md` if it exists (probably doesn't — create from scratch)
3. Scaffold `examples/basic/` as a Vite + Vue 3 + TypeScript app that imports `@effect-vue/core` from the workspace
4. Write the first composable demo (probably `createAtom` since it's the foundation)
5. Iterate through the other 5 composables
6. Use the demo to discover DX issues — every time you reach for something that doesn't exist or is awkward, FILE IT in LESSONS.md or as a new spec for slice 5+

## Open questions for Slice 4

> **Should be addressed during slice 4, not before.**

1. **`[BLOCKING SLICE 4 PUBLISH]` Should `effect-vue` (the meta-package) version-track `@effect-vue/core` 1:1, or have its own version?** Recommend 1:1 — simpler for users, no confusion about "which version of core does effect-vue 0.5 use?" Validate with the pnpm catalog config (already used for shared dep versions).
2. **`[SCOPE]` Does the basic example demonstrate Layer DI?** Probably yes — provideAtomRuntime is one of the three "bridges" (per GLOSSARY) and showing it cements the mental model for new users.
3. **`[SCOPE]` Does the basic example use a real backend (e.g., httpbin.org) or mock everything in-process?** Recommend in-process — keeps the example self-contained and avoids network flakiness in the demo.
4. **`[POST-PUBLISH]` Open Vue Discord post / blog / YouTube video** — Phase 5 work per ROADMAP. Don't conflate with Slice 4. Ship 0.1.0 first, market it after.

## Cross-cutting open questions (still alive after Slice 3)

1. **`[NOT BLOCKING]` `provideAtomRuntime` auto-dispose** — verified during familyAtom self-review that runtime resource lifetime is orthogonal to composable correctness. Resolve when long-running SPAs surface the cost.
2. **`[DEFER, v0.2 surgery]` `useAsyncAtom` discriminated-union state shape** — would resolve sentinel-undefined collision (see LESSONS.md). The AtomBoundary regression test pins current behavior; when this lands, the test MUST flip and AtomBoundary MUST be updated in the same release.
3. **`[NOT BLOCKING, future tightening]` ESLint rule for INV-9 import allowlist** — currently doc-only. ~30 LOC custom rule would close the loop.

## Linear references

- **DAN-421** (Urgent) — `effect-vue` v0.1.0 program-level tracking. **UPDATE LINEAR**: slice 3 complete, slice 4 starting.
- **DAN-422** (High) — dapp-kit-vue POC, dogfoods effect-vue. Begins after `effect-vue` ships.
- **DAN-423** (High) — Pinia Colada three-package split. Independent track.

## Bundle / quality budgets remaining (per INV-11, INV-13)

- Core bundle: **1.09 KB gzip currently**. Ceiling 5 KB. **~3.91 KB headroom.** Slice 4 should not add to core bundle (no new composables planned).
- TypeScript strictness: `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes`. NEVER relax (INV-13).

## Strategic context

> Permanently filed in [`ROADMAP.md` §Strategic Context](./ROADMAP.md). HANDOFF retains a pointer; the substance lives in the durable doc.

**Slice 3 methodology validation worth filing in S3 memory:** the spec-first + self-review-after-each-composable discipline shipped 2 real bug fixes (familyAtom cleanup test, AtomBoundary sentinel-undefined limitation). Total cost: ~10-15% of impl time. Total value: catching constitutional violations before they ossify. The 9 LESSONS.md entries written across this session encode the failure modes for future agents AND future Danny instances. **The 11-layer S3 stack is functioning as designed in production.**

The "minimal primitives produce zero-bug surface" lesson (LESSONS.md final entry) is potentially the most important takeaway. familyAtom (~50 LOC, complex state) → bugs caught. AtomBoundary (~40 LOC, novel pattern) → bugs caught. useMatch (~5 LOC, minimal) → no bugs caught. Argues against bundling concerns into ergonomic mega-composables. Future Swee projects should adopt the principle.

## Things the next agent should NOT do

- Do not skip the pre-commit hook (`--no-verify` is forbidden per AGENTS.md).
- Do not write code before writing the corresponding `.allium` spec (INV-6) — applies to ANY new public composable, including ones added in slice 4.
- Do not cast at the boundary to silence the type system (LESSONS.md 2026-04-30 — the R-tracking lesson exists for a reason).
- Do not import VDOM constructors (`h`, `createVNode`, etc.) into core (INV-9 + ADR-006). `defineComponent` IS permitted.
- **Do not push `effect-vue` to npm without explicit Danny approval.** This is a HUMAN-GATED action per CLAUDE.md.
- **Do not publish to GitHub remote without explicit Danny approval.** The repo is local-only until Danny says otherwise.
- Do not commit without running `pnpm test && pnpm typecheck && pnpm lint && pnpm --filter '@effect-vue/core' build` and confirming all green.
- Do not duplicate the AGENTS.md reading order anywhere else.
- Do not skip the self-review pass after shipping ANY new composable in slice 4. Discipline pays compound interest.
- Do not redesign useAsyncAtom's state shape without ALSO updating AtomBoundary in the same release — the regression test will fail and force the issue.
- Do not write a test that only asserts "the API was called." Tests must observably falsify the invariant if the implementation breaks it.
- Do not bundle multiple concerns into a single composable for ergonomics — minimal primitives that compose are a better design (see LESSONS.md "Minimal primitives produce zero-bug surface").

## Where this session deliberately stopped

This Claude Opus 4.7 instance shipped slice 3 in entirety (3 composables + 1 ADR + 9 LESSONS entries + milestone archive). Stopping point chosen because:

- Slice 3's reactivity-composable phase is complete; remaining slice 3 work (DevTools breadcrumbs) is coupled to Phase 3 panel design and benefits from joint design later
- Slice 4 is qualitatively different work (examples, docs, publish) — different mental model, benefits from a fresh session
- Token budget remains comfortable (~150K used, ~850K headroom on the 1M context model) — could continue, but slice boundary is the natural rest point
- The slice-3-complete archive (`handoffs/2026-04-30-slice-3-complete.md`) preserves the milestone permanently; future Danny + future agents can re-read it without re-deriving from git log

**Session signal: the spec → tests → impl → 4-gate → docs → commit → self-review → fix → commit cadence is reproducible and bounded.** Each composable is a ~5-7 commit unit. Slice 3 closed in 11 commits across the 3 composables + meta-work (HANDOFF regen × 2, slice-complete archive, ADR-006). Slice 4's cadence will look different (more examples, less spec).
