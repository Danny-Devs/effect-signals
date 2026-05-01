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
