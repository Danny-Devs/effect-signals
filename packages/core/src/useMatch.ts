import { computed, type ComputedRef, type Ref } from "vue"

export function useMatch<I, A>(
  source: Ref<I> | ComputedRef<I>,
  matcher: (input: I) => A,
): ComputedRef<A> {
  return computed(() => matcher(source.value))
}
