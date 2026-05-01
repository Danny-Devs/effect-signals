# ADR-0001: Monorepo from day one (no single-package-then-convert)

**Status:** Accepted
**Date:** 2026-04-30
**Deciders:** Danny (architectural call), Claude (consensus check across Anthony Fu / Evan You / Eduardo Morote / Effect-TS lenses)

## Context

When bootstrapping `effect-vue`, we faced a choice:
- **Option A:** Start as a single npm package (`@effect-vue/core` only), convert to monorepo when adding a second package (Phase 2 — `@effect-vue/nuxt`).
- **Option B:** Start as a pnpm workspace monorepo with `packages/core/` as the primary package and `packages/nuxt/` + `packages/devtools/` as empty placeholders.

Option A's appeal: lower initial complexity, fewer config files, faster slice 1.
Option A's cost: future migration is real engineering work (tsconfig refs, package.json layout, workspace declarations, build script reshaping). All of which is *pure tooling friction*, not learning that aids the goal.

## Decision

**Option B — start as a monorepo from day one.**

Layout:
```
effect-vue/
├── packages/
│   ├── core/        @effect-vue/core (slice 1+ primary)
│   ├── nuxt/        @effect-vue/nuxt (Phase 2 placeholder, empty stub)
│   └── devtools/    @effect-vue/devtools (Phase 3 placeholder, empty stub)
├── examples/
│   └── basic/       Vite + Vue 3 demo
├── pnpm-workspace.yaml (with `catalog:` protocol for shared deps)
├── tsconfig.json (root, with project references)
└── tsconfig.base.json (shared compiler options)
```

## Alternatives considered

- **Option A: single package, convert later** — rejected. The "learning" of single-to-monorepo conversion is fighting tsconfig + package.json plumbing, not concept. The concepts (atoms, fiber lifecycle, Layer DI) are identical in both layouts. Conversion is pure tax with no upside.
- **Option C: nx / turborepo / lerna** — rejected as over-engineering for a 3-package library. pnpm 9's native workspace + catalog support is sufficient. Smaller dependency footprint.

## Consequences

**Positive:**
- The monorepo *commits* to the multi-package vision from minute one. The empty `packages/nuxt/` folder is a promissory note — when Phase 2 begins, the architecture is already there.
- Shared `tsconfig.base.json` and pnpm catalog mean adding the second package is ~5 minutes of work (new directory + 2 config files), not a refactor.
- `examples/basic` consumes `@effect-vue/core` via `workspace:*` — instant feedback loop. Changing core source instantly reflects in the example. This is the dogfooding loop.
- All Effect-TS, Vue, Anthony Fu, Evan You, Eduardo Morote codebases use this exact pattern. We blend in.

**Negative:**
- Slightly more upfront config files (pnpm-workspace.yaml, tsconfig.base.json, root package.json scripts).
- Requires understanding pnpm workspace + catalog protocol — minor learning tax for new contributors.

**Risks:** None significant. If Phase 2 is never built, the empty placeholders cost ~10 lines of placeholder code each.
