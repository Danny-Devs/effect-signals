# Handoff archive: 2026-04-30 — Slice 3 complete

> **Milestone archive entry.** Captures the end-of-slice state for Slice 3 (families + boundaries + pattern matching). Curated for future re-reading; NOT regenerated. Companion to `HANDOFF.md` (live cursor).

## What landed in Slice 3

Three composables shipped, all with full S3 spec stack discipline (Allium spec → tests → impl → docs → self-review → fix):

| Composable | LOC | Tests | Bundle Δ (gzip) | Self-review caught |
|---|---|---|---|---|
| `familyAtom(factory)` | ~50 | 6 | +0.19 kB | False-confidence cleanup test (asserted no-throw, didn't prove interruption) |
| `<AtomBoundary>` | ~40 | 6 | +0.19 kB | Sentinel-undefined collision + muddled spec POST condition |
| `useMatch(source, matcher)` | ~5 | 6 | +0.04 kB | Nothing (minimal primitive — zero bug surface) |

**Final bundle:** 4.15 kB raw / 1.09 kB gzip — well under INV-8's 5 kB ceiling (~3.91 kB headroom).
**Final test count:** 28/28 passing across 5 test files.
**Slice 3 commit count:** 11 commits.

## Constitutional changes

- **ADR-006**: clarified INV-9 to permit `defineComponent` (runtime no-op) while explicitly forbidding VDOM constructors (`h`, `createVNode`, `createElementVNode`, `createBlock`, `createElementBlock`, `Fragment`, `Text`, `Comment`). Test code retains the `h` carve-out for component-mounting test utilities. ESLint enforcement is still doc-only (TODO).

## Lessons captured (LESSONS.md)

Six entries added during slice 3:
1. R-tracking from slice 2 (carried forward, marked FIXED)
2. Handoff documents must not duplicate reading orders
3. Handoff state assertions need verification commands
4. Strategic context belongs in stable docs, not regeneratable handoffs
5. Test names that overstate verified behavior (familyAtom self-review)
6. Cross-AI review must be scope-bounded; review ≠ implement
7. Sentinel-undefined collision in `Ref<A | undefined>` state shapes (AtomBoundary self-review)
8. Spec POST conditions must distinguish "no matching state" from "no provided slot"
9. Minimal primitives produce zero-bug surface; complex primitives produce hidden bugs

## Architecture growth

`ARCHITECTURE.md` bounded contexts went from 8 to 9 (added Boundaries as #6, split from Async ergonomics so useAsyncAtom can be consumed by template-only patterns without dragging AtomBoundary into the bundle). Three contexts moved from "(deferred)" or "(slice 3)" to ✅ LIVE: Families, Boundaries, Pattern matching.

## What was deferred from Slice 3

- **Effect-aware `deriveAtom`** — no user demand emerged; deferred indefinitely
- **DevTools breadcrumb hooks (interfaces only)** — coupled to the actual DevTools panel design (Phase 3 / `@effect-vue/devtools`); deferred to slice 4 or Phase 3 to design the interface and panel together rather than risk interface drift

## Cross-cutting open questions surviving Slice 3

1. **`provideAtomRuntime` auto-dispose** — still NOT a blocker per familyAtom self-review analysis. Resolve when long-running SPAs make the cost visible.
2. **`useAsyncAtom` discriminated-union state shape (v0.2)** — would resolve the sentinel-undefined collision documented in LESSONS.md. The AtomBoundary regression test pins the current behavior; when this lands, the test MUST flip and AtomBoundary MUST be updated in the same release.
3. **ESLint enforcement of INV-9 import allowlist** — currently doc-only; manual code review enforces. A custom rule would be ~30 LOC.

## What's next

**Slice 4 — examples + docs + publish.** Different cadence from slice 3 (composable shipping). Consists of:
- `examples/basic` — full demo of all six composables (createAtom, useAsyncAtom, familyAtom, AtomBoundary, useMatch, provideAtomRuntime)
- `examples/nuxt-ssr` — Nuxt SSR demo showing Layer-DI on server
- README polish + diagrams
- Publish `effect-vue` (meta-package re-exporting `@effect-vue/core`) AND `@effect-vue/core` to npm in lockstep
- Blog post + YouTube video (per ROADMAP Phase 5)

## Methodology validation

The self-review-after-each-composable discipline shipped 2 real bug fixes in slice 3 (familyAtom cleanup test, AtomBoundary sentinel-undefined limitation). Total cost: ~10-15% of implementation time. Total value: catching constitutional-rule violations before they ossify in shipped code. **The S3 11-layer spec stack is functioning as designed.** Future Swee projects should adopt the same discipline.

## Reading order to recover this state

1. AGENTS.md — rules + protocol
2. PRINCIPLES.md — design philosophy
3. NON-GOALS.md — what we explicitly won't build
4. GLOSSARY.md — ubiquitous language
5. INVARIANTS.md (especially INV-9 + ADR-006 link)
6. ARCHITECTURE.md (9 bounded contexts; 6 LIVE)
7. CHANGELOG.md (last 4 entries cover slice 3)
8. LESSONS.md (skim all 9 entries)
9. specs/*.allium (read the one for whatever you're touching)
10. docs/adr/ (skim 0001-0006)
11. HANDOFF.md (live cursor — regenerated each session)
