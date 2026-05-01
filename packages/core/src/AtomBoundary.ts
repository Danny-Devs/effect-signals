import type { AsyncAtomState } from "./useAsyncAtom.js"
import { defineComponent, type PropType } from "vue"

export interface AtomBoundarySlots<A, E> {
  pending?: () => unknown
  error?: (scope: { error: E }) => unknown
  default?: (scope: { data: A }) => unknown
}

const AtomBoundaryImpl = defineComponent({
  name: "AtomBoundary",
  props: {
    state: {
      type: Object as PropType<AsyncAtomState<unknown, unknown>>,
      required: true,
    },
  },
  setup(props, { slots }) {
    return () => {
      const { state } = props
      if (state.pending.value) {
        return slots.pending?.() ?? null
      }
      const error = state.error.value
      if (error !== undefined) {
        return slots.error?.({ error }) ?? null
      }
      const data = state.data.value
      if (data !== undefined) {
        return slots.default?.({ data }) ?? null
      }
      return null
    }
  },
})

// Generic-typed export. Vue's defineComponent does not natively support generic
// components in `.ts` files (only in `.vue` SFCs via the `<script setup generic>`
// syntax), so we cast at the boundary. The runtime shape is unchanged; the cast
// recovers type-fidelity for slot scopes (data: A, error: E) per INV-2.
export const AtomBoundary = AtomBoundaryImpl as unknown as new<A, E>() => {
  $props: { state: AsyncAtomState<A, E> }
  $slots: {
    pending?: () => unknown
    error?: (scope: { error: E }) => unknown
    default?: (scope: { data: A }) => unknown
  }
}
