# ADR-0003: tsdown (Rolldown-based) for library builds

**Status:** Accepted
**Date:** 2026-04-30
**Supersedes:** none

## Context

We need to bundle `@effect-vue/core` to ESM with type declarations for npm publishing. Available choices in 2026:
- **tsup** — esbuild-based, mature, was the de-facto standard 2022-2024.
- **unbuild** — rollup-based, antfu's stack, polished CLI, used in many Vue ecosystem libraries (VueUse, vue-router).
- **tsdown** — Rolldown-based, by Evan You's VoidZero. Newer, gaining momentum in 2026 as the "Vite-native bundler for libraries."
- **rollup direct** — most flexible, most config.

## Decision

**tsdown.**

Rationale:
- Rolldown is what Vite is migrating to (Vite 6+ uses Rolldown). Aligning with Vite's bundler means our build internals match the framework we target — same dependency graph resolution, same plugin ecosystem.
- Speed: Rolldown is Rust-based and significantly faster than rollup-direct.
- Active maintenance under VoidZero (Evan You's company, now also responsible for Vite, Vue, and Pinia infrastructure).
- Excellent zero-config DX: `tsdown` with a 10-line config produces ESM + sourcemaps + .d.mts type declarations correctly.

## Alternatives considered

- **tsup:** strong default, but esbuild-based dts generation has historically had edge cases with complex generic types (and Effect-TS uses heavy generics). Rolldown's TypeScript handling is more robust as of 2026.
- **unbuild:** would be a strong choice — many Vue libraries use it. Slightly older infrastructure; Anthony Fu actively maintains it but the ecosystem is gravitating toward Rolldown-based tooling.
- **rollup direct:** rejected — too much config for the value. tsdown wraps rollup-equivalent (rolldown) with sensible defaults.

## Consequences

**Positive:**
- Build time: 666ms for `@effect-vue/core` slice 1 (lower as cache warms).
- Type declarations are .d.mts (ESM-typed), pairing correctly with .mjs output. Modern dual-package convention.
- Stays close to Vite's tooling story — when we add `@effect-vue/nuxt` (Phase 2), Vite/Nuxt's dev server uses the same underlying Rolldown.
- Matches the conventions of Eduardo Morote's `pinia` + `pinia-colada` repos and Evan's other libraries.

**Negative:**
- **Bleeding-edge versions can break.** Slice 1 hit this immediately: tsdown 0.5.10 had a `rolldown/experimental` API mismatch. Bumped catalog to ^0.21 (current stable as of 2026-04-30). Future versions may break again — pin tightly.
- **Smaller community than tsup.** Fewer Stack Overflow answers if we hit weird edge cases.

**Risks:**
- If Rolldown's API changes significantly before Vite 7 stabilizes, we may need to swap. Mitigation: encapsulate build config in `tsdown.config.ts` per package — a swap to unbuild would be a single-config-file change, not a code-touching migration.
