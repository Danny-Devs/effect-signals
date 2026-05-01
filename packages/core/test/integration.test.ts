import { mount } from "@vue/test-utils"
import { Context, Effect, Layer, Match } from "effect"
import { describe, expect, it } from "vitest"
import { computed, defineComponent, h, nextTick } from "vue"
import {
  AtomBoundary,
  familyAtom,
  provideAtomRuntime,
  useAsyncAtom,
  useMatch,
} from "../src/index.js"

// End-of-slice-3 cross-composable integration tests. Each test exercises a
// composition pattern that NO single composable's test file covers. Bugs found
// here are interaction bugs — invisible to per-composable self-review.

describe("integration: cross-composable composition", () => {
  it("provideAtomRuntime + familyAtom + AtomBoundary in a nested component tree", async () => {
    // The canonical "real app" pattern: parent provides runtime, child uses
    // familyAtom backed by a Layer-injected service, grandchild renders via
    // AtomBoundary. Tests that the runtime injection survives across multiple
    // setup() boundaries and that family members render correctly.

    class UserService extends Context.Tag("test/UserService")<
      UserService,
      { readonly fetchUser: (id: string) => Effect.Effect<{ id: string, name: string }> }
    >() {}

    const UserServiceLive = Layer.succeed(UserService, {
      fetchUser: (id: string) =>
        Effect.succeed({ id, name: `User-${id}` }).pipe(Effect.delay("10 millis")),
    })

    const Grandchild = defineComponent({
      components: { AtomBoundary },
      props: {
        userId: { type: String, required: true },
      },
      setup(props) {
        const userFamily = familyAtom((id: string) =>
          Effect.flatMap(UserService, s => s.fetchUser(id)),
        )
        const userRef = userFamily(props.userId)
        // Adapt familyAtom's Ref<A | undefined> to AsyncAtomState shape so
        // AtomBoundary can consume it. This adaptation reveals whether
        // familyAtom + AtomBoundary "naturally" compose (they don't — see
        // integration test below for the gap).
        const state = {
          data: userRef,
          error: computed(() => undefined as Error | undefined),
          pending: computed(() => userRef.value === undefined),
        }
        return { state }
      },
      template: `
        <AtomBoundary :state="state">
          <template #pending><span class="cell">…</span></template>
          <template #default="{ data }"><span class="cell">{{ data.name }}</span></template>
        </AtomBoundary>
      `,
    })

    const Child = defineComponent({
      components: { Grandchild },
      template: `
        <div>
          <Grandchild user-id="alice" />
          <Grandchild user-id="bob" />
        </div>
      `,
    })

    const Parent = defineComponent({
      components: { Child },
      setup() {
        provideAtomRuntime(UserServiceLive)
      },
      template: `<Child />`,
    })

    const wrapper = mount(Parent)
    // Both grandchildren show pending initially
    const pendings = wrapper.findAll(".cell").map(w => w.text())
    expect(pendings).toEqual(["…", "…"])

    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    const resolved = wrapper.findAll(".cell").map(w => w.text())
    expect(resolved).toEqual(["User-alice", "User-bob"])
  })

  it("useMatch on a familyAtom member preserves type fidelity", async () => {
    // Tests that useMatch correctly handles the Ref<A | undefined> type that
    // familyAtom produces. The matcher must be exhaustive across both undefined
    // (pending) and the resolved type. This validates that the union type
    // doesn't cause TS inference to widen unexpectedly.

    const Comp = defineComponent({
      setup() {
        const numberFamily = familyAtom((seed: number) =>
          Effect.succeed(seed * 2).pipe(Effect.delay("10 millis")),
        )
        const fortyTwo = numberFamily(21)
        const display = useMatch(fortyTwo, value =>
          Match.value(value).pipe(
            Match.when(undefined, () => "loading"),
            Match.when(Match.number, n => `result:${n}`),
            Match.exhaustive,
          ))
        return () => h("div", { class: "result" }, display.value)
      },
    })

    const wrapper = mount(Comp)
    expect(wrapper.find(".result").text()).toBe("loading")
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()
    expect(wrapper.find(".result").text()).toBe("result:42")
  })

  it("useAsyncAtom + AtomBoundary + useMatch chained: state-derived display via match", async () => {
    // Real-world pattern: useAsyncAtom produces typed state, useMatch derives
    // a display string from the state's data ref, AtomBoundary handles the
    // pending/error UI shell. This exercises the most common 3-composable chain.

    interface FetchError { code: number, message: string }

    const Comp = defineComponent({
      components: { AtomBoundary },
      setup() {
        const state = useAsyncAtom(
          Effect.succeed({ kind: "ok" as const, count: 5 }).pipe(Effect.delay("10 millis")) as Effect.Effect<{ kind: "ok", count: number }, FetchError>,
        )
        const summary = useMatch(state.data, data =>
          data === undefined ? "" : `Count: ${data.count}`)
        return { state, summary }
      },
      template: `
        <AtomBoundary :state="state">
          <template #pending><span class="cell">loading</span></template>
          <template #error="{ error }"><span class="cell">err:{{ error.code }}</span></template>
          <template #default><span class="cell">{{ summary }}</span></template>
        </AtomBoundary>
      `,
    })

    const wrapper = mount(Comp)
    expect(wrapper.find(".cell").text()).toBe("loading")
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()
    expect(wrapper.find(".cell").text()).toBe("Count: 5")
  })

  it("[KNOWN GAP] familyAtom does not naturally compose with AtomBoundary — adapter needed", async () => {
    // Documents the integration gap explicitly: familyAtom returns
    // Ref<A | undefined> but AtomBoundary requires AsyncAtomState<A, E> (the
    // {data, error, pending} triple). Users must manually adapt — there is no
    // built-in `familyAtomAsync` or `familyAtom.asAsyncState()` helper.
    //
    // This test pins the current (gap) behavior. If a future slice adds a
    // composition helper (e.g., `useFamilyAsync` returning AsyncAtomState),
    // this test should be supplemented with a happy-path version showing the
    // shorter usage.

    const family = familyAtom((id: string) =>
      Effect.succeed(`hello-${id}`).pipe(Effect.delay("10 millis")),
    )

    // The user must construct AsyncAtomState manually:
    const Comp = defineComponent({
      components: { AtomBoundary },
      setup() {
        const greeting = family("world")
        const state = {
          data: greeting,
          error: computed(() => undefined as never | undefined),
          pending: computed(() => greeting.value === undefined),
        }
        return { state }
      },
      template: `
        <AtomBoundary :state="state">
          <template #pending><span class="cell">pending</span></template>
          <template #default="{ data }"><span class="cell">got:{{ data }}</span></template>
        </AtomBoundary>
      `,
    })

    const wrapper = mount(Comp)
    expect(wrapper.find(".cell").text()).toBe("pending")
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()
    expect(wrapper.find(".cell").text()).toBe("got:hello-world")
  })
})
