<script setup lang="ts">
import { createAtom } from "@effect-vue/core"
import { Effect } from "effect"

const counter = createAtom(0)
const greeting = createAtom(
  Effect.succeed("hello, effect-vue").pipe(
    Effect.delay("250 millis"),
  ),
)

function increment() {
  counter.value += 1
}
</script>

<template>
  <main>
    <h1>effect-vue — basic example</h1>

    <section>
      <h2>Plain value atom</h2>
      <p>Counter: {{ counter }}</p>
      <button @click="increment">
        increment
      </button>
    </section>

    <section>
      <h2>Effect atom</h2>
      <p>Greeting: {{ greeting ?? "pending..." }}</p>
    </section>
  </main>
</template>

<style scoped>
main {
  font-family: system-ui, sans-serif;
  max-width: 640px;
  margin: 2rem auto;
  padding: 2rem;
}
section {
  margin-top: 2rem;
}
button {
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>
