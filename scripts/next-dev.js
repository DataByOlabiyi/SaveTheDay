#!/usr/bin/env node
/**
 * next-dev.js
 *
 * Wrapper around `next dev` that sets NODE_PATH to the project's node_modules
 * before spawning Next.js.
 *
 * WHY this is needed:
 *   `.next` is a Windows junction pointing to C:\Users\DELL\.next-savetheday
 *   (outside OneDrive). The compiled server bundles in that directory call
 *   require('react'), require('next/dist/...'), etc.  Node.js CJS module
 *   resolution walks UP from the requiring file's PHYSICAL path:
 *
 *     C:\Users\DELL\.next-savetheday\server\…\page.js
 *     → C:\Users\DELL\.next-savetheday\node_modules\   ← doesn't exist
 *     → C:\Users\DELL\node_modules\                    ← doesn't exist
 *     → C:\node_modules\                               ← doesn't exist
 *     ✗ MODULE_NOT_FOUND
 *
 *   Setting NODE_PATH adds the project's real node_modules as a global
 *   search path that Node.js checks after the directory walk:
 *
 *     NODE_PATH = C:\Users\DELL\OneDrive\Apps\SaveTheDay\node_modules
 *     → react/jsx-runtime found ✓
 *
 * Run via:  npm run dev   (package.json: "dev": "node scripts/next-dev.js")
 * Preceded by: npm predev hook (ensure-next-junction.js)
 */

const path = require('path')
const { spawnSync } = require('child_process')

const projectRoot = path.resolve(__dirname, '..')
const nodeModules = path.join(projectRoot, 'node_modules')

// ── 1. Set NODE_PATH so that require() in .next-savetheday bundles works ──
process.env.NODE_PATH = nodeModules

// ── 2. Spawn `next dev` with the enriched environment ──
//
// On Windows, node_modules/.bin/next is a .cmd wrapper — it cannot be
// executed directly without shell: true.  We also pass the full path to
// node_modules/.bin so it is found regardless of the system PATH.
const nextBin = path.join(nodeModules, '.bin', 'next')

console.log('[dev] Starting Next.js dev server with NODE_PATH set...')

const result = spawnSync(nextBin, ['dev'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,   // required on Windows to run .cmd shims in node_modules/.bin
})

process.exit(result.status ?? 0)
