import vue from "@vitejs/plugin-vue"
import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  // d.ts emission is handled by `vue-tsc -p tsconfig.build.json` in a separate
  // step (see package.json `build` script). tsdown's rolldown-plugin-dts cannot
  // process .vue files because TypeScript itself does not understand them — only
  // vue-tsc does. Splitting JS bundling (here) from type emission (vue-tsc) is
  // the canonical Vue-library build pattern.
  dts: false,
  clean: true,
  sourcemap: true,
  deps: {
    neverBundle: ["effect", "vue"],
  },
  plugins: [vue()],
})
