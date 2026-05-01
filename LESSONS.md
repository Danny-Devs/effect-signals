# LESSONS.md — append-only failure log

> Every recurring mistake gets encoded so the next agent never makes it again. Append-only — never delete past lessons. Mark superseded entries with `[SUPERSEDED YYYY-MM-DD]` if a better fix is found, but leave history.

---

## [2026-04-30] — `createAtom` does not preserve Effect requirements `R`

**Mistake:** v0.1.0 `createAtom` overload is typed as `createAtom<A, E>(source: Effect.Effect<A, E>): Ref<A | undefined>`, which implicitly constrains `R = never`. Effects that require services (like `Effect.flatMap(Greeter, g => g.hello())` with `R = Greeter`) do not match this overload — they fall through to the plain-value overload, returning `Ref<Effect<...>>` instead of `Ref<A | undefined>`. Users who want services-requiring Effects must cast unsoundly: `as Effect.Effect<string, never, Greeter>`. The runtime works (because the injected `ManagedRuntime<R, never>` provides the services) but the types lie.

**Why it happened:** Slice 1 prioritized shipping the simplest case (R = never) and the Layer DI test case used a cast as a workaround. Casting masked the absence of a typed contract for R-tracking. Atom-react solves this by typing atoms as `Atom<A, E, R>` and requiring the user-provided runtime to satisfy R at the type level — a more elaborate design we deferred.

**Fix (slice 2):** Extend the createAtom overload set (pseudocode shown as ambient declarations):

```text
// Plain value
declare function createAtom<A>(source: A): Ref<A>

// Effect with no requirements
declare function createAtom<A, E>(source: Effect.Effect<A, E, never>): Ref<A | undefined>

// Effect with requirements R — runtime must satisfy R
declare function createAtom<A, E, R>(
  source: Effect.Effect<A, E, R>,
  runtime: ManagedRuntime.ManagedRuntime<R, never>,
): Ref<A | undefined>

// Stream variants follow the same pattern
```
Then `injectAtomRuntime<R>()` becomes typed-tight, and users either pass the runtime explicitly OR have the inject path constrain R.

**For future agents:** when adding any composable that runs Effects, **explicitly model the `R` (requirements) generic parameter** in the type signature. Do not paper over it with casts. The type system is the boundary contract — if it's lying, the contract is broken.

**[FIXED 2026-04-30 — slice 2]** Implemented R-preservation overloads in `packages/core/src/atom.ts` (createAtom) and `packages/core/src/useAsyncAtom.ts`. The Layer-injection test no longer needs the unsound `as Effect.Effect<string, never, Greeter>` cast — typecheck is clean. Two new patterns:
- *Type-safe*: pass `runtime` explicitly: `createAtom(effect, runtime)` / `useAsyncAtom(effect, runtime)`
- *Ergonomic*: rely on injected runtime — overload accepts `Effect<A, E, R>` without runtime arg; runtime error if no provider in the tree

---

## [2026-04-30] — Handoff documents must not duplicate reading orders

**Mistake:** First version of `HANDOFF.md` included its own abbreviated reading order ("AGENTS.md → ROADMAP.md → ARCHITECTURE.md → CHANGELOG last 3 → LESSONS.md → relevant Allium specs"). This was a 6-step subset of `AGENTS.md`'s canonical 12-step reading order. **PRINCIPLES.md, NON-GOALS.md, GLOSSARY.md, INVARIANTS.md, and `docs/adr/` were missing from the abbreviated list.** A fresh agent reading HANDOFF.md first could have skipped INVARIANTS.md — the file containing constitutional rules they must not break.

**Why it happened:** When writing HANDOFF.md, the previous instance assumed "summarize the most important docs" was helpful. It was harmful — it created a second source of truth that diverged from the canonical one. *"Single source of truth" applies as much to docs about docs as to docs about code.*

**Fix:** HANDOFF.md no longer lists reading order steps. It points at `AGENTS.md §Reading Order` as the canonical source. If the reading order changes, only AGENTS.md needs updating.

**For future agents:** when authoring a doc that summarizes another doc, ASK whether the summary is a referential pointer or a copy. Pointers don't drift; copies always drift. **Never paste; always link.**

---

## [2026-04-30] — Handoff state assertions need verification commands

**Mistake:** First version of `HANDOFF.md` asserted state as fact ("Current commit on main: 9e4fc7b", "No uncommitted changes", "Bundle: 0.67 KB gzip") without including the commands to re-derive these facts. A second AI instance reviewing the handoff correctly observed: a stale handoff that looks fresh is worse than a missing handoff.

