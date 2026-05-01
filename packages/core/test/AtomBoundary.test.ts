import { mount } from "@vue/test-utils"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { defineComponent, nextTick } from "vue"
import { AtomBoundary, useAsyncAtom } from "../src/index.js"

// eslint-disable-next-line test/prefer-lowercase-title -- AtomBoundary is the canonical PascalCase component name
describe("AtomBoundary", () => {
  it("renders the pending slot while the underlying effect is unresolved", () => {
    const Comp = defineComponent({
      components: { AtomBoundary },
      setup() {
        const state = useAsyncAtom(
          Effect.succeed("late").pipe(Effect.delay("50 millis")),
        )
        return { state }
      },
      template: `
        <AtomBoundary :state="state">
          <template #pending><span class="slot">loading</span></template>
          <template #error="{ error }"><span class="slot">err: {{ error.message }}</span></template>
          <template #default="{ data }"><span class="slot">ok: {{ data }}</span></template>
        </AtomBoundary>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".slot").text()).toBe("loading")
  })

  it("renders the default slot with typed data after the effect resolves", async () => {
    const Comp = defineComponent({
      components: { AtomBoundary },
      setup() {
        const state = useAsyncAtom(
          Effect.succeed("hello").pipe(Effect.delay("10 millis")),
        )
        return { state }
      },
      template: `
        <AtomBoundary :state="state">
          <template #pending><span class="slot">loading</span></template>
          <template #default="{ data }"><span class="slot">value:{{ data }}</span></template>
        </AtomBoundary>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".slot").text()).toBe("loading")
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()
    expect(wrapper.find(".slot").text()).toBe("value:hello")
  })

  it("renders the error slot with the typed error when the effect fails", async () => {
    const failure = new Error("boom") as Error
    const Comp = defineComponent({
      components: { AtomBoundary },
      setup() {
        const state = useAsyncAtom(
          Effect.fail(failure).pipe(Effect.delay("10 millis")) as Effect.Effect<string, Error>,
        )
        return { state }
      },
      template: `
        <AtomBoundary :state="state">
          <template #pending><span class="slot">loading</span></template>
          <template #error="{ error }"><span class="slot">err:{{ error.message }}</span></template>
          <template #default="{ data }"><span class="slot">ok:{{ data }}</span></template>
        </AtomBoundary>
      `,
    })
    const wrapper = mount(Comp)
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()
    expect(wrapper.find(".slot").text()).toBe("err:boom")
  })

  it("renders nothing (empty) when no slot matches the current state", async () => {
    // pending=true on mount, no `pending` slot provided → renders nothing
    const Comp = defineComponent({
      components: { AtomBoundary },
      setup() {
        const state = useAsyncAtom(
          Effect.succeed("never-shown").pipe(Effect.delay("100 millis")),
        )
        return { state }
      },
      template: `
        <div class="wrapper">
          <AtomBoundary :state="state">
            <template #default="{ data }"><span class="slot">{{ data }}</span></template>
          </AtomBoundary>
        </div>
      `,
    })
    const wrapper = mount(Comp)
    // Before resolution: no pending slot, so AtomBoundary renders nothing
    expect(wrapper.find(".slot").exists()).toBe(false)
    expect(wrapper.find(".wrapper").text()).toBe("")
  })

  it("transitions reactively pending → resolved without unmounting the boundary", async () => {
    const renders: string[] = []
    const Comp = defineComponent({
      components: { AtomBoundary },
      setup() {
        const state = useAsyncAtom(
          Effect.succeed(42).pipe(Effect.delay("10 millis")),
        )
        return { state, renders }
      },
      template: `
        <AtomBoundary :state="state">
          <template #pending>
            <span class="slot">{{ renders.push('pending') && '' }}pending</span>
          </template>
          <template #default="{ data }">
            <span class="slot">{{ renders.push('default:' + data) && '' }}done:{{ data }}</span>
          </template>
        </AtomBoundary>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find(".slot").text()).toBe("pending")
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()
    expect(wrapper.find(".slot").text()).toBe("done:42")
    // First render should be pending; final render should be default:42.
    // Order matters — pending must precede default (mirrors INV-4 at the boundary).
    expect(renders[0]).toBe("pending")
    expect(renders[renders.length - 1]).toBe("default:42")
  })
})
