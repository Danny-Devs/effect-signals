<script setup lang="ts" generic="A, E">
import type { AsyncAtomState } from "./useAsyncAtom.js"

defineProps<{ state: AsyncAtomState<A, E> }>()
defineSlots<{
  pending?: () => unknown
  error?: (scope: { error: E }) => unknown
  default?: (scope: { data: A }) => unknown
}>()
</script>

<template>
  <template v-if="state.pending.value">
    <slot name="pending" />
  </template>
  <template v-else-if="state.error.value !== undefined">
    <slot name="error" :error="state.error.value" />
  </template>
  <template v-else-if="state.data.value !== undefined">
    <slot :data="state.data.value" />
  </template>
</template>
