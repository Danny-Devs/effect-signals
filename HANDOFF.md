# HANDOFF.md — current cursor position

> **Regeneratable, mutable, present-tense.** Updated (overwritten) at session end. A fresh AI agent or future-Danny reads this AND follows the canonical reading order in [`AGENTS.md` §Reading Order](./AGENTS.md). **This file does not duplicate that list** — single source of truth.
>
> **Last updated:** 2026-04-30 (end of session ~21:45)
> **Last updater:** Claude Opus 4.7 (1M context) — fresh instance that received the baton from the previous instance via the previous HANDOFF.md and shipped familyAtom (slice 3 first composable)
> **Latest milestone archive:** [`handoffs/2026-04-30-slice-2-shipped.md`](./handoffs/2026-04-30-slice-2-shipped.md) — does NOT yet cover this session; archive `2026-04-30-slice-3-familyAtom.md` is the next candidate

---

## STEP 0 — Verify this handoff is current (run BEFORE trusting anything below)

```bash
git log --oneline -1   # expect: 8ee7e4a (or descendant) — see "Current commit" below
git status --short      # expect: empty (no working-tree changes)
```

If `git log --oneline -1` does NOT match the SHA below, **assume this handoff is stale** and verify everything below independently before acting on it. A stale handoff that looks fresh is the worst case for AI-to-AI state transfer.

---

## How handoffs are versioned

- `HANDOFF.md` (this file) is **always the current cursor**, regenerated each session. Most session-ends overwrite it in place; git history (`git log -p HANDOFF.md`) preserves every past version on demand.
- `handoffs/` is the **curated archive** — milestone handoffs only. Filename: `YYYY-MM-DD-{slug}.md`.
- **Archive when:** end of a slice/milestone, end of a week, before a major architectural pivot, when a blocker is discovered, when the session produced novel insight worth re-reading later.
- **Don't archive when:** mid-slice tactical handoffs, debugging-only sessions, sessions that just continue work without producing a milestone artifact.

---

## Current commit on `main`

`8ee7e4a` (or descendant) — *feat: slice 3 — familyAtom (parametric atom factories)*

To re-derive: `git log --oneline -10`

Parallel-edited commits during this same session: `3cde193` (HANDOFF.md hardening from cross-AI critique), and an unattributed worktree edit that hoisted the `getCurrentInstance` guard into `injectAtomRuntime` itself. All integrated into the slice 3 commit.

## Slice status

- **Slice 1 (atoms + runtime):** ✅ SHIPPED — `createAtom`, `provideAtomRuntime`, `injectAtomRuntime`
- **Slice 2 (async ergonomics + R-preservation):** ✅ SHIPPED — `useAsyncAtom`, R-overload extension, INV-4 witness test
- **Slice 3 (families + boundaries + matching + DevTools):** 🚧 IN PROGRESS (~25% done)
  - ✅ `familyAtom` SHIPPED this session — 6 tests, ~0.86 kB gzip (5 initial + 1 from self-review pass: Stream factory + strengthened cleanup test using `Effect.never` + `onInterrupt` to *prove* fiber interruption rather than just non-throw on dispose)
  - ⏳ `<AtomBoundary>` SFC component — NOT STARTED
  - ⏳ Pattern Matching primitive (`useMatch`) — NOT STARTED
  - ⏳ DevTools breadcrumb hooks (interfaces only) — NOT STARTED
  - 📋 Effect-aware `deriveAtom` — DEFERRED (no user demand)
- **Slice 4 (publish):** 📋 NOT STARTED

## Live metrics (verify — do not trust this snapshot blindly)

```bash
pnpm test         # expect: 16/16 passing (atom: 6, useAsyncAtom: 4, familyAtom: 6)
pnpm typecheck    # expect: clean
pnpm lint         # expect: clean
pnpm --filter '@effect-vue/core' build  # expect: ~3.5 kB / gzip ~0.86 kB
```

If any fail, investigate before any new work.

## Next concrete action (when this repo is reopened)

**Slice 3 second composable: `<AtomBoundary>` SFC component.** Wraps an async atom (or familyAtom member) and renders fallback content for pending/error states without forcing every consumer to spell out the `v-if pending / v-else-if error / v-else` triad.

1. Read `specs/useAsyncAtom.allium` to align on the `{ data, error, pending }` shape AtomBoundary will consume
2. Decide ADR question (see "Open design questions" below): is AtomBoundary a SFC with default + error + pending slots (like Vue Suspense), or a render-prop component, or both? Mirror Vue Suspense conventions where reasonable.
3. Write `specs/AtomBoundary.allium` BEFORE any code (S3 INV-6 discipline)
4. Implement in `packages/core/src/AtomBoundary.ts` (TS file with `defineComponent` — do NOT use `.vue` SFC; this is a runtime component that must remain VDOM-free per INV-9)
5. Add tests in `packages/core/test/AtomBoundary.test.ts`
6. Update `packages/core/src/index.ts` to export `AtomBoundary`

**Critical INV-9 constraint:** AtomBoundary runs at component runtime, so it MAY use `defineComponent` (already allowed in test code). But it MUST NOT import `h()` for VDOM construction in the published artifact. Use template-friendly slot rendering — render functions are acceptable as long as they don't drag in VDOM-only deps. The eslint rule for INV-9 needs to be tightened OR an `// eslint-disable-line` with justification needs to be added; surface this to Danny before adding the disable.

## Open design questions for the slice 3 spec author

> **Address each in `specs/AtomBoundary.allium` BEFORE writing implementation code.** Document decisions in the spec; if the choice has non-obvious tradeoffs, write an ADR.

