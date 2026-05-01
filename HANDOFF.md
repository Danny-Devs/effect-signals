# HANDOFF.md — current cursor position

> **Regeneratable, mutable, present-tense.** Updated (overwritten) at session end. A fresh AI agent or future-Danny reads this AND follows the canonical reading order in [`AGENTS.md` §Reading Order](./AGENTS.md). **This file does not duplicate that list** — single source of truth.
>
> **Last updated:** 2026-04-30 (end of night session)
> **Last updater:** Claude Opus 4.7 (1M context). This session began with the slice-2 baton, took slice 3 to completion (familyAtom + AtomBoundary + useMatch + end-of-slice review), then took slice 4 to ~50% (examples/basic + AtomBoundary refactor to .vue SFC + ADR-007 + README + meta-package).
> **Latest milestone archive:** [`handoffs/2026-04-30-slice-3-complete.md`](./handoffs/2026-04-30-slice-3-complete.md). Note: AtomBoundary's slice-3 implementation strategy was superseded by ADR-007 in slice 4; the archive remains accurate as historical record.

---

## STEP 0 — Verify this handoff is current (run BEFORE trusting anything below)

```bash
git log --oneline -1   # expect: 46807cf (or descendant)
git status --short      # expect: empty (no working-tree changes)
```

If `git log --oneline -1` does NOT match the SHA below, **assume this handoff is stale** and verify everything below independently.

---

## Current commit on `main`

`46807cf` (or descendant) — *feat(s4): effect-vue meta-package — bare-name re-export of @effect-vue/core*

To re-derive: `git log --oneline -15`

## Slice status

