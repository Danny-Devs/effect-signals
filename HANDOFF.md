# HANDOFF.md — current cursor position

> **Regeneratable, mutable, present-tense.** Updated (overwritten) at session end. A fresh AI agent or future-Danny reads this AND follows the canonical reading order in [`AGENTS.md` §Reading Order](./AGENTS.md). **This file does not duplicate that list** — single source of truth.
>
> **Last updated:** 2026-04-30 (end of session ~22:10)
> **Last updater:** Claude Opus 4.7 (1M context) — same instance that received the slice-2-complete baton; shipped familyAtom (slice 3 first), AtomBoundary (slice 3 second), ADR-006 INV-9 clarification, and 4 LESSONS entries this session
> **Latest milestone archive:** [`handoffs/2026-04-30-slice-2-shipped.md`](./handoffs/2026-04-30-slice-2-shipped.md) — does NOT yet cover this session; archive `2026-04-30-slice-3-2of3.md` is the next candidate (after useMatch ships, archive the entire completed slice 3)

---

## STEP 0 — Verify this handoff is current (run BEFORE trusting anything below)

```bash
git log --oneline -1   # expect: 8c2d53a (or descendant) — see "Current commit" below
git status --short      # expect: empty (no working-tree changes)
```

If `git log --oneline -1` does NOT match the SHA below, **assume this handoff is stale** and verify everything below independently before acting on it.

---

## How handoffs are versioned

- `HANDOFF.md` (this file) is **always the current cursor**, regenerated each session.
- `handoffs/` is the **curated archive** — milestone handoffs only. Filename: `YYYY-MM-DD-{slug}.md`.
- **Archive when:** end of a slice/milestone, end of a week, before a major architectural pivot, when a blocker is discovered, when the session produced novel insight worth re-reading later.
- **Don't archive when:** mid-slice tactical handoffs, debugging-only sessions, sessions that just continue work without producing a milestone artifact.

---

## Current commit on `main`

`8c2d53a` (or descendant) — *test(s3): self-review of AtomBoundary — clarify spec, pin undefined-A regression, encode 2 lessons*

To re-derive: `git log --oneline -10`

This session shipped 6 commits: familyAtom, familyAtom self-review, HANDOFF regen, AtomBoundary + ADR-006, AtomBoundary self-review, and (now) this handoff regen. ~6 hours of work compressed into one Claude Opus 4.7 (1M context) instance.

## Slice status

- **Slice 1 (atoms + runtime):** ✅ SHIPPED
- **Slice 2 (async ergonomics + R-preservation):** ✅ SHIPPED
- **Slice 3 (families + boundaries + matching + DevTools):** 🚧 ~67% DONE
  - ✅ `familyAtom` SHIPPED — 6 tests, parent scope captured at family-creation time, R resolved once
  - ✅ `<AtomBoundary>` SHIPPED — 6 tests, defineComponent + setup-returned render fn, ZERO h() calls, ADR-006 clarifies INV-9 to permit defineComponent
  - ⏳ **Pattern Matching (`useMatch`)** — NOT STARTED. **Next concrete action.**
  - 📋 DevTools breadcrumb hooks — NOT STARTED, may defer to slice 4
  - 📋 Effect-aware `deriveAtom` — DEFERRED (no demand)
- **Slice 4 (publish):** 📋 NOT STARTED

## Live metrics (verify — do not trust this snapshot blindly)

```bash
pnpm test         # expect: 22/22 passing (atom: 6, useAsyncAtom: 4, familyAtom: 6, AtomBoundary: 6)
pnpm typecheck    # expect: clean
pnpm lint         # expect: clean
pnpm --filter '@effect-vue/core' build  # expect: ~4.0 kB / gzip ~1.05 kB
```

## Next concrete action: `useMatch` Pattern Matching primitive

**Goal:** template-friendly composable that wraps `Effect.Match` for pattern-matching on tagged unions or discriminated state in Vue templates.