1. **`[BLOCKING SLICE 3 — AtomBoundary]` Slot API: `<AtomBoundary :state="asyncState">` with named slots (`#default="{ data }"`, `#pending`, `#error="{ error }"`)? Or props-driven (`:fallback`, `:errorRenderer`)?** Slots are more idiomatic for Vue but harder to type. Props are TypeScript-friendly but force imperative render-function usage at the call site.
2. **`[BLOCKING SLICE 3 — AtomBoundary]` Should AtomBoundary auto-detect `{ data, error, pending }` shape via duck typing, or require an explicit `useAsyncAtom`-shaped state object?** Duck typing is ergonomic but masks type errors. Explicit is safer.
3. **`[SLICE 3 SCOPE] useMatch` design** — Effect.Match → template composable. Investigate during AtomBoundary spec authoring; decide whether useMatch ships in slice 3 or defers to slice 4. The two compositions interact (useMatch could be the engine inside AtomBoundary).
4. **`[SLICE 3 SCOPE]` DevTools breadcrumb hook interface** — purely interface design (no implementation; actual panel deferred to `@effect-vue/devtools` Phase 3). Should the hooks be a typed event emitter (`{ on: (evt, cb) => off }`) or pure data structures (`Ref<DevtoolsEvent[]>`)? Likely the latter — Vue DevTools panel API is poll-based.

## Cross-cutting open questions (priority-tagged) — carried forward unchanged

1. **`[SLICE 3 SCOPE]` Should `provideAtomRuntime` register `onScopeDispose` to dispose the underlying ManagedRuntime?** Currently NO. Flagged in `specs/provideAtomRuntime.allium`. **NOT a blocker for any specific composable** — verified during slice 3 self-review: familyAtom captures runtime once at creation time and member fibers tie cleanup to the parent scope; the runtime's *resource* lifetime (does ManagedRuntime auto-dispose?) is orthogonal to whether atoms/families ship correctly. Resolve when the cost of NOT auto-disposing becomes visible (long-running SPAs accumulating Layer resources across navigation), not before.
2. **`[DEFER]` Should defects (Cause.Die) be surfaced via a separate `defect` ref in `useAsyncAtom`?** Slice 2 chose silent fiber-log. AtomBoundary may surface this naturally if it has an error slot; reconsider when AtomBoundary's error semantics are designed.
3. **`[DEFER]` Effect-aware `deriveAtom`** — no demand yet, no scope debt.

## Linear references

- **DAN-421** (Urgent) — `effect-vue` v0.1.0 program-level tracking. Update Linear when slice 3 fully ships (AtomBoundary + useMatch + breadcrumbs).
- **DAN-422** (High) — dapp-kit-vue POC, dogfoods effect-vue. Begins after `effect-vue` ships.
- **DAN-423** (High) — Pinia Colada three-package split. Independent track.

## Bundle / quality budgets remaining (per INV-11, INV-13)

- Core bundle: **0.86 KB gzip currently** (verify: `pnpm --filter '@effect-vue/core' build`). Ceiling 5 KB. **~4.14 KB headroom.**
- Per-feature budget: 0.5 KB gzip per new composable. AtomBoundary should fit easily (likely 0.2-0.4 KB).
- TypeScript strictness: `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes`. NEVER relax (INV-13).

## Strategic context

> Permanently filed in [`ROADMAP.md` §Strategic Context](./ROADMAP.md). HANDOFF retains a pointer; the substance lives in the durable doc.

Session-specific addition worth filing if it survives review: **the parallel-edit pattern that happened this session (one AI shipped familyAtom while another concurrently hoisted the `getCurrentInstance` guard into `injectAtomRuntime`) is a viable workflow** — two AIs + Danny can each work on independent surfaces without explicit coordination if the diff scope is clean. Worth noting in S3 methodology as "compatible parallelism." But: required a fresh-eyes re-read after the merge to catch the new lint error and the now-redundant guard. Not free.

## Things the next agent should NOT do

- Do not skip the pre-commit hook (`--no-verify` is forbidden per AGENTS.md).
- Do not write code before writing the corresponding `.allium` spec (INV-6).
- Do not cast at the boundary to silence the type system (LESSONS.md 2026-04-30 — the R-tracking lesson exists for a reason).
- Do not import VDOM-specific Vue APIs into core (INV-9). **Especially relevant for AtomBoundary** — see spec discussion in "Next concrete action" above.
- Do not push to GitHub yet — Danny has not requested public publication.
- Do not commit without running `pnpm test && pnpm typecheck && pnpm lint && pnpm --filter '@effect-vue/core' build` and confirming all green.
- Do not duplicate the AGENTS.md reading order anywhere else (LESSONS.md 2026-04-30 §"Handoff documents must not duplicate reading orders").
- Do not gate `inject()` calls in callers of `injectAtomRuntime` — the gate now lives inside `injectAtomRuntime` itself. Adding redundant `getCurrentInstance()` checks at call sites just increases bundle size.

## Where this session deliberately stopped

This Claude Opus 4.7 instance shipped `familyAtom` (slice 3's first composable, ~25% of slice 3 scope). Stopping point chosen because:

- familyAtom is conceptually complete — spec, implementation, 5 tests, all green
- AtomBoundary is conceptually distinct work (UI component vs reactivity primitive) and benefits from a fresh design pass
- The `provideAtomRuntime` auto-dispose open question should be resolved before AtomBoundary's error semantics are designed (one decision propagates to both)
- Token budget at session end is ~85K (well under prior instance's ~340K stopping point) — could continue, but the AtomBoundary spec design merits its own focused session per S3 spec-first discipline

**The handoff hardening from `3cde193` worked.** This instance picked up the baton, shipped a slice, did fresh-eyes review, integrated parallel edits cleanly, and is leaving behind a more specific HANDOFF for the next instance. AI-to-AI continuity at production-code level is functioning.
