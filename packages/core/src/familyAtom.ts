import { Effect, Fiber, type ManagedRuntime, Stream } from "effect"
import { type EffectScope, getCurrentScope, onScopeDispose, ref, type Ref } from "vue"
import { injectAtomRuntime } from "./runtime.js"

// Effect with no requirements
export function familyAtom<K, A, E>(
  factory: (key: K) => Effect.Effect<A, E>,
): (key: K) => Ref<A | undefined>
// Effect with requirements R, runtime passed explicitly (type-safe)
export function familyAtom<K, A, E, R>(
  factory: (key: K) => Effect.Effect<A, E, R>,
  runtime: ManagedRuntime.ManagedRuntime<R, never>,
): (key: K) => Ref<A | undefined>
// Stream with no requirements
export function familyAtom<K, A, E>(
  factory: (key: K) => Stream.Stream<A, E>,
): (key: K) => Ref<A | undefined>
// Stream with requirements R, runtime passed explicitly (type-safe)
export function familyAtom<K, A, E, R>(
  factory: (key: K) => Stream.Stream<A, E, R>,
  runtime: ManagedRuntime.ManagedRuntime<R, never>,
): (key: K) => Ref<A | undefined>
// Effect with requirements R, relying on injected runtime (unsafe)
export function familyAtom<K, A, E, R>(
  factory: (key: K) => Effect.Effect<A, E, R>,
): (key: K) => Ref<A | undefined>
// Stream with requirements R, relying on injected runtime (unsafe)
export function familyAtom<K, A, E, R>(
  factory: (key: K) => Stream.Stream<A, E, R>,
): (key: K) => Ref<A | undefined>
// Plain value (catch-all, declared last)
export function familyAtom<K, A>(factory: (key: K) => A): (key: K) => Ref<A>
export function familyAtom<K, A, E, R>(
  factory: (key: K) => A | Effect.Effect<A, E, R> | Stream.Stream<A, E, R>,
  runtimeOverride?: ManagedRuntime.ManagedRuntime<R, never>,
): (key: K) => Ref<A> | Ref<A | undefined> {
  // Resolve the runtime ONCE at familyAtom call time (not per-key) — this lets
  // family(key) be called from event handlers, watchers, microtasks, anywhere.
  // injectAtomRuntime() internally guards on getCurrentInstance(), so calling
  // familyAtom from a bare effectScope returns undefined cleanly (no Vue warning).
  const runtime = runtimeOverride ?? injectAtomRuntime<R>()
  const parentScope: EffectScope | undefined = getCurrentScope()
  const cache = new Map<K, Ref<A> | Ref<A | undefined>>()

  return (key: K): Ref<A> | Ref<A | undefined> => {
    const cached = cache.get(key)
    if (cached !== undefined) {
      return cached
    }

    let member: Ref<A> | Ref<A | undefined>
    if (parentScope) {
      // Family was created inside an active scope. Run member creation inside
      // that scope so onScopeDispose binds to the family's scope (not the
      // call-site's transient scope). If parentScope.run returns undefined the
      // captured scope has been stopped — throw rather than silently leak a fiber.
      const created = parentScope.run(() => createMember(factory(key), runtime))
      if (created === undefined) {
        throw new Error(
          "familyAtom: cannot create new member — the family's parent scope has been disposed. "
          + "Cached members remain valid; only NEW keys cannot be added after disposal.",
        )
      }
      member = created
    }
    else {
      // Family was created outside any active scope (e.g., at module top level).
      // Fall back to scopeless creation — matches createAtom's loose semantic.
      // Documented limitation: fibers spawned this way run untracked until page unload.
      member = createMember(factory(key), runtime)
    }
    cache.set(key, member)
    return member
  }
}

function createMember<A, E, R>(
  source: A | Effect.Effect<A, E, R> | Stream.Stream<A, E, R>,
  runtime: ManagedRuntime.ManagedRuntime<R, never> | undefined,
): Ref<A> | Ref<A | undefined> {
  if (Effect.isEffect(source)) {
    const state = ref<A | undefined>(undefined) as Ref<A | undefined>
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
