import { mount } from "@vue/test-utils"
import { Effect, Match } from "effect"
import { describe, expect, it } from "vitest"
import { defineComponent, h, nextTick, ref } from "vue"
import { useAsyncAtom, useMatch } from "../src/index.js"

describe("useMatch", () => {
  it("evaluates the matcher against the source value and returns a ComputedRef", () => {
    type State = { _tag: "A", v: number } | { _tag: "B", s: string }
    const Comp = defineComponent({
      setup() {
        const state = ref<State>({ _tag: "A", v: 7 })
        const message = useMatch(state, s =>
          Match.value(s).pipe(
            Match.tag("A", ({ v }) => `a=${v}`),
            Match.tag("B", ({ s }) => `b=${s}`),
            Match.exhaustive,
          ))
        return () => h("div", { class: "result" }, message.value)
      },
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".result").text()).toBe("a=7")
  })

  it("re-evaluates the matcher when the source ref changes", async () => {
    type State = { _tag: "Loading" } | { _tag: "Loaded", data: string }
    let evaluations = 0
    const Comp = defineComponent({
      setup() {
        const state = ref<State>({ _tag: "Loading" })
        const message = useMatch(state, (s) => {
          evaluations++
          return Match.value(s).pipe(
            Match.tag("Loading", () => "loading"),
            Match.tag("Loaded", ({ data }) => `loaded:${data}`),
            Match.exhaustive,
          )
        })
        return { state, message }
      },
      template: `<div class="result">{{ message }}</div>`,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".result").text()).toBe("loading")
    expect(evaluations).toBe(1)

    wrapper.vm.state = { _tag: "Loaded", data: "ok" }
    await nextTick()
    expect(wrapper.find(".result").text()).toBe("loaded:ok")
    expect(evaluations).toBe(2)
  })

  it("caches the result for the same source value (Vue computed dedup)", async () => {
    let evaluations = 0
    const Comp = defineComponent({
      setup() {
        const state = ref(42)
        const doubled = useMatch(state, (n) => {
          evaluations++
          return n * 2
        })
        return { state, doubled }
      },
      template: `<div class="result">{{ doubled }}</div>`,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".result").text()).toBe("84")
    expect(evaluations).toBe(1)

    // Touch the ref with the same value — Vue's reactivity dedupes, no re-eval
    wrapper.vm.state = 42
    await nextTick()
    expect(evaluations).toBe(1)

    // Now actually change the value
    wrapper.vm.state = 100
    await nextTick()
    expect(wrapper.find(".result").text()).toBe("200")
    expect(evaluations).toBe(2)
  })

  it("composes with useAsyncAtom — match on data ref", async () => {
    const Comp = defineComponent({
      setup() {
        const greeting = useAsyncAtom(
          Effect.succeed("hello").pipe(Effect.delay("10 millis")),
        )
        const display = useMatch(greeting.data, data =>
          Match.value(data).pipe(
            Match.when(undefined, () => "loading"),
            Match.when(Match.string, s => s.toUpperCase()),
            Match.exhaustive,
          ))
        return () => h("div", { class: "result" }, display.value)
      },
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".result").text()).toBe("loading")
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()
    expect(wrapper.find(".result").text()).toBe("HELLO")
  })

  it("propagates a synchronous throw from the matcher via Vue computed", () => {
    const Comp = defineComponent({
      setup() {
        const state = ref(0)
        const result = useMatch(state, (n) => {
          if (n === 0) {
            throw new Error("zero is forbidden")
          }
          return n * 10
        })
        return () => h("div", { class: "result" }, String(result.value))
      },
    })
    expect(() => mount(Comp)).toThrow("zero is forbidden")
  })
})
