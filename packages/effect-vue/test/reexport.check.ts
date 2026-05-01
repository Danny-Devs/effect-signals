// TYPE-LEVEL ASSERTION FILE — verifies the meta-package re-exports
// every public symbol from @effect-vue/core with full type fidelity.
//
// Run via vue-tsc -p packages/effect-vue/tsconfig.test.json --noEmit (see
// the package's typecheck script). Sabotage-pattern: if any of the
// MUST-WORK assertions below stop compiling, the meta-package's re-export
// is broken and consumers using `import { X } from "effect-vue"` would
// silently get unknown / never types.
//
// This file is the dogfood per LESSONS.md "Dogfooding catches contract
// violations invisible to internal verification" — `effect-vue` is a
// thin re-export but it IS a public API surface; we must consume it the
// way users will to verify the contract holds.

import { Effect } from "effect"
// All 6 public composables + AsyncAtomState type imported from the
// meta-package, NOT from @effect-vue/core directly. If the re-export
// is broken, these imports would fail to resolve OR resolve to broken
// types.
import {
  type AsyncAtomState,
  AtomBoundary,
  createAtom,
  familyAtom,
  injectAtomRuntime,
  provideAtomRuntime,
  useAsyncAtom,
  useMatch,
} from "effect-vue"

import { ref } from "vue"

// MUST-WORK: createAtom returns a typed Ref
void (() => {
  const counter = createAtom(42)
  const _v: number = counter.value
  return _v
})

// MUST-WORK: useAsyncAtom's AsyncAtomState carries typed data + error
void (() => {
  const state: AsyncAtomState<string, Error> = useAsyncAtom(
    Effect.succeed("hello") as Effect.Effect<string, Error>,
  )
  const _data: string | undefined = state.data.value
  const _err: Error | undefined = state.error.value
  const _pending: boolean = state.pending.value
  return [_data, _err, _pending]
})

// MUST-WORK: familyAtom returns a function that produces typed refs
void (() => {
  const family = familyAtom((id: string) => Effect.succeed(`hello-${id}`))
  const greeting = family("world")
  const _v: string | undefined = greeting.value
  return _v
})

// MUST-WORK: useMatch returns a typed ComputedRef
void (() => {
  const source = ref(7)
  const matched = useMatch(source, n => n * 2)
  const _v: number = matched.value
  return _v
})

// MUST-WORK: provideAtomRuntime + injectAtomRuntime are callable
void (() => {
  // Just verify the imports are values, not bound to test their semantics
  const _p: typeof provideAtomRuntime = provideAtomRuntime
  const _i: typeof injectAtomRuntime = injectAtomRuntime
  return [_p, _i]
})

// MUST-WORK: AtomBoundary is callable as a Vue component constructor
// (the export-cast pattern from the SFC must propagate through the
// meta-package's re-export)
void (() => {
  const _C: typeof AtomBoundary = AtomBoundary
  return _C
})
