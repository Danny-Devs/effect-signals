# HANDOFF.md — current cursor position

> **Regeneratable, mutable, present-tense.** Updated (overwritten) at session end. A fresh AI agent or future-Danny reads this AND follows the canonical reading order in [`AGENTS.md` §Reading Order](./AGENTS.md). **This file does not duplicate that list** — single source of truth.
>
> **Last updated:** 2026-04-30 (end of session, ~21:45)
> **Last updater:** Claude Opus 4.7 (instance at ~340K tokens; cross-vetted by a second AI instance whose critique drove the v2 revision of this doc)
> **Latest milestone archive:** [`handoffs/2026-04-30-slice-2-shipped.md`](./handoffs/2026-04-30-slice-2-shipped.md)

---

## STEP 0 — Verify this handoff is current (run BEFORE trusting anything below)

```bash
git log --oneline -1   # expect: edd6e9c (or later) — see "Current commit" below
git status --short      # expect: empty (no working-tree changes)
```

If `git log --oneline -1` does NOT match the commit SHA stated in the next section, **assume this handoff is stale and verify everything below independently** before acting on it. A stale handoff that looks fresh is worse than no handoff.

---

## How handoffs are versioned

- `HANDOFF.md` (this file) is **always the current cursor**, regenerated each session. Most session-ends overwrite it in place; git history (`git log -p HANDOFF.md`) preserves every past version on demand.
- `handoffs/` is the **curated archive** — milestone handoffs only, NOT every session. Filename: `YYYY-MM-DD-{slug}.md` where slug describes the session's outcome.
- **Archive when:** end of a slice/milestone, end of a week, before a major architectural pivot, when a blocker is discovered, when the session produced novel insight worth re-reading later.
- **Don't archive when:** mid-slice tactical handoffs, debugging-only sessions, sessions that just continue work without producing a milestone artifact.

---

## Current commit on `main`

`edd6e9c` (or descendant) — *docs(s3): add handoffs/ archive convention*

To re-derive: `git log --oneline -10`

## Slice status

- **Slice 1 (atoms + runtime):** ✅ SHIPPED — `createAtom`, `provideAtomRuntime`, `injectAtomRuntime`
- **Slice 2 (async ergonomics + R-preservation):** ✅ SHIPPED — `useAsyncAtom`, R-overload extension. INV-4 has its constitutional witness test.
- **Slice 3 (families + boundaries + matching):** 📋 NOT STARTED — see "Next concrete actions" below
- **Slice 4 (publish):** 📋 NOT STARTED

## Live metrics (verify — do not trust this snapshot blindly)

```bash
pnpm test         # expect: 10/10 passing
pnpm typecheck    # expect: clean
pnpm lint         # expect: clean
pnpm --filter '@effect-vue/core' build  # expect: 2.11 kB / gzip 0.67 kB
```

If any fail, investigate before any new work.

## Next concrete action (when this repo is reopened)

**Slice 3 first keystroke:**

1. Read `specs/createAtom.allium` and `specs/useAsyncAtom.allium` to refresh the v0.1.0 surface
2. Write `specs/familyAtom.allium` BEFORE any code (S3 discipline — spec first)
3. Implement `familyAtom(keyFn)` in `packages/core/src/familyAtom.ts`
4. Add tests in `packages/core/test/familyAtom.test.ts`
5. Update `packages/core/src/index.ts` to export `familyAtom`

`familyAtom` rough semantics (NOT yet specced — slice 3 should formalize):
> A factory that produces atoms parameterized by a key. Calling `familyAtom(keyFn)(k)` returns the SAME atom for the same key `k`, the FIRST call creates and SUBSEQUENT calls return cached. Cleanup happens when the surrounding effectScope disposes. Inspired by `Atom.family` in atom-react.

## Open design questions for the slice 3 spec author

> **These were deliberately NOT decided this session.** Address each in `specs/familyAtom.allium` BEFORE writing implementation code. Decisions documented in the spec, with alternatives in an ADR if non-trivial.

