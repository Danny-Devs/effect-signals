import { mount } from "@vue/test-utils"
import { Context, Effect, Layer, Stream } from "effect"
import { describe, expect, it } from "vitest"
import { defineComponent, h, nextTick } from "vue"
import { createAtom, provideAtomRuntime } from "../src/index.js"

describe("createAtom", () => {
  it("wraps a plain value as a Vue ref", () => {
    const Comp = defineComponent({
      setup() {
        const counter = createAtom(42)
        return () => h("div", { class: "result" }, String(counter.value))
      },
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".result").text()).toBe("42")
  })

  it("resolves a synchronous Effect into a ref", async () => {
    const Comp = defineComponent({
      setup() {
        const greeting = createAtom(Effect.succeed("hello, effect-vue"))
        return () => h("div", { class: "result" }, greeting.value ?? "pending")
      },
    })
    const wrapper = mount(Comp)
    await nextTick()
    expect(wrapper.find(".result").text()).toBe("hello, effect-vue")
  })

  it("starts pending and resolves a delayed Effect", async () => {
    const Comp = defineComponent({
      setup() {
        const greeting = createAtom(
          Effect.succeed("delayed").pipe(Effect.delay("10 millis")),
        )
        return () => h("div", { class: "result" }, greeting.value ?? "pending")
      },
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".result").text()).toBe("pending")
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(wrapper.find(".result").text()).toBe("delayed")
  })

  it("subscribes to a Stream and updates the ref on each emission", async () => {
    const Comp = defineComponent({
      setup() {
        const ticker = createAtom(Stream.fromIterable([1, 2, 3]))
        return () => h("div", { class: "result" }, ticker.value === undefined ? "pending" : String(ticker.value))
      },
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".result").text()).toBe("pending")
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.find(".result").text()).toBe("3")
  })

  it("plain non-Effect non-Stream objects pass through as values", () => {
    const obj = { foo: "bar" }
    const Comp = defineComponent({
      setup() {
        const wrapped = createAtom(obj)
        return () => h("div", { class: "result" }, wrapped.value.foo)
      },
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".result").text()).toBe("bar")
  })
})

describe("provideAtomRuntime / injectAtomRuntime", () => {
  it("injects a Layer-backed runtime into descendants", async () => {
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
        // R-tracking overload: createAtom now accepts Effects with requirements R
        // and relies on the injected runtime to satisfy them.
        const greeting = createAtom(Effect.flatMap(Greeter, g => g.hello()))
        return () => h("div", { class: "result" }, greeting.value ?? "pending")
      },
    })

    const Parent = defineComponent({
      setup() {
        provideAtomRuntime(GreeterLive)
        return () => h(Child)
      },
    })

    const wrapper = mount(Parent)
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.find(".result").text()).toBe("hello from layer")
  })
})