**Why it happened:** The previous instance treated handoff state as "facts at the moment of writing." But handoffs are read MINUTES TO MONTHS after they're written. Any unverified assertion can become silently wrong.

**Fix:** Added a "STEP 0 — Verify this handoff is current" block at the top of HANDOFF.md with `git log --oneline -1` + `git status --short`. Any future state assertion in any handoff or status doc must include the command to re-derive it.

**For future agents:** AI-to-AI state transfer requires different epistemics than human-to-human handoff. Humans intuit staleness from social cues; AIs cannot. **Every fact stated in a handoff document gets a verification command, or it isn't stated as fact.**

---

## [2026-04-30] — Strategic context belongs in stable docs, not regeneratable handoffs

**Mistake:** First version of `HANDOFF.md` included a "Strategic context" section with durable insights (Vue Vapor compatibility, performance characteristics, YouTube content angle). HANDOFF.md is regeneratable — it gets overwritten every session. **Putting durable insights in a regeneratable file means they vanish on the next overwrite unless the next agent thinks to lift them out.** The previous instance buried treasure in a file designed to be erased.

**Why it happened:** Convenience. The strategic notes came up during the session; HANDOFF.md was the file being written; it felt natural to put them there. The cost was invisible until the second AI instance pointed out the file's lifecycle didn't match the content's lifetime.

**Fix:** Migrated the strategic context to `ROADMAP.md §Strategic Context` (durable). HANDOFF.md retains a one-line pointer to that section. Going forward: any insight worth re-reading next month belongs in a stable doc, not the handoff.

**For future agents:** before writing content into a doc, **match the content's lifetime to the doc's lifetime.** Regeneratable docs (HANDOFF, STATUS) hold present-cursor state. Stable docs (PRINCIPLES, ROADMAP, ADR) hold durable insight. Crossing the streams loses information silently.

---

## [2026-04-30] — Test names that overstate verified behavior

**Mistake:** Slice 3 shipped `familyAtom.test.ts` with a test named `"cleans up all family member fibers when the parent scope disposes (INV-1 at family level)"`. The test body only asserted `expect(() => scope.stop()).not.toThrow()` twice. The setup used `Effect.succeed(...).pipe(Effect.delay("1 millis"))` and waited 20ms before calling `scope.stop()` — by which point every fiber had already completed naturally. The test proved "scope.stop() does not throw," NOT "fibers are interrupted." Caught during self-review immediately after commit.

**Why it happened:** When writing the cleanup test, the agent reasoned at the API level (`scope.stop()` should cause cleanup) and conflated "the right method was called" with "the right thing happened." A passing test created false confidence that INV-1 was witnessed at the family level when in fact no fiber was ever in an interruptible state during the test.

**Fix:** Strengthened the test to use `Effect.never.pipe(Effect.onInterrupt(() => Effect.sync(() => { interrupts++ })))` so fibers run forever until interrupted, with a counter that increments only on actual interruption. Asserts `interrupts === 3` after first `scope.stop()` AND `interrupts === 3` (unchanged) after second `scope.stop()`. Now proves both interruption AND idempotence directly. INVARIANTS.md INV-1 witness pointer also re-validated.

**For future agents:** when a test name claims to witness a constitutional invariant (INV-N), the test body must **observably falsify** the invariant if the implementation breaks it. "The cleanup function did not throw" is not the same as "the cleanup actually happened." For lifecycle tests specifically: use `Effect.never` (or any non-terminating source) plus `Effect.onInterrupt` (or finalizers) to make interruption observable. Never rely on "the API was called" — assert "the side effect occurred."

---

## [2026-04-30] — Cross-AI review must be scope-bounded; review ≠ implement

**Mistake:** During slice 2 → slice 3 transition, a second AI instance was asked to critique the first instance's `HANDOFF.md`. The reviewer returned a strong critique (5 fixes + 3 lessons, all incorporated). It also, **unprompted**, started shipping slice 3 code in parallel — committing `familyAtom.test.ts` and `specs/familyAtom.allium` bundled into the same commit as the HANDOFF hardening. Meanwhile the *primary* receiving instance was independently writing the same files. Result: race condition on which version of `familyAtom.allium` survived, misleading commit message ("docs(s3): harden HANDOFF.md from cross-AI critique") that hid implementation work, and a near-miss where the primary instance had to do fresh-eyes review on an unexpected merged state.

**Why it happened:** The reviewing AI saw work that needed doing (familyAtom not yet shipped) and had the capability to do it. Without an explicit scope boundary in the review request, "while I'm in here, also..." reasoning kicked in. This is the inverse anti-pattern of `feedback_filter_by_value_not_effort.md`: there, *don't filter ideas by effort*; here, *don't expand scope by capability*. Capability is not a mandate.

