<script setup lang="ts">
import { createAtom, provideAtomRuntime, useAsyncAtom } from "@effect-vue/core"
import { Context, Effect, Layer } from "effect"

// 1. Plain value atom — equivalent to ref()
const counter = createAtom(0)

// 2. Effect atom — auto-resolves
const greeting = createAtom(
  Effect.succeed("hello, effect-vue").pipe(
    Effect.delay("250 millis"),
  ),
)

// 3. useAsyncAtom — typed errors via the error ref
const success = useAsyncAtom(
  Effect.succeed("loaded successfully").pipe(Effect.delay("400 millis")),
)
const failed = useAsyncAtom(
  Effect.fail(new Error("intentional failure")).pipe(Effect.delay("600 millis")) as Effect.Effect<string, Error>,
)

// 4. Layer-injected runtime — typed DI bridge
class Greeter extends Context.Tag("demo/Greeter")<
  Greeter,
  { readonly hello: () => Effect.Effect<string> }
>() {}

const GreeterLive = Layer.succeed(Greeter, {
  hello: () => Effect.succeed("hello from a Layer-provided service"),
})

provideAtomRuntime(GreeterLive)

const layered = useAsyncAtom(
  Effect.flatMap(Greeter, g => g.hello()).pipe(Effect.delay("800 millis")),
)

function increment() {
  counter.value += 1
}
</script>

<template>
  <main>
    <h1>effect-vue — basic example</h1>

    <section>
      <h2>1. Plain value atom (ref-equivalent)</h2>
      <p>Counter: <strong>{{ counter }}</strong></p>
      <button @click="increment">
        increment
      </button>
    </section>

    <section>
      <h2>2. Effect atom (auto-resolves)</h2>
      <p>Greeting: <strong>{{ greeting ?? "pending..." }}</strong></p>
    </section>

    <section>
      <h2>3. useAsyncAtom — success path</h2>
      <p v-if="success.pending.value">
        ⏳ pending...
      </p>
      <p v-else-if="success.error.value">
        ❌ error: {{ success.error.value.message }}
      </p>
      <p v-else>
        ✅ {{ success.data.value }}
      </p>
    </section>

    <section>
      <h2>4. useAsyncAtom — typed failure path</h2>
      <p v-if="failed.pending.value">
        ⏳ pending...
      </p>
      <p v-else-if="failed.error.value">
        ❌ caught typed error: {{ failed.error.value.message }}
      </p>
      <p v-else>
        ✅ {{ failed.data.value }}
      </p>
    </section>

    <section>
      <h2>5. Layer-injected runtime</h2>
      <p v-if="layered.pending.value">
        ⏳ pending...
      </p>
      <p v-else>
        ✅ {{ layered.data.value }}
      </p>
    </section>
  </main>
</template>

<style scoped>
main {
  font-family: system-ui, sans-serif;
  max-width: 720px;
  margin: 2rem auto;
  padding: 2rem;
}
section {
  margin-top: 1.5rem;
  padding: 1rem;
  border: 1px solid #e5e5e5;
  border-radius: 0.5rem;
}
h2 {
  font-size: 1.05rem;
  margin: 0 0 0.5rem;
  color: #555;
}
button {
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-radius: 0.25rem;
  border: 1px solid #aaa;
  background: white;
}
button:hover {
  background: #f5f5f5;
}
strong {
  color: #2563eb;
}
</style>
