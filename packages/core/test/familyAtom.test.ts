import { mount } from "@vue/test-utils"
import { Context, Effect, Layer, Stream } from "effect"
import { describe, expect, it } from "vitest"
import { defineComponent, effectScope, h, nextTick } from "vue"
import { familyAtom, provideAtomRuntime } from "../src/index.js"

describe("familyAtom", () => {
  it("returns the same Ref instance for the same key (cache hit)", () => {
    let factoryCalls = 0
    const Comp = defineComponent({
      setup() {
        const family = familyAtom((id: number) => {
          factoryCalls++
          return id * 2
        })
        const a = family(7)
        const b = family(7)
        const c = family(7)
        return () => h("div", { class: "result" }, [
          h("span", { class: "identity" }, a === b && b === c ? "same" : "different"),
          h("span", { class: "calls" }, String(factoryCalls)),
          h("span", { class: "value" }, String(a.value)),
        ])
      },
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".identity").text()).toBe("same")
    expect(wrapper.find(".calls").text()).toBe("1")
    expect(wrapper.find(".value").text()).toBe("14")
  })

  it("returns different Refs for different keys (cache miss)", () => {
    const Comp = defineComponent({
      setup() {
        const family = familyAtom((id: number) => `item-${id}`)
        const a = family(1)
        const b = family(2)
        return () => h("div", { class: "result" }, [
          h("span", { class: "identity" }, a === b ? "same" : "different"),
          h("span", { class: "a" }, a.value),
          h("span", { class: "b" }, b.value),
        ])
      },
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".identity").text()).toBe("different")
    expect(wrapper.find(".a").text()).toBe("item-1")
    expect(wrapper.find(".b").text()).toBe("item-2")
  })

  it("resolves Effect-based factory atoms asynchronously", async () => {
    const Comp = defineComponent({
      setup() {
        const family = familyAtom((id: string) =>
          Effect.succeed(`hello-${id}`).pipe(Effect.delay("10 millis")),
        )
        const greet = family("world")
        return () => h("div", { class: "result" }, greet.value ?? "pending")
      },
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".result").text()).toBe("pending")
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(wrapper.find(".result").text()).toBe("hello-world")
  })

  it("resolves the runtime once at familyAtom call time and survives non-setup() invocations", async () => {
    class Greeter extends Context.Tag("test/Greeter")<
      Greeter,
      { readonly hello: (name: string) => Effect.Effect<string> }
    >() {}

    const GreeterLive = Layer.succeed(
      Greeter,
      { hello: (name: string) => Effect.succeed(`hello, ${name}`) },
    )

    let lateCallResult: ReturnType<ReturnType<typeof familyAtom<string, string, never, Greeter>>> | undefined

    const Child = defineComponent({
      setup() {
        const family = familyAtom((name: string) =>
          Effect.flatMap(Greeter, g => g.hello(name)),
        )
        // Eagerly take a member during setup to confirm the happy path.
        const eager = family("alice")
        // Then defer a member creation until after setup() completes — proves the
        // runtime was captured at familyAtom time, not at family(key) time.
        queueMicrotask(() => {
          lateCallResult = family("bob")
        })
        return () => h("div", { class: "eager" }, eager.value ?? "pending")
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
    expect(wrapper.find(".eager").text()).toBe("hello, alice")
    expect(lateCallResult?.value).toBe("hello, bob")
  })

  it("subscribes to a Stream-based factory and updates the cached Ref on emission", async () => {
    const Comp = defineComponent({
      setup() {
        const family = familyAtom((seed: number) =>
          Stream.fromIterable([seed, seed + 1, seed + 2]),
        )
        const ten = family(10)
        return () => h("div", { class: "result" }, ten.value === undefined ? "pending" : String(ten.value))
      },
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".result").text()).toBe("pending")
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.find(".result").text()).toBe("12")
  })

  it("interrupts every member fiber on parent-scope dispose (INV-1) and is idempotent (INV-5)", async () => {
    // Use Effect.never so fibers run forever until interrupted — onInterrupt
    // increments a counter we can assert against, proving the fiber was actually
    // interrupted (not merely that scope.stop() did not throw).
    let interrupts = 0
    const scope = effectScope()
    let family: ReturnType<typeof familyAtom<number, number, never>>
    scope.run(() => {
      family = familyAtom((_n: number) =>
        Effect.never.pipe(
          Effect.onInterrupt(() => Effect.sync(() => { interrupts++ })),
        ) as Effect.Effect<number, never, never>,
      )
      family(1)
      family(2)
      family(3)
    })

    // Yield once so fibers start running before we interrupt them.
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(interrupts).toBe(0)

    expect(() => scope.stop()).not.toThrow()
    // Let interrupt finalizers settle.
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(interrupts).toBe(3)

    // Idempotence: second disposal must NOT re-trigger onInterrupt callbacks.
    expect(() => scope.stop()).not.toThrow()
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(interrupts).toBe(3)
  })
})
