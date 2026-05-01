<script setup lang="ts">
import {
  AtomBoundary,
  createAtom,
  familyAtom,
  provideAtomRuntime,
  useAsyncAtom,
  useMatch,
} from "@effect-vue/core"
import { Context, Effect, Layer, Match, Schedule, Stream } from "effect"

// 1. Plain value atom — equivalent to ref()
const counter = createAtom(0)

// 2. Effect atom — auto-resolves
const greeting = createAtom(
  Effect.succeed("hello, effect-vue").pipe(
    Effect.delay("250 millis"),
  ),
)

// 3. Stream atom — subscribes to emissions
const ticker = createAtom(
  Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
    Stream.schedule(Schedule.spaced("400 millis")),
  ),
)

// 4. useAsyncAtom — typed errors via the error ref
const success = useAsyncAtom(
  Effect.succeed("loaded successfully").pipe(Effect.delay("400 millis")),
)
const failed = useAsyncAtom(
  Effect.fail(new Error("intentional failure")).pipe(Effect.delay("600 millis")) as Effect.Effect<string, Error>,
)

// 5. Layer-injected runtime — typed DI bridge
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

// 6. familyAtom — parametric atom factory; same key returns same Ref
const userFamily = familyAtom((id: string) =>
  Effect.succeed({ id, name: `User-${id}` }).pipe(Effect.delay("500 millis")),
)
const alice = userFamily("alice")
const bob = userFamily("bob")
const aliceAgain = userFamily("alice") // cache hit — alice === aliceAgain

// 7. AtomBoundary — slot dispatch on AsyncAtomState
//    (the ergonomic alternative to the raw v-if/v-else-if/v-else used in section 4)
const boundedSuccess = useAsyncAtom(
  Effect.succeed({ items: ["a", "b", "c"] }).pipe(Effect.delay("450 millis")) as Effect.Effect<{ items: string[] }, Error>,
)

// 8. useMatch — bridge a Ref to Effect.Match
type ViewState =
  | { _tag: "Idle" }
  | { _tag: "Loading" }
  | { _tag: "Loaded", value: number }
  | { _tag: "Failed", reason: string }

const viewState = createAtom<ViewState>({ _tag: "Idle" })
const matched = useMatch(viewState, state =>
  Match.value(state).pipe(
    Match.tag("Idle", () => "press a button to begin"),
    Match.tag("Loading", () => "⏳ loading..."),
    Match.tag("Loaded", ({ value }) => `✅ got ${value}`),
    Match.tag("Failed", ({ reason }) => `❌ ${reason}`),
    Match.exhaustive,
  ))

function increment() {
  counter.value += 1
}

function loadMatch() {
  viewState.value = { _tag: "Loading" }
  setTimeout(() => {
    viewState.value = { _tag: "Loaded", value: Math.floor(Math.random() * 100) }
  }, 600)
}

function failMatch() {
  viewState.value = { _tag: "Loading" }
  setTimeout(() => {
    viewState.value = { _tag: "Failed", reason: "simulated outage" }
  }, 600)
}
</script>

<template>
  <main>
    <h1>effect-vue — basic example</h1>
    <p class="intro">
      Live demo of all six composables. Each section is independent — read top
      to bottom or jump to whichever pattern interests you.
    </p>

    <section>
      <h2>1. createAtom (plain value) — atoms ARE Vue refs</h2>
      <p>Counter: <strong>{{ counter }}</strong></p>
      <button @click="increment">
        increment
      </button>
    </section>

    <section>
      <h2>2. createAtom (Effect) — auto-resolves</h2>
      <p>Greeting: <strong>{{ greeting ?? "pending..." }}</strong></p>
    </section>

    <section>
      <h2>3. createAtom (Stream) — subscribes to emissions</h2>
      <p>Ticker: <strong>{{ ticker ?? "waiting..." }}</strong></p>
    </section>

    <section>
      <h2>4. useAsyncAtom — typed errors via the error ref</h2>
      <p v-if="success.pending.value">
        ⏳ pending (success path)...
      </p>
      <p v-else>
        ✅ {{ success.data.value }}
      </p>

      <p v-if="failed.pending.value">
        ⏳ pending (failure path)...
      </p>
      <p v-else-if="failed.error.value">
        ❌ caught typed error: {{ failed.error.value.message }}
      </p>
      <p v-else>
        ✅ {{ failed.data.value }}
      </p>
    </section>

    <section>
      <h2>5. provideAtomRuntime + Layer DI</h2>
      <p v-if="layered.pending.value">
        ⏳ pending...
      </p>
      <p v-else>
        ✅ {{ layered.data.value }}
      </p>
    </section>

    <section>
      <h2>6. familyAtom — parametric atom factory</h2>
      <p>Alice (key "alice"): <strong>{{ alice?.name ?? "loading..." }}</strong></p>
      <p>Bob (key "bob"): <strong>{{ bob?.name ?? "loading..." }}</strong></p>
      <p class="note">
        <code>userFamily("alice") === userFamily("alice")</code> →
        <strong>{{ alice === aliceAgain }}</strong> (same key, same Ref)
      </p>
    </section>

    <section>
      <h2>7. &lt;AtomBoundary&gt; — the same pattern as section 4, with slots</h2>
      <p class="note">
        Compare to section 4 above (raw <code>v-if</code> chain). AtomBoundary
        narrows slot scopes (<code>data: A</code> not <code>A | undefined</code>).
      </p>
      <AtomBoundary :state="boundedSuccess">
        <template #pending>
          <p>⏳ AtomBoundary pending slot</p>
        </template>
        <template #error="{ error }">
          <p>❌ {{ error.message }}</p>
        </template>
        <template #default="{ data }">
          <p>✅ items: {{ data.items.join(", ") }}</p>
        </template>
      </AtomBoundary>
    </section>

    <section>
      <h2>8. useMatch — Vue × Effect.Match bridge</h2>
      <p>State: <strong>{{ matched }}</strong></p>
      <button @click="loadMatch">
        simulate load
      </button>
      <button @click="failMatch">
        simulate failure
      </button>
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
.intro {
  color: #666;
  font-size: 0.95rem;
  margin: 0 0 1.5rem;
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
.note {
  font-size: 0.85rem;
  color: #777;
  margin: 0.5rem 0;
}
code {
  background: #f3f4f6;
  padding: 0.1rem 0.3rem;
  border-radius: 0.2rem;
  font-size: 0.85rem;
}
button {
  padding: 0.5rem 1rem;
  margin-right: 0.5rem;
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
