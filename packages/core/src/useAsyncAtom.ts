import { Effect, Fiber, type ManagedRuntime } from "effect"
import { onScopeDispose, ref, type Ref } from "vue"
import { injectAtomRuntime } from "./runtime.js"

export interface AsyncAtomState<A, E> {
  readonly data: Ref<A | undefined>
  readonly error: Ref<E | undefined>
  readonly pending: Ref<boolean>
}

export function useAsyncAtom<A, E>(
  effect: Effect.Effect<A, E>,
): AsyncAtomState<A, E>
export function useAsyncAtom<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  runtime: ManagedRuntime.ManagedRuntime<R, never>,
): AsyncAtomState<A, E>
export function useAsyncAtom<A, E, R>(
  effect: Effect.Effect<A, E, R>,
): AsyncAtomState<A, E>
export function useAsyncAtom<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  runtimeOverride?: ManagedRuntime.ManagedRuntime<R, never>,
): AsyncAtomState<A, E> {
  const data = ref<A | undefined>(undefined) as Ref<A | undefined>
  const error = ref<E | undefined>(undefined) as Ref<E | undefined>
  const pending = ref(true)

  const runtime = runtimeOverride ?? injectAtomRuntime<R>()

  const program = Effect.match(effect, {
    onSuccess: (value) => {
      data.value = value
      pending.value = false
    },
    onFailure: (e) => {
      error.value = e
      pending.value = false
    },
  })

  const fiber = runtime
    ? runtime.runFork(program as Effect.Effect<void, never, R>)
    : Effect.runFork(program as Effect.Effect<void, never, never>)

  onScopeDispose(() => {
    Effect.runFork(Fiber.interrupt(fiber))
  })

  return { data, error, pending }
}
