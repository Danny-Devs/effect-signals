// TYPE-LEVEL ASSERTION FILE — runs through vue-tsc only, never executed.
// Verifies that AtomBoundary's export-cast pattern (`as unknown as new<A, E>() => ...`)
// actually preserves generic type fidelity at the user's call site.
//
// Without these assertions, the per-composable runtime tests (which use
// template: strings, bypassing TS slot-scope checking) silently accept a
// broken cast. This file is the ONLY place the cast's contract is verified.
//
// Two-sided pattern (per Danny's `technique_two_sided_ts_expect_error`):
// - Each MUST-WORK block has no `@ts-expect-error` and must compile cleanly.
// - Each MUST-ERROR block has `@ts-expect-error` and must NOT compile cleanly
//   (vue-tsc would fail if the suppressed error stops being an error — that's
//   the regression signal).
//
// This file is checked by `pnpm typecheck` (vue-tsc --noEmit). It is NOT
// imported by anything at runtime and produces no JS output.

import { Effect } from "effect"
import { defineComponent, h } from "vue"
import { AtomBoundary, useAsyncAtom } from "../src/index.js"

// ─────────────────────────────────────────────────────────────────────────
// MUST-WORK: AtomBoundary's default-slot scope is typed as the resolved A,
// not unknown / any / undefined. A real user reaching for `data.someProp`
// must get type-checking, not silent unknown.
// ─────────────────────────────────────────────────────────────────────────

void defineComponent({
  setup() {
    const state = useAsyncAtom(
      Effect.succeed({ name: "alice", age: 30 }) as Effect.Effect<{ name: string, age: number }, Error>,
    )
    return () =>
      h(AtomBoundary, { state }, {
        // The slot scope's `data` MUST be typed as `{ name: string; age: number }`,
        // NOT unknown. If this line compiles, the export cast is preserving
        // generics. If it errors with "Property 'name' does not exist on type
        // 'unknown'", the cast is broken.
        default: ({ data }: { data: { name: string, age: number } }) =>
          h("span", `${data.name}:${data.age.toFixed(0)}`),
        error: ({ error }: { error: Error }) => h("span", error.message),
        pending: () => h("span", "loading"),
      })
  },
})

// MUST-WORK: primitive-typed A flows through correctly
void defineComponent({
  setup() {
    const state = useAsyncAtom(
      Effect.succeed(42 as number) as Effect.Effect<number, never>,
    )
    return () =>
      h(AtomBoundary, { state }, {
        // `data` MUST be typed as number — `.toFixed(2)` is a number-only method
        default: ({ data }: { data: number }) => h("span", data.toFixed(2)),
      })
  },
})

// MUST-WORK: typed error E flows through to error slot
void defineComponent({
  setup() {
    interface CustomError { readonly code: number, readonly tag: "CustomError" }
    const state = useAsyncAtom(
      Effect.fail({ code: 500, tag: "CustomError" } as CustomError) as Effect.Effect<string, CustomError>,
    )
    return () =>
      h(AtomBoundary, { state }, {
        // `error.code` is a number; `.toFixed` is number-only. If the error
        // slot scope were typed as unknown, this would error.
        error: ({ error }: { error: CustomError }) =>
          h("span", `code=${error.code.toFixed(0)} tag=${error.tag}`),
        default: ({ data }: { data: string }) => h("span", data.toUpperCase()),
      })
  },
})

// ─────────────────────────────────────────────────────────────────────────
// MUST-ERROR: passing the wrong slot scope type must fail compilation.
// Each block has @ts-expect-error — if the error stops being an error
// (e.g., because the cast widens to any/unknown), vue-tsc will fail with
// "Unused @ts-expect-error directive."
// ─────────────────────────────────────────────────────────────────────────

void defineComponent({
  setup() {
    const state = useAsyncAtom(
      Effect.succeed("hello" as string) as Effect.Effect<string, never>,
    )
    return () =>
      h(AtomBoundary, { state }, {
        // @ts-expect-error -- data is typed string, not number; .toFixed must error
        default: ({ data }: { data: string }) => h("span", data.toFixed(2)),
      })
  },
})

void defineComponent({
  setup() {
    const state = useAsyncAtom(
      Effect.succeed({ count: 5 }) as Effect.Effect<{ count: number }, never>,
    )
    return () =>
      h(AtomBoundary, { state }, {
        // @ts-expect-error -- `nonExistentField` is not a property of { count: number }
        default: ({ data }: { data: { count: number } }) => h("span", String(data.nonExistentField)),
      })
  },
})

void defineComponent({
  setup() {
    interface MyError { readonly kind: "MyError", readonly detail: string }
    const state = useAsyncAtom(
      Effect.fail({ kind: "MyError", detail: "boom" } as MyError) as Effect.Effect<number, MyError>,
    )
    return () =>
      h(AtomBoundary, { state }, {
        // @ts-expect-error -- error.code does not exist on MyError (no `code` field)
        error: ({ error }: { error: MyError }) => h("span", String(error.code)),
      })
  },
})
