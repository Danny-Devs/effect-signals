import { Effect, Fiber, Stream } from "effect"
import { onScopeDispose, ref, type Ref } from "vue"
import { injectAtomRuntime } from "./runtime.js"

export type AtomSource<A, E = never> =
  | A
  | Effect.Effect<A, E>
  | Stream.Stream<A, E>

export function createAtom<A>(source: A): Ref<A>
export function createAtom<A, E>(source: Effect.Effect<A, E>): Ref<A | undefined>
export function createAtom<A, E>(source: Stream.Stream<A, E>): Ref<A | undefined>
export function createAtom<A, E>(source: AtomSource<A, E>): Ref<A | undefined> {
  if (Effect.isEffect(source)) {
    const state = ref<A | undefined>(undefined) as Ref<A | undefined>
    const runtime = injectAtomRuntime()

    const program = Effect.tap(source as Effect.Effect<A, E>, value =>
      Effect.sync(() => {
        state.value = value
      }))

    const fiber = runtime
      ? runtime.runFork(program as Effect.Effect<A, E, never>)
      : Effect.runFork(program as Effect.Effect<A, E, never>)

    onScopeDispose(() => {
      Effect.runFork(Fiber.interrupt(fiber))
    })

    return state
  }

  if (typeof source === "object" && source !== null && Stream.StreamTypeId in source) {
    const state = ref<A | undefined>(undefined) as Ref<A | undefined>
    const runtime = injectAtomRuntime()

    const program = Stream.runForEach(source as Stream.Stream<A, E>, value =>
      Effect.sync(() => {
        state.value = value
      }))

    const fiber = runtime
      ? runtime.runFork(program as Effect.Effect<void, E, never>)
      : Effect.runFork(program as Effect.Effect<void, E, never>)

    onScopeDispose(() => {
      Effect.runFork(Fiber.interrupt(fiber))
    })

    return state
  }

  return ref(source as A) as Ref<A | undefined>
}
