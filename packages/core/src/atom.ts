import { Effect, Fiber, type ManagedRuntime, Stream } from "effect"
import { onScopeDispose, ref, type Ref } from "vue"
import { injectAtomRuntime } from "./runtime.js"

export type AtomSource<A, E = never, R = never> =
  | A
  | Effect.Effect<A, E, R>
  | Stream.Stream<A, E, R>

// Effect with no requirements
export function createAtom<A, E>(source: Effect.Effect<A, E>): Ref<A | undefined>
// Effect with requirements R, runtime passed explicitly (type-safe)
export function createAtom<A, E, R>(
  source: Effect.Effect<A, E, R>,
  runtime: ManagedRuntime.ManagedRuntime<R, never>,
): Ref<A | undefined>
// Stream with no requirements
export function createAtom<A, E>(source: Stream.Stream<A, E>): Ref<A | undefined>
// Stream with requirements R, runtime passed explicitly (type-safe)
export function createAtom<A, E, R>(
  source: Stream.Stream<A, E, R>,
  runtime: ManagedRuntime.ManagedRuntime<R, never>,
): Ref<A | undefined>
// Effect with requirements R, relying on injected runtime (unsafe — runtime error if no provider)
export function createAtom<A, E, R>(source: Effect.Effect<A, E, R>): Ref<A | undefined>
// Stream with requirements R, relying on injected runtime (unsafe)
export function createAtom<A, E, R>(source: Stream.Stream<A, E, R>): Ref<A | undefined>
// Plain value (catch-all, declared last)
export function createAtom<A>(source: A): Ref<A>
export function createAtom<A, E, R>(
  source: AtomSource<A, E, R>,
  runtimeOverride?: ManagedRuntime.ManagedRuntime<R, never>,
): Ref<A> | Ref<A | undefined> {
  if (Effect.isEffect(source)) {
    const state = ref<A | undefined>(undefined) as Ref<A | undefined>
    const runtime = runtimeOverride ?? injectAtomRuntime<R>()

    const program = Effect.tap(
      source as Effect.Effect<A, E, R>,
      value => Effect.sync(() => {
        state.value = value
      }),
    )

    const fiber = runtime
      ? runtime.runFork(program as Effect.Effect<A, E, R>)
      : Effect.runFork(program as Effect.Effect<A, E, never>)

    onScopeDispose(() => {
      Effect.runFork(Fiber.interrupt(fiber))
    })

    return state
  }

  if (typeof source === "object" && source !== null && Stream.StreamTypeId in source) {
    const state = ref<A | undefined>(undefined) as Ref<A | undefined>
    const runtime = runtimeOverride ?? injectAtomRuntime<R>()

    const program = Stream.runForEach(
      source as Stream.Stream<A, E, R>,
      value => Effect.sync(() => {
        state.value = value
      }),
    )

    const fiber = runtime
      ? runtime.runFork(program as Effect.Effect<void, E, R>)
      : Effect.runFork(program as Effect.Effect<void, E, never>)

    onScopeDispose(() => {
      Effect.runFork(Fiber.interrupt(fiber))
    })

    return state
  }

  return ref(source as A) as Ref<A>
}
