# AGENTS.md — how AI agents work in this repo

> Read this file first before doing any work in this repository.

## Reading order

1. **AGENTS.md** (this file) — rules + protocol
2. **ROADMAP.md** — what's coming, in what order
3. **PRINCIPLES.md** — design philosophy
4. **NON-GOALS.md** — what we explicitly won't build
5. **GLOSSARY.md** — ubiquitous language (atom, runtime, layer, fiber, scope)
6. **INVARIANTS.md** — constitutional rules (Tier 1, 2, 3)
7. **ARCHITECTURE.md** — bounded contexts + data flow
8. **CHANGELOG.md** (last 3 entries) — what changed recently
9. **LESSONS.md** — mistakes encoded against (skim for relevant entries; first entry is the R-tracking limitation in createAtom — already FIXED in slice 2)
10. **specs/*.allium** — behavioral specs for any composable you're touching
11. **docs/adr/** — architectural decision records
12. **HANDOFF.md** — current cursor position (where the previous agent left off, what's in flight, what's the immediate next action). **Regeneratable** — overwrite at end of every working session, do not append.

## Working rules

### Adding a new composable

1. Write the `specs/<composable>.allium` FIRST
2. Write failing tests that encode the spec
3. Implement to green
4. Refactor while green
5. Update INVARIANTS.md if a new constitutional rule emerges
6. Append to CHANGELOG.md

### Modifying an existing composable

1. Re-read its `.allium` spec first
2. If the spec needs to change, update the spec FIRST, get human review on the spec change
3. Update tests to match the new spec
4. Update implementation
5. Append to CHANGELOG.md

### Bundle size discipline

- `@effect-vue/core` MUST stay under 5KB gzip
- Run `pnpm --filter @effect-vue/core build` after any change; check the size in the output
- If size grows >0.5KB on a slice, justify in the CHANGELOG entry

### Test-first discipline (TDD)

- Red → green → refactor
- Property-based tests via `fast-check` for invariants
- Integration tests via `@vue/test-utils` for composable behavior
- Never commit a failing test or a skipped test without an open issue link

### Vapor-forward by construction

- Use ONLY composition API + reactivity primitives (`ref`, `computed`, `effectScope`, `onScopeDispose`, `provide`, `inject`)
- Avoid VDOM-specific APIs (`h()` with manual trees, functional render functions)
- SFCs compile to Vapor automatically; keep them simple
- Test in both VDOM and Vapor modes once Vapor is GA

### Effect-TS API discipline

- Pin Effect to `^3.x` peer dep — do not bundle it
- Use modern Effect 3.x patterns: `class MyTag extends Context.Tag(...)<Self, Service>() {}`
- Prefer `pipe(effect, op1, op2)` over method chains
- Use `Effect.tap` for side effects, `Effect.map` for transformations, `Effect.flatMap` for chaining

### Pre-commit hooks

- `simple-git-hooks` runs `lint-staged` on every commit
- `lint-staged` runs ESLint --fix
- Hook failures are signals — investigate, do not skip with `--no-verify`

### Commit message style

- Imperative, present tense (`feat: add useStream composable`)
- Type prefix: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Body explains WHY, not WHAT (the diff is the WHAT)
- Always include `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` when an agent contributed

### When in doubt

- Check the React analog (`@effect-atom/atom-react` by Tim Smart) for prior art
- BUT diverge where Vue idioms are cleaner
- Surface ambiguity to the human — do not invent semantics

## Maintenance grooming

If you discover a recurring mistake, encode it in this priority order:
1. ESLint rule (best — automated)
2. Test case / property (strong — fires every CI run)
3. Update to AGENTS.md or PRINCIPLES.md (medium)
4. LESSONS.md entry (always — even when higher tier exists; LESSONS explains *why* the rule exists)