1. **Cache structure: `WeakMap<K, Atom>` vs `Map<K, Atom>`?** WeakMap allows GC of entries when keys are unreachable; Map needs explicit eviction. WeakMap requires keys be objects.
2. **Key equality: strict (`===`), structural (deep equal), or user-supplied via `keyFn`?** atom-react uses keyFn (the function transforms the key into something cacheable). Likely the right answer here too, but confirm.
3. **Family-level dispose semantics:** when the surrounding scope ends, does the family cache clear (interrupting all member fibers), or is each atom's lifecycle tied to the scope where it was first accessed?
4. **Lazy vs eager construction:** does `familyAtom(keyFn)(k)` call `createAtom` lazily on first access (presumably yes), and what happens on second access — fresh ref or shared ref?
5. **Type signature:** `familyAtom<K, A>(factory: (k: K) => Atom): (k: K) => Ref<A | undefined>`? Or does the user provide the Effect/Stream and familyAtom wraps the createAtom call?

Surface design alternatives in an ADR if any of these have non-obvious tradeoffs.

## Cross-cutting open questions (priority-tagged)

1. **`[SLICE 3 SCOPE]` Should `provideAtomRuntime` register `onScopeDispose` to dispose the underlying ManagedRuntime?** Currently NO. Flagged in `specs/provideAtomRuntime.allium`. Resolve in slice 3 before familyAtom is shipped, since familyAtom may stress runtime-resource-lifetime assumptions.
2. **`[DEFER]` Should defects (Cause.Die) be surfaced via a separate `defect` ref in `useAsyncAtom`?** Slice 2 chose silent fiber-log. Reconsider only if user demand emerges.
3. **`[DEFER]` Effect-aware `deriveAtom`** — no demand yet, no scope debt.
4. **`[SLICE 3 SCOPE]` Pattern Matching primitive (`useMatch`)** — investigate during slice 3 spec authoring; decide ship-in-3 vs defer-to-4.

## Linear references

- **DAN-421** (Urgent) — `effect-vue` v0.1.0 program-level tracking. Update Linear when slice 3 ships.
- **DAN-422** (High) — dapp-kit-vue POC, dogfoods effect-vue. Begins after `effect-vue` ships.
- **DAN-423** (High) — Pinia Colada three-package split. Independent track.

## Bundle / quality budgets remaining (per INV-11, INV-13)

- Core bundle: **0.67 KB gzip currently** (verify: `pnpm --filter '@effect-vue/core' build`). Ceiling 5 KB. ~4.33 KB headroom.
- Per-feature budget: 0.5 KB gzip per new composable.
- TypeScript strictness: `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes`. NEVER relax (INV-13).

## Strategic context

> Permanently filed in [`ROADMAP.md` §Strategic Context](./ROADMAP.md). HANDOFF retains a pointer; the substance lives in the durable doc.

## Things the next agent should NOT do

- Do not skip the pre-commit hook (`--no-verify` is forbidden per AGENTS.md).
- Do not write code before writing the corresponding `.allium` spec (INV-6).
- Do not cast at the boundary to silence the type system (LESSONS.md 2026-04-30 — the R-tracking lesson exists for a reason).
- Do not import VDOM-specific Vue APIs into core (INV-9).
- Do not push to GitHub yet — Danny has not requested public publication.
- Do not commit without running `pnpm test && pnpm typecheck && pnpm lint && pnpm --filter '@effect-vue/core' build` and confirming all green.
- Do not duplicate the AGENTS.md reading order anywhere else (this handoff doc itself almost made that mistake — see LESSONS.md 2026-04-30 §"Handoff documents must not duplicate reading orders").

## Where the previous session deliberately stopped

The previous Claude Opus 4.7 instance was at ~340K tokens. Stopping point chosen because:
- Slice 2 was complete and shipped
- ADR layer (0001-0005) was complete
- HANDOFF.md was invented and refined this session (twice — original by previous instance, hardened by cross-vetting from a second AI instance)
- Slice 3 is conceptually distinct work that benefits from a fresh context

**This file IS the test of whether S3 succeeded.** If slice 3 starts smoothly, S3 worked.
