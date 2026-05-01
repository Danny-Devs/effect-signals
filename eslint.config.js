import antfu from "@antfu/eslint-config"

export default antfu({
  vue: true,
  typescript: true,
  stylistic: {
    indent: 2,
    quotes: "double",
    semi: false,
  },
  ignores: [
    "**/dist/**",
    "**/node_modules/**",
    "**/.nuxt/**",
    "**/coverage/**",
  ],
})
