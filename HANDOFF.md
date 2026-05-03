# HANDOFF.md — current cursor position

> **Regeneratable, mutable, present-tense.** Updated (overwritten) at session end. A fresh AI agent or future-Danny reads this AND follows the canonical reading order in [`AGENTS.md` §Reading Order](./AGENTS.md). **This file does not duplicate that list** — single source of truth.
>
> **Last updated:** 2026-05-02 (post-pivot — the "effect-vue → effect-signals" strategic pivot is locked)
> **Last updater:** Claude Opus 4.7 (1M context). This session went deep on architecture: discovered `@effect-atom/atom-vue` already exists (Tim Smart, dormant); discovered chain-reaction's own 220-LOC signal.ts; verified preact-signals' subscribe API as a strict superset of nanostores'; investigated Hayes's dapp-kit-next stack (Lit + nanostores); reviewed TanStack DB's IVM (not signals — different abstraction); locked the strategic direction.

---

## STEP 0 — Verify this handoff is current (run BEFORE trusting anything below)

```bash
git log --oneline -1   # expect: pivot commit (or descendant)
git status --short      # expect: empty
git remote -v           # expect: git@github.com:Danny-Devs/effect-signals.git
git tag -l "archive/*"  # expect: archive/effect-vue-pre-pivot-20260502
```

If any of these don't match, **assume this handoff is stale** and verify everything below independently.

---

## What just happened (the pivot, in 60 seconds)

This repo started as `effect-vue` — Vue 3 bindings for Effect-TS, atoms-are-Vue-refs, ~1.26 KB gzip. We took it through slices 1-4, shipped a publish-ready `@effect-vue/core@0.1.0` with green CI, INV-10 mechanical witness, fresh-install dogfood, sabotage-verified type fidelity.

