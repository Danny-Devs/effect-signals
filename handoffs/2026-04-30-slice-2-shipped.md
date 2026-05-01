# HANDOFF.md — current cursor position

> **Regeneratable, mutable, present-tense.** Updated at session end. A fresh AI agent or future-Danny reads this AFTER the standard reading order (AGENTS.md → ROADMAP.md → ARCHITECTURE.md → CHANGELOG last 3 → LESSONS.md → relevant Allium specs) and is then fully oriented to pick up the next keystroke.
>
> **Last updated:** 2026-04-30 (end of session that produced commits e6e0960, 3fc16ef, 85ea10d, 9e4fc7b)
> **Last updater:** Claude Opus 4.7 (instance was at ~330K tokens, deliberately handed off to preserve fidelity)

---

## Current commit on `main`

`9e4fc7b` — *docs: add ADR layer (0001-0005) — capturing key decisions while fresh*

`git log --oneline -5` reads:
```
9e4fc7b  docs: add ADR layer (0001-0005)
85ea10d  feat: slice 2 — useAsyncAtom + R-preservation in createAtom
3fc16ef  docs: lay Swee Spec Stack (S3) foundation + audit-fix slice 1
e6e0960  feat: bootstrap effect-vue monorepo + slice 1 (createAtom + Layer DI)
```

No uncommitted changes. No open branches. No work-in-progress.

## Slice status

- **Slice 1 (atoms + runtime):** ✅ SHIPPED — `createAtom`, `provideAtomRuntime`, `injectAtomRuntime`
- **Slice 2 (async ergonomics + R-preservation):** ✅ SHIPPED — `useAsyncAtom`, R-overload extension. INV-4 has its constitutional witness test.
- **Slice 3 (families + boundaries + matching):** 📋 NOT STARTED — see "Next concrete actions" below
- **Slice 4 (publish):** 📋 NOT STARTED

## Live metrics (verify these before claiming "green" — do not trust this snapshot blindly)

```bash
pnpm test         # expect: 10/10 passing
pnpm typecheck    # expect: clean
pnpm lint         # expect: clean
pnpm --filter '@effect-vue/core' build  # expect: 2.11 kB / gzip 0.67 kB
```

If any of these fail, that's the first thing to investigate before any new work.

## Next concrete action (when this repo is reopened)

**Slice 3 first keystroke:**

1. Read `specs/createAtom.allium` and `specs/useAsyncAtom.allium` to refresh the v0.1.0 surface
2. Write `specs/familyAtom.allium` BEFORE any code (S3 discipline — spec first)
3. Implement `familyAtom(keyFn)` in `packages/core/src/familyAtom.ts`
4. Add tests in `packages/core/test/familyAtom.test.ts`
5. Update `packages/core/src/index.ts` to export `familyAtom`

`familyAtom` semantics (decided this session, not yet specced):
> A factory that produces atoms parameterized by a key. Calling `familyAtom(keyFn)(k)` returns the SAME atom for the same key `k`, the FIRST call creates and the SUBSEQUENT calls return cached. Cleanup happens when the surrounding effectScope disposes — all atoms in the family are interrupted together. Inspired by `Atom.family` in atom-react.

## Open questions that did not get answered this session

1. **Should `provideAtomRuntime` register `onScopeDispose` to dispose the underlying ManagedRuntime?** Currently NO. Open question flagged in `specs/provideAtomRuntime.allium`. Slice 3 should resolve.
2. **Should defects (Cause.Die) be surfaced via a separate `defect` ref in `useAsyncAtom`?** Slice 2 chose to log them silently. Open for slice 3 reconsideration if user demand emerges.
3. **Effect-aware `deriveAtom` (re-runs Effect when reactive deps change) — ship or skip?** ROADMAP says "if user demand emerges." No demand yet. Defer.
4. **Pattern Matching primitive (`useMatch`) — ship in slice 3 or defer to slice 4?** Investigation deferred from slice 2.

## Strategic context (from this session, not yet in any committed doc)

- **Vue Vapor compatibility:** effect-vue uses ONLY composition API + reactivity primitives. Forward-compatible with Vapor by construction. Nothing to do until Vapor is GA.
- **Performance characteristics in Vapor:** atoms become first-class fine-grained signals; performance gets *better*, not worse. Strategic upside for marketing/positioning.
- **YouTube content angle:** "Why effect-vue is smaller and clearer than effect-react" — the Vue port is architecturally cleaner because Vue's push-reactivity aligns with Effect's push-runtime, while React's snapshot-rerender model fights it. Save this as the v0.1.0 launch post angle.

## Linear references

- **DAN-421** (Urgent) — `effect-vue` v0.1.0 program-level tracking. Update Linear when slice 3 ships.
- **DAN-422** (High) — dapp-kit-vue POC, dogfoods effect-vue. Begins after `effect-vue` ships.
- **DAN-423** (High) — Pinia Colada three-package split. Independent track.

## Bundle / quality budgets remaining (per INV-11, INV-13)

- Core bundle: 0.67 KB gzip. Ceiling 5 KB. **4.33 KB headroom.**
- Per-feature budget: 0.5 KB gzip per new composable. familyAtom should fit easily.
- TypeScript strictness: `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes`. NEVER relax (INV-13).

## Things the next agent should NOT do

- Do not skip the pre-commit hook (`--no-verify` is forbidden per AGENTS.md).
- Do not write code before writing the corresponding `.allium` spec (INV-6).
- Do not cast at the boundary to silence the type system (LESSONS.md 2026-04-30 — the R-tracking lesson exists for a reason).
- Do not import VDOM-specific Vue APIs into core (INV-9).
- Do not push to GitHub yet — Danny has not requested public publication.
- Do not commit without running `pnpm test && pnpm typecheck && pnpm lint && pnpm --filter '@effect-vue/core' build` and confirming all green.

## Where the previous session deliberately stopped

The previous Claude Opus 4.7 instance was at ~330K tokens and quality-tapering became visible (small slips: forgot CWD context once, an unused-import lint error required an extra round-trip). Stopping point chosen because:
- Slice 2 was complete and shipped
- ADR layer was complete
- Spec stack had no known gaps EXCEPT the missing HANDOFF.md (now this file)
- Slice 3 is conceptually distinct work that benefits from a fresh context

A fresh agent reading this file + the standard S3 reading order has equivalent context to the previous instance, minus the exploration detritus. **This file IS the test of whether S3 succeeded** — if slice 3 starts smoothly, S3 worked.
