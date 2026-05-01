# HANDOFF.md — current cursor position

> **Regeneratable, mutable, present-tense.** Updated (overwritten) at session end. A fresh AI agent or future-Danny reads this AND follows the canonical reading order in [`AGENTS.md` §Reading Order](./AGENTS.md). **This file does not duplicate that list** — single source of truth.
>
> **Last updated:** 2026-04-30 (end of session ~22:50)
> **Last updater:** Claude Opus 4.7 (1M context) — same instance that took slice 3 to completion; this session began slice 4 and immediately hit a major architectural refactor (AtomBoundary `.ts` → `.vue` SFC) when dogfooding exposed an INV-2 violation
> **Latest milestone archive:** [`handoffs/2026-04-30-slice-3-complete.md`](./handoffs/2026-04-30-slice-3-complete.md) — captures end-of-slice-3 state. The AtomBoundary refactor in slice 4 supersedes parts of slice 3's implementation; archive remains accurate as historical record.

---

## STEP 0 — Verify this handoff is current (run BEFORE trusting anything below)

```bash
git log --oneline -1   # expect: 0956ab1 (or descendant)
git status --short      # expect: empty (no working-tree changes)
```

If `git log --oneline -1` does NOT match the SHA below, **assume this handoff is stale** and verify everything below independently.

---

## Current commit on `main`

`0956ab1` (or descendant) — *refactor: AtomBoundary ships as .vue SFC + ADR-007 supersedes ADR-006*

To re-derive: `git log --oneline -10`

## Slice status

- **Slice 1 (atoms + runtime):** ✅ SHIPPED
- **Slice 2 (async ergonomics + R-preservation):** ✅ SHIPPED
- **Slice 3 (families + boundaries + matching):** ✅ SHIPPED + REFACTORED in slice 4 (AtomBoundary → SFC)
- **Slice 4 (examples + docs + publish):** 🚧 IN PROGRESS
  - ✅ `examples/basic` — Vue 3 + Vite app demonstrating ALL 6 composables. SHIPPED in this session.
  - ✅ AtomBoundary refactored to `.vue` SFC (ADR-007 supersedes ADR-006). SHIPPED.
  - ⏳ README.md polish — NOT STARTED
  - ⏳ `packages/effect-vue/` meta-package re-exporting `@effect-vue/core` — NOT STARTED
  - ⏳ `examples/nuxt-ssr` — NOT STARTED (likely surfaces SSR/hydration bugs)
  - 📋 npm publish dry-run — NOT STARTED (verify INV-10 — no bundled effect/vue)
  - 📋 npm publish — NOT STARTED, **HUMAN-GATED** (Danny must approve)

## Live metrics (verify — do not trust this snapshot blindly)

```bash
pnpm test         # expect: 34/34 passing across 6 test files
pnpm typecheck    # expect: clean (BOTH src and test configs)
pnpm lint         # expect: clean
pnpm --filter '@effect-vue/core' build  # expect: 4.61 kB / gzip 1.26 kB

# Example dogfooding (NEW — slice 4 done-criteria)
cd examples/basic && pnpm exec vue-tsc --noEmit && pnpm build  # expect: clean + 246 kB / 83 kB gzip
```

## What changed in slice 4 so far (high-level)

The original slice 4 plan was "examples + docs + publish prep — a different cadence from slice 3." The first dogfood step (writing the `examples/basic/src/App.vue` to consume all 6 composables) immediately exposed a contract violation in slice 3's AtomBoundary: the export-cast pattern preserved generics through render-function usage but FAILED in SFC templates. Templates are Vue's primary usage pattern, so this was an INV-2 violation in the most common case.

The fix required a major architectural refactor:
- AtomBoundary.ts → AtomBoundary.vue with `<script setup lang="ts" generic="A, E">`
- tsdown gains `@vitejs/plugin-vue`; vue-tsc runs separately for type emission (TypeScript itself cannot read .vue files)
- vitest config gains `@vitejs/plugin-vue`
- Workspace devDeps gain `@vitejs/plugin-vue`, `vue`, `effect` at root level
- ADR-007 supersedes ADR-006; INV-9 + ARCHITECTURE.md updated; AtomBoundary spec source pointer updated
- Verified end-to-end via sabotage: example's `data.items.join(", ")` → `data.nonExistentField.toUpperCase()` fails vue-tsc with the precise type error. Slot scope generics are genuinely typed through SFC build → published types → consumer's vue-tsc.

This refactor is **the right architecture from the ground up**. Per Danny's `feedback_build_best_then_deploy`: AI-speed implementation lets us fix the foundation now while there are zero external users — better than retrofitting later when consumers have built around the limitation.

## Next concrete action

**README.md polish** is the smallest remaining slice 4 unit. The current README likely doesn't reflect the 6-composable surface or point to the example. Suggested order:

1. Read current `README.md`
2. Update with: install snippet (`pnpm add effect-vue`), 30-second tour (one snippet per composable), link to `examples/basic`, link to `ARCHITECTURE.md` for advanced
3. Keep terse — per `feedback_no_ai_slop_in_prs`, no verbose narrative or magic-feature-listing
4. Per NON-GOALS line 19, do NOT teach Effect-TS; link to effect.website
5. Verify renders correctly on GitHub by previewing the markdown

Then in order:
6. `packages/effect-vue/` meta-package (re-exports `@effect-vue/core`; claims the bare `effect-vue` npm name verified available per ROADMAP)
7. `examples/nuxt-ssr` (likely surfaces real SSR bugs — useAsyncAtom + SSR has hydration concerns; this dogfooding step is as important as `examples/basic` was)
8. `pnpm pack` dry-run — verify INV-10 (no bundled effect/vue in tarball, peer-deps only)
9. **STOP AND ASK DANNY before npm publish.** Publishing is HUMAN-GATED.

