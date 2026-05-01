#!/usr/bin/env node
// INV-10 mechanical witness — Effect/Vue peer-dep only (in published artifact).
//
// Per INVARIANTS.md INV-10: the published tarball MUST NOT bundle `effect` or
// `vue`. They are declared as `peerDependencies` and consumers provide them.
//
// What this script asserts (per package, per tarball):
//   1. `effect` is in peerDependencies AND NOT in dependencies
//   2. `vue` is in peerDependencies AND NOT in dependencies
//   3. No file path in the tarball matches `node_modules/effect/` or `node_modules/vue/`
//
// Usage:
//   node scripts/verify-published-tarball.mjs                  # both packages
//   node scripts/verify-published-tarball.mjs packages/core    # one package
//
// Exits with code 0 on success, 1 on any violation. Output is single-line per
// check so CI logs stay compact.

import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import process from "node:process"

const FORBIDDEN_TOP_LEVEL_DEP_NAMES = ["effect", "vue"]

const REPO_ROOT = resolve(new URL("..", import.meta.url).pathname)

const argPkgs = process.argv.slice(2)
const packagesToCheck = argPkgs.length > 0
  ? argPkgs.map(p => resolve(REPO_ROOT, p))
  : [
      resolve(REPO_ROOT, "packages/core"),
      resolve(REPO_ROOT, "packages/effect-vue"),
    ]

let violations = 0
const tmpDir = mkdtempSync(join(tmpdir(), "inv10-"))

try {
  for (const pkgDir of packagesToCheck) {
    const pkgJsonPath = join(pkgDir, "package.json")
    if (!existsSync(pkgJsonPath)) {
      console.error(`[INV-10] FAIL: package.json not found at ${pkgJsonPath}`)
      violations++
      continue
    }

    const pkgName = JSON.parse(execFileSync("cat", [pkgJsonPath], { encoding: "utf8" })).name
    process.stdout.write(`[INV-10] ${pkgName}: packing... `)

    execFileSync("pnpm", ["pack", "--pack-destination", tmpDir], {
      cwd: pkgDir,
      stdio: ["ignore", "ignore", "inherit"],
    })

    const tarballName = execFileSync("ls", [tmpDir], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .find(n => n.endsWith(".tgz") && n.includes(pkgName.replace(/^@/, "").replace(/\//g, "-")))

    if (!tarballName) {
      console.error(`\n[INV-10] FAIL ${pkgName}: tarball not found in ${tmpDir}`)
      violations++
      continue
    }
    const tarballPath = join(tmpDir, tarballName)

    const packedManifest = JSON.parse(
      execFileSync("tar", ["-xOzf", tarballPath, "package/package.json"], { encoding: "utf8" }),
    )
    const fileList = execFileSync("tar", ["-tzf", tarballPath], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)

    const peerDeps = packedManifest.peerDependencies ?? {}
    const deps = packedManifest.dependencies ?? {}

    let pkgViolations = 0
    for (const name of FORBIDDEN_TOP_LEVEL_DEP_NAMES) {
      if (!Object.prototype.hasOwnProperty.call(peerDeps, name)) {
        console.error(`\n[INV-10] FAIL ${pkgName}: '${name}' missing from peerDependencies`)
        pkgViolations++
      }
      if (Object.prototype.hasOwnProperty.call(deps, name)) {
        console.error(`\n[INV-10] FAIL ${pkgName}: '${name}' present in dependencies (must be peer only)`)
        pkgViolations++
      }
    }

    const bundledPaths = fileList.filter(
      p => p.includes("node_modules/effect/") || p.includes("node_modules/vue/"),
    )
    if (bundledPaths.length > 0) {
      console.error(`\n[INV-10] FAIL ${pkgName}: tarball contains ${bundledPaths.length} forbidden paths`)
      for (const bad of bundledPaths.slice(0, 5)) {
        console.error(`  - ${bad}`)
      }
      pkgViolations += bundledPaths.length
    }

    if (pkgViolations === 0) {
      process.stdout.write(`OK (${tarballName}, ${fileList.length} files)\n`)
    }
    else {
      violations += pkgViolations
    }
  }
}
finally {
  rmSync(tmpDir, { recursive: true, force: true })
}

if (violations > 0) {
  console.error(`\n[INV-10] ${violations} violation(s) — see INVARIANTS.md`)
  process.exit(1)
}

process.stdout.write("[INV-10] all packages verified\n")