Then we went deep on architectural review and concluded the Vue-only positioning was too narrow. **Pivot:** the project becomes `@effect-signals/*` — Effect-TS atoms over a `@preact/signals-core` substrate, with framework bindings for Vue / Solid / Svelte / Lit (NOT React — Tim Smart's `@effect-atom/atom-react` serves that). The existing Vue work becomes scaffolding for `@effect-signals/vue`.

The pre-pivot state is preserved at git tag `archive/effect-vue-pre-pivot-20260502` (historical reference; if the pivot fails for any reason, that's the recovery point).

---

## Current state of the repo

- **Git:** main is at the pivot commit (run `git log --oneline -3` to see it)
- **GitHub:** repo renamed to `Danny-Devs/effect-signals` (auto-redirects from old name)
- **Placeholder packages deleted:** no more `packages/devtools/` or `packages/nuxt/`
- **`packages/core/` still contains the OLD Vue-native code.** Its `package.json` still says `@effect-vue/core`. Refactoring this into `@effect-signals/core` + `@effect-signals/vue` shape is the next session's primary work.
- **CI is green** on the pivot commit (verify: `gh run list --repo Danny-Devs/effect-signals --limit 1`)

---

## Locked strategic decisions (do not relitigate)

1. **Pivot to `@effect-signals/*` is final.** No more debate. The reasoning is preserved in CHANGELOG's 2026-05-02 entry under "Why we're pivoting." Read it before re-opening the question.
2. **Substrate is `@preact/signals-core`.** Strict superset of nanostores' reactivity model. 12.7M dl/mo, mature, Lit Labs endorses it. NOT TC39 polyfill (proposal dormant). NOT extracted-from-chain-reaction-signals (deferred to Phase 3, earned later).
3. **NO React binding.** Tim Smart's `@effect-atom/atom-react` serves that audience. We're explicitly post-React.
4. **chain-reaction stays separate, on its own signal.ts.** No premature consolidation. If/when both libraries have traction and consolidation earns its keep, revisit. Today: leave it alone.
5. **DAN-422 (dapp-kit-vue contribution) stays parallel.** Built on Hayes Miston's existing nanostores substrate. No substrate critique; just ship the Vue wrapper. Separate engagement, separate repo.

---

## Next concrete action when this resumes

The structural refactor is multi-week work. Sequence:

### Phase 1 (likely 1-2 sessions): scaffold the new monorepo

1. **Reserve `@effect-signals` npm scope.** Danny needs to do this manually on npmjs.com — agents can't create scopes. (Goes in READY-QUEUE.)
2. **Restructure `packages/core/` → `packages/{core,vue}/`:**
   - Move existing `createAtom`, `useAsyncAtom`, `familyAtom`, `useMatch`, `provideAtomRuntime`, `injectAtomRuntime`, `<AtomBoundary>` SFC code → `packages/vue/src/`
   - Create new `packages/core/src/` with the Effect-aware atom abstractions over preact-signals
   - Update `packages/core/package.json` → `@effect-signals/core`
   - Create `packages/vue/package.json` → `@effect-signals/vue` (depends on `@effect-signals/core`)
3. **Add `@preact/signals-core` to catalog** in `pnpm-workspace.yaml`
4. **Refactor `packages/core/src/atom.ts`** to wrap preact-signals' `signal()` instead of Vue's `ref()`. The public type signature stays the same (`Ref<A | undefined>` from the Vue binding's perspective) — but the underlying primitive changes.
5. **Refactor `packages/vue/src/`** to be the Vue-binding layer: import preact-signals atoms from core, wrap each in Vue's `customRef` so consumers get back a Vue ref, set up the bidirectional sync via preact-signals `effect()`.
6. **Update tests** to verify both layers (core: preact-signals semantics; vue: Vue ref semantics).
7. **Update INV-9** (no VDOM imports) — still applies to core but interpretation changes since core has no Vue dep.
8. **Update INV-10 witness** to verify both packages' tarballs.
9. **Update CI workflow** to handle the new monorepo shape.

### Phase 2 (later): the publish ladder

10. Sabotage-verify the new architecture (the canonical "data.nonExistentField" sabotage in examples/basic should still trigger under the new shape).
11. Fresh-install dogfood for `@effect-signals/core` + `@effect-signals/vue` (both packages, both should typecheck cleanly from packed tarballs).
12. publint on both packages.
13. Update README + ADRs:
    - New ADR documenting the substrate choice (`@preact/signals-core`)
    - New ADR documenting the framework-binding pattern
    - Update existing ADR-002 ("Atom IS a Vue Ref") to a SUPERSEDED note pointing at the new ADR (atoms are now preact-signals; the Vue binding wraps them as refs)
    - ADR-007 (SFC slot generic propagation) survives unchanged — that decision still applies inside `@effect-signals/vue`
14. Final CI green.
15. **HUMAN-GATED:** Danny publishes `@effect-signals/core@0.1.0` then `@effect-signals/vue@0.1.0` to npm.

### Phase 3 (community-driven): more framework bindings

16. Document "How to write an `@effect-signals/<framework>` binding" — pattern doc using `@effect-signals/vue` as the reference.
17. Wait for community contributions of `@effect-signals/{solid,svelte,lit}` OR write them ourselves if demand surfaces.

---

## What lives in archive (do NOT delete)

- **Tag `archive/effect-vue-pre-pivot-20260502`** — full snapshot of the publish-ready `@effect-vue/core@0.1.0` state before the pivot. Recovery point if anything goes wrong.
- **`handoffs/2026-04-30-slice-3-complete.md`** — milestone archive from slice 3 completion.
- **CHANGELOG entries from before 2026-05-02** — append-only history of the Vue-native architecture's evolution. Don't edit; they're the record of how we got here.
- **LESSONS entries from before 2026-05-02** — same. Especially the "clean-checkout dogfood requirement" lesson, which still applies to the new architecture.

---

## Status of human gates (updated 2026-05-03)

1. ✅ **`@effect-signals` npm scope reserved** by Danny on May 2 2026.
2. 📋 **GitHub repo announcement** — repo renamed but no public announcement. Wait until `@effect-signals/core@0.1.0` ships to npm before any social posts.
3. 📋 **DAN-422 sequencing** (dapp-kit-vue contribution to Mysten) — open question: ship before or after `@effect-signals/core@0.1.0`? Independent decision; relationship-building / mindshare timing.

## Linear project — the multi-week refactor as discrete tasks

**Project:** [effect-signals](https://linear.app/dannydevs/project/effect-signals-395af5557c02)

**Phase 1 (scaffold, 7 issues):**
- [DAN-446](https://linear.app/dannydevs/issue/DAN-446) — P1.1 Add @preact/signals-core + restructure to packages/{core,vue}
- [DAN-447](https://linear.app/dannydevs/issue/DAN-447) — P1.2 Refactor @effect-signals/core: atom abstractions over preact-signals
- [DAN-448](https://linear.app/dannydevs/issue/DAN-448) — P1.3 Build @effect-signals/vue binding (customRef bridge)
- [DAN-449](https://linear.app/dannydevs/issue/DAN-449) — P1.4 Migrate composables: familyAtom, useAsyncAtom, useMatch, AtomBoundary
- [DAN-450](https://linear.app/dannydevs/issue/DAN-450) — P1.5 Update INV-9, INV-10 mechanical witness, CI workflow for two-package shape
- [DAN-451](https://linear.app/dannydevs/issue/DAN-451) — P1.6 Update tests + verify all gates green for two-package shape
- [DAN-452](https://linear.app/dannydevs/issue/DAN-452) — P1.7 Update specs + ADRs (ADR-002 superseded; ADR-008 preact-signals; ADR-009 framework-agnostic core)

**Phase 2 (publish ladder, 4 issues):**
- [DAN-453](https://linear.app/dannydevs/issue/DAN-453) — P2.1 Final verification: sabotage + fresh-install dogfood + publint
- [DAN-454](https://linear.app/dannydevs/issue/DAN-454) — P2.2 Update README + Prior Art section
- [DAN-455](https://linear.app/dannydevs/issue/DAN-455) — P2.3 HUMAN-GATED publish (core, then vue)
- [DAN-456](https://linear.app/dannydevs/issue/DAN-456) — P2.4 Tag v0.1.0 + announcement plan

**Phase 3 (community bindings, 3 issues):**
- [DAN-457](https://linear.app/dannydevs/issue/DAN-457) — P3.1 "How to add @effect-signals/<framework>" pattern doc
- [DAN-458](https://linear.app/dannydevs/issue/DAN-458) — P3.2 Track community contributions for Solid/Svelte/Lit bindings
- [DAN-459](https://linear.app/dannydevs/issue/DAN-459) — P3.3 Phase 4+ planning: @effect-signals/nuxt + @effect-signals/devtools

**Related issues outside this project:**
- [DAN-421](https://linear.app/dannydevs/issue/DAN-421) — original effect-vue v0.1.0 tracker, marked Done with pivot-supersession note
- [DAN-425](https://linear.app/dannydevs/issue/DAN-425) — npm scope reservations (effect-vue + effect-signals both done; @chain-reaction status TBD)
- [DAN-422](https://linear.app/dannydevs/issue/DAN-422) — dapp-kit-vue contribution to Mysten (parallel, independent of effect-signals)

## Note on directory location

Local working tree is currently at `/Users/dannydevs/repos/danny/projects/effect-vue-project/effect-vue/` — the folder name was NOT renamed during the pivot; that will move with Danny's broader `/repos/danny` restructure. The git remote (origin) correctly points at `git@github.com:Danny-Devs/effect-signals.git` regardless of local folder name. If you find the local folder has moved, update Linear pointers accordingly but the GitHub repo stays at `Danny-Devs/effect-signals`.

---

## Things the next agent should NOT do

- **Don't refactor chain-reaction's signal.ts.** It works; consolidation is deferred. If you're tempted, re-read CHANGELOG 2026-05-02's "What's NOT changing" section.
- **Don't propose substrate alternatives.** preact-signals is locked. TC39 polyfill, nanostores, custom signals, @vue/reactivity standalone — all considered, all rejected, with reasoning preserved in CHANGELOG.
- **Don't delete the archive tag.** It's the recovery point.
- **Don't publish anything to npm without explicit Danny approval.** This includes any new `@effect-signals/*` package. Same rule as before.
- **Don't push to GitHub remote without explicit Danny approval** — though pushing to `Danny-Devs/effect-signals` (the renamed repo) is fine for normal commits via `git push`; just don't release tags or publish without the human gate.
- **Don't write code before writing the corresponding `.allium` spec** (INV-6 still applies in the new architecture).
- **Don't add a React binding.** Explicit non-goal. Tim's atom-react is the answer for React users.

---

## Strategic context (durable insights from this pivot session)

> Permanently filed in [`ROADMAP.md` §Strategic Context](./ROADMAP.md). HANDOFF retains a pointer; the substance lives in the durable doc once we update ROADMAP for the new architecture.

Three durable insights from the May 2 pivot session:

1. **"Most agnostic" splinters into three axes** (framework-neutral, standards-aligned, mind-share-neutral) — no single substrate dominates all three. preact-signals optimizes adoption + brand recognition while staying framework-neutral; that's the right point on the trade-off.
2. **TanStack DB validates "build your own when the abstraction is wrong"** (they built IVM/differential-dataflow because signals weren't the right primitive for query views) — but it argues AGAINST building your own when the abstraction is correct, only the implementation differs. We're using preact-signals because signals ARE the right abstraction; TanStack built IVM because signals weren't.
3. **Substrate ownership is earned, not predicted.** Premature extraction of a shared signals package would create maintenance burden + bus-factor concerns before there's demonstrated demand. The right time to extract is when multiple downstream libraries surface a real need; not before.

---

## Session-end note (2026-05-02)

The architectural pivot is locked in. The codebase still has its old `@effect-vue/core` shape — that's by design (this commit is strategic direction, not code restructure). The next session's job is to actually do the structural refactor: move existing Vue-native code into a new `packages/vue/` directory, create a new `packages/core/` with preact-signals-substrate atoms, and wire the bidirectional sync.

If you're picking this up and feel like the pivot is wrong, **read the CHANGELOG's 2026-05-02 entry first** — the reasoning is captured there. If it's still wrong after reading, raise it with Danny before reopening the substrate or framework-target questions.
