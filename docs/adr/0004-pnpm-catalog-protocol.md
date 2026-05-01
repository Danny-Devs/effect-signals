# ADR-0004: pnpm 9 `catalog:` protocol for shared dependency versions

**Status:** Accepted
**Date:** 2026-04-30

## Context

In a monorepo, multiple packages often need the same external dependency at the same version (e.g., `effect`, `vue`, `vitest`, `typescript`). Without coordination, version drift creeps in:
- `packages/core` declares `effect@^3.10`
- `packages/nuxt` declares `effect@^3.11`
- A subtle behavioral difference between 3.10 and 3.11 causes an integration test to fail in mysterious ways.

Traditional solutions:
- **Manual sync:** copy versions across package.jsons. Error-prone.
- **Hoisting tools (lerna's bootstrap, syncpack):** external tooling, additional layer.
- **Catalog protocol (pnpm 9+):** declare versions ONCE in `pnpm-workspace.yaml`, packages reference them via `"effect": "catalog:"`.

## Decision

**Use pnpm 9 catalog protocol for ALL shared dependencies.**

`pnpm-workspace.yaml`:
```yaml
catalog:
  effect: ^3.10.0
  vue: ^3.5.0
  tsdown: ^0.21.0
  typescript: ^5.6.0
  vitest: ^2.1.0
  # etc.
```

`packages/core/package.json`:
```json
{
  "peerDependencies": {
    "effect": "catalog:",
    "vue": "catalog:"
  },
  "devDependencies": {
    "tsdown": "catalog:",
    "typescript": "catalog:"
  }
}
```

When pnpm installs, `catalog:` resolves to the version declared in the workspace catalog. Single source of truth.

## Alternatives considered

- **Direct version strings in each package.json:** rejected — invites drift.
- **`syncpack` external tool:** rejected — adds a tool whose only job is duplicating what catalog: does natively.
- **`workspace:*` for everything:** only works for internal packages, not external deps.

## Consequences

**Positive:**
- **Drift cannot happen.** Updating a version is a one-line edit in `pnpm-workspace.yaml`.
- **Onboarding is faster.** A new contributor running `pnpm install` gets the exact same dependency tree without coordination.
- **Renovate/dependabot updates apply once, propagate to all packages.**

**Negative:**
- **Requires pnpm 9+.** We mandate pnpm 9 in `packageManager` field — no support for npm or yarn. Trade-off accepted; pnpm is Danny's standard per `feedback_use_pnpm.md`.
- **Slight learning curve for contributors not familiar with catalog.** Solved by README mention.

**Risks:**
- If pnpm catalog API changes (it's relatively new — landed pnpm 9.5 area), we'd need to migrate. Low probability — pnpm has strong backwards compatibility track record.
