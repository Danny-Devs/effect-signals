# HANDOFF.md — current cursor position

> **Regeneratable, mutable, present-tense.** Updated (overwritten) at session end. A fresh AI agent or future-Danny reads this AND follows the canonical reading order in [`AGENTS.md` §Reading Order](./AGENTS.md). **This file does not duplicate that list** — single source of truth.
>
> **Last updated:** 2026-05-01 (post-Tier-1, post-GitHub-remote, post-CI-green)
> **Last updater:** Claude Opus 4.7 (1M context). This session took slice 4 from ~50% to **fully green on CI, awaiting only `npm publish`**: vue-tsc 2.x→3.x catalog bump (sabotage-verified through ADR-007's SFC slot machinery), INV-10 mechanical witness shipped (script + sabotage proof + prepublish wiring), fresh-install dogfood for both packages (caught one real surprise about `AsyncAtomState` shape), repo URL correction (`dannydevs` → `Danny-Devs`), `workspace:*` → `workspace:^` for caret semantics, CI workflow extended, GitHub remote created (`Danny-Devs/effect-vue`, public, with topics), TWO real CI-only failures caught and fixed (`@types/node` was hoisted not declared; build must precede typecheck), encoded as a new LESSONS.md entry.
> **Latest milestone archive:** [`handoffs/2026-04-30-slice-3-complete.md`](./handoffs/2026-04-30-slice-3-complete.md). Note: AtomBoundary's slice-3 implementation strategy was superseded by ADR-007 in slice 4; the archive remains accurate as historical record.

---

## STEP 0 — Verify this handoff is current (run BEFORE trusting anything below)

```bash
git log --oneline -1   # expect: most recent commit on this branch (a descendant of 3182825)
git status --short      # expect: empty (no working-tree changes)
```

If `git log --oneline -1` does NOT include the SHA below, **assume this handoff is stale** and verify everything below independently.

---

## Current commit on `main`

`32bfe5e` (or descendant) — *fix(ci): build before typecheck*. The publish-readiness chain is:

```
3182825 docs(s4): regenerate HANDOFF.md for night-end (slice 4 ~50%, Tier-1 publish-readiness next)
15b47e7 chore(s4): Tier-1 publish-readiness — vue-tsc 3 + INV-10 witness + dogfood
b055659 fix(ci): remove duplicate pnpm version pin
dd9c78b fix(deps): add @types/node as explicit devDep
32bfe5e fix(ci): build before typecheck
```

Re-derive with `git log --oneline -20`. CI is GREEN as of `32bfe5e`. GitHub remote: `https://github.com/Danny-Devs/effect-vue` (public).

## Slice status

- **Slice 1 (atoms + runtime):** ✅ SHIPPED
- **Slice 2 (async ergonomics + R-preservation):** ✅ SHIPPED
- **Slice 3 (families + boundaries + matching):** ✅ SHIPPED + REFACTORED in slice 4 (AtomBoundary → SFC per ADR-007)
- **Slice 4 (examples + docs + publish):** 🟢 **PUBLISH-READY**
  - ✅ `examples/basic` — Vue 3 + Vite app demonstrating ALL 6 composables
  - ✅ AtomBoundary refactored to `.vue` SFC (ADR-007 supersedes ADR-006)
  - ✅ README.md polish (install, quick-start, 6-composable table, examples link, learn-more)
  - ⏭️ `effect-vue` meta-package — DROPPED 2026-05-02 in favor of scope-only `@effect-vue/*` family (consistent with VueUse pattern; avoids future asymmetry when `@effect-vue/nuxt` and `@effect-vue/devtools` ship)
  - ✅ vue-tsc peer-dep mismatch resolved (catalog bumped to ^3.2.0; ADR-007 sabotage re-verified against vue-tsc 3.x)
  - ✅ Fresh-install dogfood (`pnpm pack` → /tmp dir → import + typecheck) for BOTH packages, with sabotage proofs
  - ✅ INV-10 mechanical witness — `scripts/verify-published-tarball.mjs`, wired to `prepublishOnly` and CI
  - ✅ publint clean on both packages
  - ✅ Repo URL corrected (`dannydevs` → `Danny-Devs`)
  - ✅ Meta dep semantics: `workspace:^` (caret — patch updates flow automatically)
  - ✅ CI workflow extended with INV-10 step + examples/basic dogfood gate
  - ✅ GitHub remote created — `Danny-Devs/effect-vue` (public), main pushed, topics set, description set, homepage set
  - ✅ CI green on the publish-readiness chain (run `25206075937` → all 8 steps ✓ on commit `32bfe5e`)
  - 📋 npm publish — **HUMAN-GATED.** Stop. Danny approves.
  - 📋 `examples/nuxt-ssr` — DEFERRED to Phase 2 / Nuxt package (per Danny 2026-04-30; not blocking publish)

## Live metrics (verify — do not trust this snapshot blindly)

```bash
pnpm test                                                # expect: 34/34 passing across 6 test files
pnpm typecheck                                           # expect: clean (core's 2 configs + meta's check)
pnpm lint                                                # expect: clean
pnpm --filter '@effect-vue/core' build                   # expect: 4.61 kB raw / 1.26 kB gzip
pnpm verify:tarballs                                     # expect: [INV-10] all packages verified
pnpm --filter '@effect-vue/example-basic' exec vue-tsc --noEmit   # expect: clean (dogfood gate)
cd packages/core && pnpm dlx publint                     # expect: All good!
```

## Next concrete action when this resumes

Local repo + GitHub remote are publish-ready. CI is green. ONE human-gated step remains:

### npm publish — HUMAN-GATED

```bash
# Verify all gates one final time
pnpm verify:tarballs && pnpm test && pnpm lint && pnpm typecheck

# Publish @effect-vue/core (the only headline package)
cd packages/core
pnpm publish --access public        # prepublishOnly runs INV-10 witness automatically

# Wait for npm to index it (usually <1 min)
pnpm view @effect-vue/core version  # expect: 0.1.0

# Verify it works in a fresh consumer
mkdir /tmp/effect-vue-postpublish && cd /tmp/effect-vue-postpublish
pnpm init
pnpm add @effect-vue/core vue effect
node -e "import('@effect-vue/core').then(m => console.log(Object.keys(m)))"
```

**Do not run `pnpm publish` without Danny's explicit go-ahead.** This is the single hard gate left.

### Post-publish housekeeping

- Tag the release: `git tag v0.1.0 && git push --tags` (only after both publishes succeed).
- Update GitHub repo's "About" with the actual npm URLs once published.
- Update `actions/checkout@v4`, `actions/setup-node@v4`, `pnpm/action-setup@v4` to Node 24-compatible versions before June 2, 2026 (CI annotation; not blocking).
- Phase 2 begins: `examples/nuxt-ssr` + `@effect-vue/nuxt` package.

## Cross-cutting open questions (still alive)

1. **`[NOT BLOCKING]` `provideAtomRuntime` auto-dispose** — orthogonal to composable correctness per slice-3 self-review. Resolve when long-running SPAs surface the cost.
2. **`[DEFER, v0.2 surgery]` `useAsyncAtom` discriminated-union state shape** — would resolve sentinel-undefined collision (LESSONS.md). The AtomBoundary regression test pins current behavior; flip together with the redesign.
3. **`[NOT BLOCKING]` ESLint rule for INV-9 import allowlist** — currently doc-only; ~30 LOC custom rule.
4. **`[BOOKMARKED PHASE 2]` Nuxt SSR example + `@effect-vue/nuxt` package** — explicit decision 2026-04-30 to defer to Phase 2 alongside the Nuxt package itself. NOT a slice 4 blocker.
5. **`[DOGFOOD-ONLY GAP]` Pre-publish meta-package consumer testing requires `pnpm.overrides`.** After core is on the registry this stops being relevant. Document this in a future contributing guide if external contributors will dogfood pre-publish; currently effect-vue is solo.

## Linear references

- **DAN-421** (Urgent) — `effect-vue` v0.1.0 program-level tracking. Slice 4 publish-ready as of 2026-05-01; awaiting human-gated `npm publish`.
- **DAN-422** (High) — dapp-kit-vue POC, dogfoods effect-vue. Begins after `effect-vue` v0.1.0 ships to npm.
- **DAN-423** (High) — Pinia Colada three-package split. Independent track.

## Bundle / quality budgets remaining (per INV-11, INV-13)

- Core bundle: **1.26 KB gzip currently**. Ceiling 5 KB. **~3.74 KB headroom.**
- TypeScript strictness: NEVER relaxed (INV-13).

## Strategic context

> Permanently filed in [`ROADMAP.md` §Strategic Context](./ROADMAP.md). HANDOFF retains a pointer; the substance lives in the durable doc.

## Things the next agent should NOT do

- Do not skip the pre-commit hook (`--no-verify` is forbidden per AGENTS.md).
- Do not write code before writing the corresponding `.allium` spec (INV-6).
- Do not cast at the boundary to silence the type system.
- Do not import VDOM constructors (`h`, `createVNode`, etc.) into core (INV-9 + ADR-006/ADR-007). `defineComponent` IS permitted; `.vue` SFC `<template>` blocks ARE the legitimate VNode-producing surface.
- **Do not run `npm publish` without explicit Danny approval.** HUMAN-GATED per CLAUDE.md.
- Do not commit without running `pnpm test && pnpm typecheck && pnpm lint && pnpm --filter '@effect-vue/core' build && pnpm verify:tarballs` and confirming all green.
- Do not duplicate the AGENTS.md reading order anywhere else.
- Do not introduce a public API in any slice without ALSO adding a consumer that exercises it the way users will (dogfooding done-criteria).
- Do not assume internal tests prove user-facing contracts hold.
- Do not bundle multiple concerns into a single composable for ergonomics — minimal primitives compose better.
- Do not forget to publish `@effect-vue/core` BEFORE `effect-vue` (the meta-package depends on it being on the registry).
- Do not run `prepublishOnly` manually — it runs automatically inside `pnpm publish`. Manual invocation outside that flow could mask actual publish-time failures.

## Session-end note (2026-05-01)

Slice 4 is publish-ready, **CI is green**, GitHub remote is live, and the only remaining gate is `npm publish` (human-gated). Five findings worth filing:

1. **vue-tsc 2.x → 3.x was risk-free thanks to ADR-007's discipline.** AtomBoundary's `<script setup generic>` syntax is exactly what volar 2's rewrite was engineered to preserve. The sabotage assertion produced an identical error message under both vue-tsc versions. The lesson: aligning your authoring surface with the framework's blessed patterns is what makes ecosystem upgrades cheap.
2. **Fresh-install dogfood caught a real consumer-shape surprise.** `AsyncAtomState<A, E>` is the `{ data, error, pending }` ref triple itself, not a wrapper. Internal tests passed because they only used `useAsyncAtom`'s return type indirectly via `ReturnType<typeof ...>`; the dogfood forced a direct construction and surfaced the actual shape.
3. **Pre-publish dogfood for the meta-package requires `pnpm.overrides`.** When `@effect-vue/core` isn't on npm yet, `pnpm add effect-vue.tgz` fails with 404. `pnpm.overrides` redirects to the local tarball. After publish this stops being relevant.
4. **CI caught two failures invisible to local internal verification.** All local gates were green (test, typecheck, lint, INV-10 witness, publint, two fresh-install dogfoods); CI failed twice — first on `@types/node` not being a declared dep (was hoisted from a transitive locally), then on `dist/` not existing on a clean checkout (typecheck ran before build). Both fixed; both encoded in LESSONS.md as the **clean-checkout dogfood requirement**: internal verification + tarball dogfood + clean CI run is the minimum bar.
5. **`pnpm/action-setup@v4` rejects duplicate version specifications.** If `version:` is set in the workflow AND `packageManager:` is set in package.json, the action fails. Prefer the package.json source of truth and omit `version:` from the workflow.

Single hard gate remaining: **`npm publish`.** Everything else is done.
