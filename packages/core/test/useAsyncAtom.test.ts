import { mount } from "@vue/test-utils"
import { Context, Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { provideAtomRuntime, useAsyncAtom } from "../src/index.js"

describe("useAsyncAtom", () => {
  it("starts pending and resolves on Effect success", async () => {
    const Comp = defineComponent({
      setup() {
        const { data, error, pending } = useAsyncAtom(
          Effect.succeed("hello").pipe(Effect.delay("10 millis")),
        )
        return () => h("div", [
          h("span", { class: "data" }, data.value ?? "no-data"),
          h("span", { class: "error" }, error.value === undefined ? "no-error" : String(error.value)),
          h("span", { class: "pending" }, pending.value ? "pending" : "settled"),
        ])
      },
    })
    const wrapper = mount(Comp)

    expect(wrapper.find(".data").text()).toBe("no-data")
    expect(wrapper.find(".error").text()).toBe("no-error")
    expect(wrapper.find(".pending").text()).toBe("pending")

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.find(".data").text()).toBe("hello")
    expect(wrapper.find(".error").text()).toBe("no-error")
    expect(wrapper.find(".pending").text()).toBe("settled")
  })

  it("surfaces typed Effect.fail values via the error ref", async () => {
    const failure = new Error("boom") as Error
    const Comp = defineComponent({
      setup() {
        const { data, error, pending } = useAsyncAtom(
          Effect.fail(failure).pipe(Effect.delay("10 millis")) as Effect.Effect<string, Error>,
        )
        return () => h("div", [
          h("span", { class: "data" }, data.value ?? "no-data"),
          h("span", { class: "error" }, error.value?.message ?? "no-error"),
          h("span", { class: "pending" }, pending.value ? "pending" : "settled"),
        ])
      },
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".pending").text()).toBe("pending")

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.find(".data").text()).toBe("no-data")
    expect(wrapper.find(".error").text()).toBe("boom")
    expect(wrapper.find(".pending").text()).toBe("settled")
  })

  it("preserves INV-4 — pending precedes resolved with atomic transition exactly once", async () => {
    const transitions: string[] = []
    const Comp = defineComponent({
      setup() {
        const state = useAsyncAtom(
          Effect.succeed(42).pipe(Effect.delay("10 millis")),
        )
        // Snapshot every render
        return () => {
          transitions.push(`pending=${state.pending.value}/data=${state.data.value ?? "?"}`)
          return h("div", { class: "snapshot" }, transitions[transitions.length - 1])
        }
      },
    })
    const wrapper = mount(Comp)
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(transitions[0]).toBe("pending=true/data=?")
    expect(transitions[transitions.length - 1]).toBe("pending=false/data=42")
    // The transition is atomic: there must NOT be a render where pending=false AND data=undefined,
    // nor a render where pending=true AND data=42
    for (const t of transitions) {
      expect(t === "pending=true/data=42").toBe(false)
      expect(t === "pending=false/data=?").toBe(false)
    }
    wrapper.unmount()
  })

  it("works with Layer-injected runtime (typed)", async () => {
    class Greeter extends Context.Tag("test/Greeter")<
      Greeter,
      { readonly hello: () => Effect.Effect<string> }
    >() {}

    const GreeterLive = Layer.succeed(
      Greeter,
      { hello: () => Effect.succeed("hello from layer") },
    )

    const Child = defineComponent({
      setup() {
        const { data, pending } = useAsyncAtom(
          Effect.flatMap(Greeter, g => g.hello()),
        )
        return () => h("div", { class: "result" }, pending.value ? "pending" : (data.value ?? "no-data"))
      },
    })

    const Parent = defineComponent({
      setup() {
        provideAtomRuntime(GreeterLive)
        return () => h(Child)
      },
    })

    const wrapper = mount(Parent)
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(wrapper.find(".result").text()).toBe("hello from layer")
  })
})