The design space is wider than for the previous two composables — surface design alternatives in the spec BEFORE coding. Three plausible API shapes:

1. **Composable returning a render-helper:** `const m = useMatch(tagged, { Loaded: x => ..., Failed: e => ... })` returns a `Ref<rendered>` for the user to insert via `{{ m }}`. Simple, no slot complexity.
2. **Component with named slots per case:** `<Match :on="tagged"><template #Loaded="{value}">...</template><template #Failed="{error}">...</template></Match>`. Mirrors AtomBoundary's pattern. More ergonomic but more bundle weight.
3. **Direct Effect.Match re-export with a Vue-friendly wrapper:** Add a `useMatch` that's essentially `(value, schema) => computed(() => Match.value(value).pipe(Match.tag(...)).pipe(Match.exhaustive))` — minimal API surface, leans on Effect's existing pattern matching.

My recommendation: **option 3 first**, because (a) Effect.Match is already the canonical pattern, (b) wrapping it as a `computed` makes it reactive without inventing new semantics, (c) bundle-minimal, (d) users familiar with Effect.Match get instant transfer. Option 2 (Match component with slots) is a NICE-TO-HAVE that can land slice 4.

**First keystrokes:**
1. Read `Effect.Match` docs / source to confirm v3.x API (`Match.value`, `Match.tag`, `Match.tags`, `Match.exhaustive`, `Match.orElse`)
2. Write `specs/useMatch.allium` BEFORE any code. Address the three open design questions below in the spec.
3. Implement `useMatch` in `packages/core/src/useMatch.ts` (target: <0.3 kB gzip)
4. Add tests in `packages/core/test/useMatch.test.ts`
5. Update `packages/core/src/index.ts` to export `useMatch`
6. Update ARCHITECTURE.md (Pattern matching context, currently context #7, mark LIVE)
7. Update CHANGELOG.md and ROADMAP.md
8. Self-review pass per the established discipline (the previous self-reviews caught real bugs; do not skip)

## Open design questions for the slice 3 spec author (useMatch)

> Address each in `specs/useMatch.allium` BEFORE writing implementation code.

1. **`[BLOCKING SLICE 3 — useMatch]` Composable vs component vs both?** See three options above. Recommend composable-only for v0.1; component can land slice 4.
2. **`[BLOCKING SLICE 3 — useMatch]` Reactive source: should `useMatch` accept a `Ref<Tagged>` or a plain Tagged value?** Ref is more flexible (re-evaluates on change) but more verbose. Plain value works only for static matches. Probably support both via overload.
3. **`[SCOPE]` Should useMatch handle Effect-returning branches?** E.g., `useMatch(state, { Loading: () => "...", Success: (s) => Effect.flatMap(API, ...) })`. This blurs into derive territory. **Recommendation: NO** — useMatch only matches synchronously; Effect-returning branches are a different composable (out of scope).

## Cross-cutting open questions (priority-tagged) — carried forward

1. **`[SLICE 3 SCOPE, NOT BLOCKING]` Should `provideAtomRuntime` register `onScopeDispose` to dispose the underlying ManagedRuntime?** Currently NO. familyAtom self-review verified the runtime resource lifetime is orthogonal to composable correctness (see HANDOFF history for the analysis). Resolve when long-running SPAs make the cost visible.
2. **`[DEFER]` Should defects (Cause.Die) be surfaced via a separate `defect` ref in `useAsyncAtom`?** AtomBoundary will need a `defect` slot if/when this lands.
3. **`[DEFER]` `useAsyncAtom` discriminated-union state shape (v0.2)** — would resolve the sentinel-undefined collision documented in `LESSONS.md` (2026-04-30 entry "Sentinel-undefined collision"). When this lands, the AtomBoundary regression test `[KNOWN LIMITATION] cannot disambiguate Effect.succeed(undefined) from pending` MUST flip and AtomBoundary MUST be updated in the same release.

## Linear references

- **DAN-421** (Urgent) — `effect-vue` v0.1.0 program-level tracking. Update Linear when slice 3 fully ships (useMatch + DevTools breadcrumbs).
- **DAN-422** (High) — dapp-kit-vue POC, dogfoods effect-vue. Begins after `effect-vue` ships.
- **DAN-423** (High) — Pinia Colada three-package split. Independent track.

## Bundle / quality budgets remaining (per INV-11, INV-13)

- Core bundle: **1.05 KB gzip currently**. Ceiling 5 KB. **~3.95 KB headroom.**
- Per-feature budget: 0.5 KB gzip per new composable. useMatch should fit in <0.3 KB.
- TypeScript strictness: `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes`. NEVER relax (INV-13).

## Strategic context

> Permanently filed in [`ROADMAP.md` §Strategic Context](./ROADMAP.md). HANDOFF retains a pointer; the substance lives in the durable doc.

Session-specific addition for the methodology archive: **the self-review-after-each-composable discipline is paying compound interest.** This session's two self-review passes caught:
- familyAtom: a false-confidence cleanup test (passed but proved nothing about INV-1)
- AtomBoundary: a sentinel-undefined collision propagating from useAsyncAtom + a muddled spec POST condition

Both bugs would have shipped silently without the self-review pass. The 4 LESSONS.md entries written this session encode the *failure modes* so future agents (and future Danny instances) avoid them. **Total cost of self-review per composable: ~10-15% of implementation time. Total value: catching constitutional-rule violations before they ossify.**

## Things the next agent should NOT do

- Do not skip the pre-commit hook (`--no-verify` is forbidden per AGENTS.md).
- Do not write code before writing the corresponding `.allium` spec (INV-6).
- Do not cast at the boundary to silence the type system (LESSONS.md 2026-04-30 — the R-tracking lesson exists for a reason).
- Do not import VDOM constructors (`h`, `createVNode`, `createElementVNode`, etc.) into core (INV-9 + ADR-006). `defineComponent` IS permitted — it's a runtime no-op.
- Do not push to GitHub yet — Danny has not requested public publication.
- Do not commit without running `pnpm test && pnpm typecheck && pnpm lint && pnpm --filter '@effect-vue/core' build` and confirming all green.
- Do not duplicate the AGENTS.md reading order anywhere else (LESSONS.md 2026-04-30 §"Handoff documents must not duplicate reading orders").
- Do not gate `inject()` calls in callers of `injectAtomRuntime` — the gate now lives inside `injectAtomRuntime` itself.
- Do not skip the self-review pass after shipping useMatch. It WILL catch a bug. Every composable so far has had one.
- Do not redesign useAsyncAtom's state shape without ALSO updating AtomBoundary in the same release — the regression test will fail and force the issue.
- Do not write a test that only asserts "the API was called." Tests must observably falsify the invariant if the implementation breaks it (LESSONS.md 2026-04-30 §"Test names that overstate verified behavior").

## Where this session deliberately stopped

This Claude Opus 4.7 instance shipped slice 3's first TWO composables (familyAtom + AtomBoundary) plus ADR-006 plus 4 LESSONS.md entries. Stopping point chosen because:

- Two composables shipped in one session is a strong cadence; useMatch deserves its own focused session
- useMatch has design alternatives that benefit from fresh eyes (composable vs component vs both)
- Token budget is comfortable (still room to spare) but the diminishing returns curve suggests stopping while quality is still A+
- The next session has a CLEAR concrete action with three pre-resolved alternatives — minimum activation energy

**Session signal: the slice-3 work pattern is reproducible.** Spec → tests → impl → 4-gate verify → docs → commit → self-review → fix → commit. Each composable is a ~5-7 commit unit. Slice 3 will close out in 3 such units total. Slice 4 (publish) is a different kind of work (examples, docs polish, npm publish) — different cadence.
