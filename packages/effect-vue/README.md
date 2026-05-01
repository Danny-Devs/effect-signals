# effect-vue

The simplest install for Vue 3 bindings to [Effect-TS](https://effect.website).

This package is a thin re-export of [`@effect-vue/core`](../core) — same API, shorter name. Use whichever import path you prefer:

```bash
pnpm add effect-vue effect vue           # this package
# OR
pnpm add @effect-vue/core effect vue     # the core package directly
```

```ts
import { AtomBoundary, createAtom, useAsyncAtom } from "effect-vue"
// equivalent to: import ... from "@effect-vue/core"
```

Both packages version in lockstep. See the [main README](../../README.md) for the 30-second tour, the 6-composable surface, and links to architecture / specs / examples.

## License

MIT