- **Slice 1 (atoms + runtime):** ✅ SHIPPED
- **Slice 2 (async ergonomics + R-preservation):** ✅ SHIPPED
- **Slice 3 (families + boundaries + matching):** ✅ SHIPPED + REFACTORED in slice 4 (AtomBoundary → SFC per ADR-007)
- **Slice 4 (examples + docs + publish):** 🚧 ~50% DONE
  - ✅ `examples/basic` — Vue 3 + Vite app demonstrating ALL 6 composables
  - ✅ AtomBoundary refactored to `.vue` SFC (ADR-007 supersedes ADR-006)
  - ✅ README.md polish (install, quick-start, 6-composable table, examples link, learn-more)
  - ✅ `effect-vue` meta-package (bare-name re-export with sabotage-verified type-level check)
  - 📋 `examples/nuxt-ssr` — DEFERRED to Phase 2 / Nuxt package (per Danny 2026-04-30; not blocking publish)
  - 📋 vue-tsc peer-dep mismatch resolved — NOT STARTED (Tier-1 publish-readiness)
  - 📋 Fresh-install dogfood (`pnpm pack` → install in throwaway dir → import + typecheck) — NOT STARTED (Tier-1 publish-readiness)
  - 📋 INV-10 mechanical witness (CI script per the invariant's spec) — NOT STARTED (Tier-1 publish-readiness)
  - 📋 npm publish dry-run — NOT STARTED
  - 📋 npm publish — NOT STARTED, **HUMAN-GATED** (Danny must approve)

## Live metrics (verify — do not trust this snapshot blindly)

```bash
pnpm test         # expect: 34/34 passing across 6 test files
pnpm typecheck    # expect: clean (BOTH core's 2 configs AND meta-package's check)
pnpm lint         # expect: clean (6 README warnings tolerable, see history)
pnpm --filter '@effect-vue/core' build  # expect: 4.61 kB / gzip 1.26 kB
cd examples/basic && pnpm exec vue-tsc --noEmit && pnpm build  # expect: clean
```

## Next concrete action when this resumes

**Tier 1 publish-readiness, in order:**

1. **Resolve vue-tsc peer-dep mismatch.** Every `pnpm install` warns: `tsdown 0.21.10 → rolldown-plugin-dts 0.23.2 → ✕ unmet peer vue-tsc@~3.2.0: found 2.2.12`. Either bump catalog vue-tsc to `^3.2.0` (verify all builds + types still flow) OR pin tsdown to a version compatible with vue-tsc 2.x. Currently operating in undefined territory — fix before publish.

2. **Fresh-install dogfood.** `cd /tmp && mkdir effect-vue-fresh && cd effect-vue-fresh && pnpm init && pnpm add /path/to/effect-vue-core-0.1.0.tgz vue effect && cat > test.ts <<EOF` with imports of every public symbol, then `pnpm exec tsc --noEmit test.ts`. Catches publish-only bugs that monorepo `workspace:*` resolution masks. Repeat for the meta-package.

3. **INV-10 mechanical witness.** Per INVARIANTS.md INV-10's spec, write a script that runs `pnpm pack` and asserts the tarball's package.json has effect+vue in peerDependencies only, AND no `node_modules/effect` or `node_modules/vue` paths bundled inside. Currently INV-10 is doc-only; promote it to a real check. Add to `pnpm prepublish` script.

**Tier 2 cleanup (~5 min each, do as a batch):**

4. Audit `specs/AtomBoundary.allium` EXAMPLES section — may still show old defineComponent + export-cast pattern instead of SFC usage.
5. AGENTS.md should document the new build pipeline (tsdown + vue-tsc two-step) and the three-tsconfig pattern (default + .test + .build).
6. Consider promoting any of the effect-vue ADRs to cross-project ADRs at `.specify/memory/adr/` — likely no, they're project-specific, but worth a one-minute audit.

**Then publish prep (humans-gated final step):**

7. `pnpm publint` — standard npm publishing-mistake catcher (~30s setup, ~1s runtime, high signal).
8. `pnpm pack` dry-run + final review.
9. **STOP AND ASK DANNY** before `npm publish`.

## Cross-cutting open questions (still alive)

1. **`[NOT BLOCKING]` `provideAtomRuntime` auto-dispose** — orthogonal to composable correctness per slice-3 self-review. Resolve when long-running SPAs surface the cost.
2. **`[DEFER, v0.2 surgery]` `useAsyncAtom` discriminated-union state shape** — would resolve sentinel-undefined collision (LESSONS.md). The AtomBoundary regression test pins current behavior; flip together with the redesign.
3. **`[NOT BLOCKING]` ESLint rule for INV-9 import allowlist** — currently doc-only; ~30 LOC custom rule.
4. **`[BOOKMARKED PHASE 2]` Nuxt SSR example + `@effect-vue/nuxt` package** — explicit decision 2026-04-30 to defer to Phase 2 alongside the Nuxt package itself. NOT a slice 4 blocker.

## Linear references

- **DAN-421** (Urgent) — `effect-vue` v0.1.0 program-level tracking. Slice 4 ~50% done; updated 2026-04-30 night with this session's progress.
- **DAN-422** (High) — dapp-kit-vue POC, dogfoods effect-vue. Begins after `effect-vue` v0.1.0 ships to npm.
- **DAN-423** (High) — Pinia Colada three-package split. Independent track.

## Bundle / quality budgets remaining (per INV-11, INV-13)

- Core bundle: **1.26 KB gzip currently**. Ceiling 5 KB. **~3.74 KB headroom.**
- TypeScript strictness: NEVER relax (INV-13).

## Strategic context

> Permanently filed in [`ROADMAP.md` §Strategic Context](./ROADMAP.md). HANDOFF retains a pointer; the substance lives in the durable doc.

**Methodology validation worth filing:** Three S3-stack lessons crystallized this session that propagate beyond effect-vue to the Swee project portfolio:

1. **Cross-AI review must be scope-bounded.** Capability is not a mandate. Review-only requests should literally include "Review only. Do not write code. Return findings." in the prompt.
2. **A check that compiles ≠ a check that's being checked.** Whenever a new verification mechanism is added (test, lint, type-check, CI step), deliberately sabotage it once and confirm the gate catches the sabotage. Cost: one extra command + one revert. Benefit: catches false-confidence configurations before they ossify.
3. **Dogfooding catches contract violations invisible to internal verification.** Internal tests asymptote; consuming the API the way users will is unbounded. NEW S3 done-criteria: every slice that introduces a public API must include at least one consumer in `examples/basic` (or an equivalent dogfood) AND that consumer's typecheck + build must pass.

These three lessons are the highest-leverage deliverable from this session. Code can be re-written; methodology that prevents recurring mistakes compounds. All three already encoded in `LESSONS.md`; cross-project promotion to `project_swee_spec_stack.md` memory done at session end.

## Things the next agent should NOT do

- Do not skip the pre-commit hook (`--no-verify` is forbidden per AGENTS.md).
- Do not write code before writing the corresponding `.allium` spec (INV-6).
- Do not cast at the boundary to silence the type system.
- Do not import VDOM constructors (`h`, `createVNode`, etc.) into core (INV-9 + ADR-006/ADR-007). `defineComponent` IS permitted; `.vue` SFC `<template>` blocks ARE the legitimate VNode-producing surface.
- **Do not push to GitHub remote without explicit Danny approval.**
- **Do not run `npm publish` without explicit Danny approval.** HUMAN-GATED per CLAUDE.md.
- Do not commit without running `pnpm test && pnpm typecheck && pnpm lint && pnpm --filter '@effect-vue/core' build` and confirming all green.
- Do not duplicate the AGENTS.md reading order anywhere else.
- Do not introduce a public API in any slice without ALSO adding a consumer that exercises it the way users will (dogfooding done-criteria).
- Do not assume internal tests prove user-facing contracts hold.
- Do not bundle multiple concerns into a single composable for ergonomics — minimal primitives compose better.

## Session-end note (2026-04-30 night)

Stopped for the night after a long, deep session. Slice 3 went from ~25% complete to entirely shipped (including end-of-slice review catching 3 cross-cutting bugs). Slice 4 went from 0% to ~50%, including a major architectural refactor (AtomBoundary `.ts` → `.vue` SFC) that surfaced from dogfooding. The session validated the entire S3 spec-stack methodology in production: spec-first → tests → impl → 4-gate verify → docs → commit → self-review → fix → commit cadence, plus end-of-slice review and dogfooding done-criteria. **The 11-layer stack works.**

Tier 1 publish-readiness (vue-tsc peer-dep, fresh-install dogfood, INV-10 mechanical witness) is the next concrete work. None of it is novel design — all three are mechanical "fix the gap" tasks that should land cleanly in 2-3 commits. After that, slice 4 is ready for human-gated publish.