## NEW S3 methodology revision (added this session, propagate to other Swee projects)

**Slice done-criteria now includes a dogfooding requirement.** Per LESSONS.md "Dogfooding catches contract violations invisible to internal verification" — every slice that introduces a public API must include at least one consumer of that API in `examples/basic` AND that consumer's typecheck + build must pass. Without this, the verification gap (test the way you author vs use the way users use) widens silently. Slice 3 should have caught the AtomBoundary INV-2 violation by including an SFC consumer in the slice; deferring to slice 4 cost a major refactor.

This is a cross-project lesson worth propagating to S3 methodology memory (`project_swee_spec_stack.md`).

## Open questions for the rest of slice 4

> Address each as it comes up; not blocking for the README step.

1. **`[BLOCKING META-PACKAGE]` Should the bare `effect-vue` package version-track `@effect-vue/core` 1:1?** Recommend yes — simpler for users, no confusion about "which version of core does effect-vue 0.5 use?"
2. **`[BLOCKING SSR EXAMPLE]` Does `useAsyncAtom` work in SSR context?** Likely needs hydration-mismatch handling: server renders with pending=true, client hydrates with possibly-resolved state. Could surface a real bug warranting v0.2 attention.
3. **`[BEFORE PUBLISH]` Should `dist/AtomBoundary.vue.d.ts.map` ship in the published tarball?** Currently `files: ["README.md", "dist", "src"]` includes everything in dist. Source maps add bytes but help debugging. Convention-following — most libraries ship them.
4. **`[BEFORE PUBLISH]` Should we generate a single bundled `index.d.ts` rather than per-file?** Currently per-file (vue-tsc emits one .d.ts per source file). Bundled would be slightly nicer DX but requires api-extractor or similar. Defer unless a real consumer complains.

## Cross-cutting open questions (still alive)

1. **`[NOT BLOCKING]` `provideAtomRuntime` auto-dispose** — verified during familyAtom self-review that runtime resource lifetime is orthogonal to composable correctness. Resolve when long-running SPAs surface the cost.
2. **`[DEFER, v0.2 surgery]` `useAsyncAtom` discriminated-union state shape** — would resolve the sentinel-undefined collision documented in LESSONS.md. The AtomBoundary regression test pins current behavior; when this lands, the test MUST flip and AtomBoundary MUST be updated in the same release.
3. **`[NOT BLOCKING, future tightening]` ESLint rule for INV-9 import allowlist** — currently doc-only.

## Linear references

- **DAN-421** (Urgent) — `effect-vue` v0.1.0 program-level tracking. Slice 4 in progress.
- **DAN-422** (High) — dapp-kit-vue POC, dogfoods effect-vue. Begins after `effect-vue` ships.
- **DAN-423** (High) — Pinia Colada three-package split. Independent track.

## Bundle / quality budgets remaining (per INV-11, INV-13)

- Core bundle: **1.26 KB gzip currently**. Ceiling 5 KB. **~3.74 KB headroom.**
- TypeScript strictness: NEVER relax (INV-13).

## Things the next agent should NOT do

- Do not skip the pre-commit hook (`--no-verify` is forbidden per AGENTS.md).
- Do not write code before writing the corresponding `.allium` spec (INV-6).
- Do not cast at the boundary to silence the type system (LESSONS.md 2026-04-30 — the R-tracking lesson exists for a reason).
- Do not import VDOM constructors (`h`, `createVNode`, etc.) into core (INV-9 + ADR-006/ADR-007). `defineComponent` IS permitted; `.vue` SFC `<template>` blocks are the legitimate VNode-producing surface.
- **Do not push to GitHub remote without explicit Danny approval.**
- **Do not run `npm publish` without explicit Danny approval.** This is HUMAN-GATED per CLAUDE.md.
- Do not commit without running `pnpm test && pnpm typecheck && pnpm lint && pnpm --filter '@effect-vue/core' build` and confirming all green.
- Do not duplicate the AGENTS.md reading order anywhere else.
- Do not redesign useAsyncAtom's state shape without ALSO updating AtomBoundary in the same release.
- Do not bundle multiple concerns into a single composable for ergonomics — minimal primitives compose better.
- Do not introduce a public API in any slice without ALSO adding a consumer in `examples/basic` and verifying its typecheck + build (NEW slice done-criteria from this session).
- Do not assume internal tests prove user-facing contracts hold — dogfooding is the only path that exercises real user paths (LESSONS.md 2026-04-30 §"Dogfooding catches contract violations").

## Where this session deliberately stopped (or will, after the next commit)

This Claude Opus 4.7 instance shipped slice 4's first major piece (examples/basic + AtomBoundary refactor + ADR-007 + 1 LESSONS entry). Stopping point chosen because:

- The architectural refactor was substantial and warrants Danny's review before continuing
- README polish is a clean unit of work that benefits from a fresh design pass (the README is the first thing users see; it deserves more deliberation than a tail-end "and one more thing" effort)
- Token budget remains comfortable, but the slice 4 work pattern (each step is dogfooding-driven) suggests stopping at natural surfaces rather than plowing through
- Per the new dogfooding done-criteria, each remaining slice 4 unit (meta-package, nuxt-ssr) is going to surface real bugs the same way examples/basic did. Better to handle each in its own focused session.
