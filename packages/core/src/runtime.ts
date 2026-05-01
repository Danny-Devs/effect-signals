import { type Layer, ManagedRuntime } from "effect"
import { getCurrentInstance, inject, type InjectionKey, provide } from "vue"

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
  // Vue's inject() emits a warning when called outside a component instance
  // (e.g., from a standalone effectScope). Atoms in such contexts cannot
  // benefit from injected runtimes anyway — fall through cleanly.
  if (!getCurrentInstance()) {
    return undefined
  }
  return inject(ATOM_RUNTIME_KEY, undefined) as
    | ManagedRuntime.ManagedRuntime<R, never>
    | undefined
}
