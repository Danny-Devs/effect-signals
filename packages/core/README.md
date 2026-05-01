# @effect-vue/core

Vue 3 bindings for Effect-TS. Atoms, runtime, composables.

## Install

```bash
pnpm add @effect-vue/core effect vue
```

## API (v0.1.0)

```ts
import { createAtom, injectAtomRuntime, provideAtomRuntime } from "@effect-vue/core"
```

### `createAtom`

Reactive container that wraps a value, an `Effect`, or a `Stream`.

```ts
import { createAtom } from "@effect-vue/core"
import { Effect } from "effect"

// Plain value — equivalent to Vue's ref()
const counter = createAtom(0)

// Effect — runs once on creation, atom updates with the result
const greeting = createAtom(Effect.succeed("hello, effect-vue"))

// In <template>: {{ greeting }} — Vue auto-unwraps the ref
```

### `provideAtomRuntime` / `injectAtomRuntime`

Bridge Effect's `Layer` typed DI to Vue's `provide`/`inject` hierarchy. Atoms in descendant components automatically use the provided runtime.

```ts
import { provideAtomRuntime } from "@effect-vue/core"
import { Layer } from "effect"

// in a parent's setup()
const runtime = provideAtomRuntime(MyAppLayer)
// children's createAtom(...) calls now use this runtime
```

## License

MIT