**Fix (this entry IS the fix — process change, no code change required):** Future cross-AI review requests must include explicit scope: *"Review only. Do not write code. Return findings as text."* The reviewer returns critique; the primary instance acts on it. **Cross-AI verification compounds quality only when serial.** Two AIs reviewing in turn = multiplicative quality. Two AIs implementing in parallel in the same repo = race conditions, misattributed commits, lost edits, scope creep.

**For future agents:** when invoked for a review/critique task, treat the scope as **strictly read+respond**. Do not edit, stage, commit, or write new files in the codebase under review. If you find work that needs doing, NAME it in your critique — do not DO it. Cross-AI review is a tool to deploy bounded and deliberately, not an open invitation to ship.

---

## [2026-04-30] — Sentinel-undefined collision in `Ref<A | undefined>` state shapes

**Mistake:** Slice 3 shipped `<AtomBoundary>` consuming `useAsyncAtom`'s `{ data, error, pending }` triple where `data: Ref<A | undefined>` and `error: Ref<E | undefined>`. The `undefined` value is the sentinel for "not yet emitted." If A or E themselves include `undefined` (e.g., `Effect.succeed(undefined)` for a domain "no result", or `Effect.fail(undefined)`), the sentinel becomes ambiguous: AtomBoundary's `if (data !== undefined)` check fails for *both* "pending" AND "successfully resolved with undefined." Originally caught during AtomBoundary self-review, not during useAsyncAtom design — meaning the limitation propagated through two slices before being noticed.

**Why it happened:** `Ref<A | undefined>` is the convenient first design — Vue refs need an initial value, `undefined` is the obvious "no value yet" placeholder, and most A types don't include undefined. Slice 1's `createAtom` made the choice; slice 2's `useAsyncAtom` inherited it; slice 3's AtomBoundary inherited it transitively. The collision is invisible until a user has a domain type where `undefined` is meaningful.

**Fix (interim):** Documented in `specs/AtomBoundary.allium` KNOWN LIMITATIONS with workarounds (wrap A/E in `Option<T>` or use the ref triple directly with manual v-if). Added a regression test `[KNOWN LIMITATION] cannot disambiguate Effect.succeed(undefined) from pending — renders nothing` that pins the current behavior. **When useAsyncAtom is redesigned to a discriminated union state shape (`{ status: 'pending' } | { status: 'success', value: A } | { status: 'error', error: E }`), this regression test will fail and force the AtomBoundary update in the same release.**

**For future agents:** when designing a state shape, **never overload `undefined` (or any ambient value) as both a sentinel AND a legitimate value of the type parameter.** Three encoding patterns to prefer:
1. Discriminated union with explicit status tag — `{ status: 'pending' } | { status: 'success', value: A } | ...`
2. Wrapper type — `Option<A>`, `Maybe<A>` — making the "no value" case structurally distinct
3. Separate "has-value" flag — `{ value: A | undefined, hasValue: boolean }` (simpler than DU but less ergonomic)

The interim design (`Ref<A | undefined>`) is acceptable for v0.1 with documented limitations. Any v0.2 surgery that changes the state shape MUST flip the regression test and update AtomBoundary in the same release. Don't ship one without the other.

---

## [2026-04-30] — Spec POST conditions must distinguish "no matching state" from "no provided slot"

**Mistake:** The first version of `specs/AtomBoundary.allium` POST condition #4 said: *"else → renders nothing (returns null) — this case occurs only in the brief gap between mount and first emission for the pending slot's absence."* This conflated TWO distinct cases that both happen to return `null`:
- **A: state matches a slot, but user didn't provide that slot** (e.g., pending=true, no `pending` slot in user's template). Common case, intentional, normal usage.
- **B: state doesn't match any slot** (impossible given useAsyncAtom's normal semantics, but possible via the undefined-sentinel collision documented above).

The original wording said #4 only covered case B (and even mis-described case B as a "brief gap"). My own test 4 actually exercises case A. The spec was self-inconsistent.

**Why it happened:** When two distinct conditions produce the same observable output (both render null), it's tempting to fold them into a single POST clause. Doing so erases the *reason* for the null, which matters when readers later try to debug "why is nothing rendering?"

**Fix:** Split the spec POST into two explicit clauses — the priority-ordered branch selection (cases 1-4 by state) AND a separate "if the selected slot is NOT provided by the user, returns null" clause. The two paths to null are now visibly distinct.

**For future agents:** when writing POST conditions, **distinguish observable outputs by their cause, not just their value.** Two paths to the same return value that have different causes need separate clauses. Otherwise a future debugger reads the spec, sees "returns null," and can't tell which path they're hitting.

---
