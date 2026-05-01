import { type Layer, ManagedRuntime } from "effect"
import { inject, type InjectionKey, provide } from "vue"

const ATOM_RUNTIME_KEY: InjectionKey<ManagedRuntime.ManagedRuntime<unknown, never>>
  = Symbol("EffectVueAtomRuntime")

export function provideAtomRuntime<R>(
  layer: Layer.Layer<R, never, never>,
): ManagedRuntime.ManagedRuntime<R, never> {
  const runtime = ManagedRuntime.make(layer)
  provide(
    ATOM_RUNTIME_KEY,
    runtime as unknown as ManagedRuntime.ManagedRuntime<unknown, never>,
  )
  return runtime
}

export function injectAtomRuntime<R = unknown>():
  | ManagedRuntime.ManagedRuntime<R, never>
  | undefined {
  // Pass `undefined` default so Vue does not warn when used outside a provider —
  // atoms fall back to Effect.runFork on the default runtime in that case.
  return inject(ATOM_RUNTIME_KEY, undefined) as
    | ManagedRuntime.ManagedRuntime<R, never>
    | undefined
}
