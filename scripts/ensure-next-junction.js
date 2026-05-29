#!/usr/bin/env node
/**
 * ensure-next-junction.js
 *
 * This project lives inside OneDrive. This script runs on every
 * `npm run dev` / `npm run build` (via predev / prebuild hooks) and
 * ensures three Windows directory junctions are in place so that
 * OneDrive never disrupts the build or dev server.
 *
 *  A) .next junction
 *     Keep .next as a Windows directory junction pointing OUTSIDE OneDrive.
 *     Junction:  <project>/.next  →  %USERPROFILE%\.next-savetheday
 *
 *  B) node_modules junction inside .next-savetheday
 *     Compiled server bundles in .next-savetheday\server\ call require('react')
 *     etc.  Node.js walks UP from the physical file path and would never reach
 *     the project's node_modules.  A junction at .next-savetheday\node_modules
 *     makes them resolvable via the normal upward walk.
 *     Junction:  %USERPROFILE%\.next-savetheday\node_modules  →  <project>/node_modules
 *
 *  C) node_modules MAIN JUNCTION  ← THE KEY FIX
 *     node_modules itself is a junction pointing to .npm-savetheday\node_modules
 *     (outside OneDrive's sync scope), where all 394 npm packages live as
 *     real local files that OneDrive can never evict.
 *
 *     Junction:  <project>/node_modules  →  %USERPROFILE%\.npm-savetheday\node_modules
 *
 *     WHY the packages must be inside a "node_modules" subdirectory:
 *       When Next.js loads from the junction target, the physical path is
 *       .npm-savetheday\node_modules\next\dist\build\entries.js.
 *       Node.js CJS resolution walks UP looking for "node_modules" directories:
 *         .../dist/build/node_modules   — no
 *         .../dist/node_modules         — no
 *         .../next/node_modules         — no
 *         .npm-savetheday/node_modules  — YES! (skips the segment already named "node_modules",
 *                                         then adds "node_modules" to the parent)
 *       So require('react') finds .npm-savetheday\node_modules\react ✓
 *       Without this structure, the upward walk misses all packages.
 */

const fs   = require('fs')
const path = require('path')
const { execSync, spawnSync } = require('child_process')

const USERPROFILE        = process.env.USERPROFILE || 'C:\\Users\\DELL'
const PROJECT_ROOT       = path.resolve(__dirname, '..')
const NEXT_IN_PROJECT    = path.join(PROJECT_ROOT, '.next')
const NODE_MODULES_DIR   = path.join(PROJECT_ROOT, 'node_modules')  // will be a junction
const NEXT_REAL_DIR      = path.join(USERPROFILE, '.next-savetheday')
// Packages live at .npm-savetheday\node_modules\<pkg>  (NOT at .npm-savetheday\<pkg>!)
const NPM_REAL_DIR       = path.join(USERPROFILE, '.npm-savetheday', 'node_modules')

// Junction that lets compiled server bundles find packages via upward walk:
//   .next-savetheday\server\…\page.js  →  require('react')
//   walks up to .next-savetheday\node_modules\ → junction → project/node_modules → .npm-savetheday\node_modules\react ✓
const NM_IN_NEXT_REAL    = path.join(NEXT_REAL_DIR, 'node_modules')

// ─────────────────────────────────────────────────────────────
// A. .next JUNCTION
// ─────────────────────────────────────────────────────────────

if (!fs.existsSync(NEXT_REAL_DIR)) {
  fs.mkdirSync(NEXT_REAL_DIR, { recursive: true })
  console.log(`[junction-A] Created ${NEXT_REAL_DIR}`)
}

let needsNextJunction = true
if (fs.existsSync(NEXT_IN_PROJECT)) {
  try {
    const stat = fs.lstatSync(NEXT_IN_PROJECT)
    if (stat.isSymbolicLink() || isRealJunction(NEXT_IN_PROJECT)) {
      needsNextJunction = false
      console.log('[junction-A] .next junction is already in place ✓')
    } else {
      console.log('[junction-A] Removing plain .next directory to replace with junction…')
      fs.rmSync(NEXT_IN_PROJECT, { recursive: true, force: true })
    }
  } catch {
    fs.rmSync(NEXT_IN_PROJECT, { recursive: true, force: true })
  }
}

if (needsNextJunction) {
  try {
    execSync(`cmd /c mklink /J "${NEXT_IN_PROJECT}" "${NEXT_REAL_DIR}"`, { stdio: 'pipe' })
    console.log(`[junction-A] Created .next → ${NEXT_REAL_DIR} ✓`)
  } catch (e) {
    console.error('[junction-A] Failed to create junction:', e.message)
    process.exit(1)
  }
}

// ─────────────────────────────────────────────────────────────
// B. node_modules JUNCTION INSIDE .next-savetheday
//
// Compiled server bundles (e.g. .next-savetheday\server\pages\_document.js)
// call require('react') at runtime.  Node.js resolves by walking UP from the
// physical file path — which is inside .next-savetheday, not inside the
// project.  A junction at .next-savetheday\node_modules → project/node_modules
// lets Node follow the chain:
//   .next-savetheday\server\...\page.js
//   → walk up: .next-savetheday\node_modules (junction)
//   → project\node_modules (junction)
//   → .npm-savetheday\node_modules\react ✓
//
// Note: `next build` deletes the entire .next-savetheday dir before compiling,
// so this junction is re-created here on every predev / prebuild run.
// ─────────────────────────────────────────────────────────────

let needsNmJunction = true
if (fs.existsSync(NM_IN_NEXT_REAL)) {
  try {
    const s = fs.lstatSync(NM_IN_NEXT_REAL)
    if (s.isSymbolicLink() || isRealJunction(NM_IN_NEXT_REAL)) {
      needsNmJunction = false
      console.log('[junction-B] .next-savetheday\\node_modules junction is already in place ✓')
    } else {
      fs.rmSync(NM_IN_NEXT_REAL, { recursive: true, force: true })
    }
  } catch {
    // ignore; will recreate below
  }
}

if (needsNmJunction) {
  try {
    execSync(`cmd /c mklink /J "${NM_IN_NEXT_REAL}" "${NODE_MODULES_DIR}"`, { stdio: 'pipe' })
    console.log(`[junction-B] Created .next-savetheday\\node_modules → ${NODE_MODULES_DIR} ✓`)
  } catch (e) {
    console.warn('[junction-B] Could not create node_modules junction inside .next-savetheday:', e.message)
  }
}

// ─────────────────────────────────────────────────────────────
// C. node_modules → .npm-savetheday\node_modules JUNCTION
//
// ROOT FIX: project\node_modules is a Windows junction pointing to
// C:\Users\DELL\.npm-savetheday\node_modules — outside OneDrive's sync scope.
//
// The packages MUST be in a "node_modules" subdirectory (not the root of
// .npm-savetheday) because Node.js CJS resolution uses the segment name
// "node_modules" to locate package roots during upward traversal.
//
// What can break this junction:
//   1. npm install: arborist removes junctions before reinstalling.
//      Detected below and recreated.
//   2. OneDrive replaces the junction with a cloud placeholder
//      (reparse tag changes from 0xa0000003 to 0x9000601a).
//      Detected below and recreated.
// ─────────────────────────────────────────────────────────────

// Verify .npm-savetheday\node_modules exists and has packages
if (!fs.existsSync(NPM_REAL_DIR)) {
  console.error(`[junction-C] FATAL: ${NPM_REAL_DIR} does not exist.`)
  console.error('[junction-C] Run once to set up:')
  console.error(`[junction-C]   npm install   (then this script handles the migration)`)
  process.exit(1)
}

ensureNmJunctionToNpmReal()

function ensureNmJunctionToNpmReal() {
  const label = '[junction-C]'

  if (fs.existsSync(NODE_MODULES_DIR)) {
    // Check if it's already a working junction
    if (fs.lstatSync(NODE_MODULES_DIR).isSymbolicLink() || isRealJunction(NODE_MODULES_DIR)) {
      // Verify the junction resolves correctly by reading a key file
      try {
        const testFile = path.join(NODE_MODULES_DIR, 'next', 'dist', 'build', 'entries.js')
        const size = fs.statSync(testFile).size
        if (size > 0) {
          console.log(`${label} node_modules → ${NPM_REAL_DIR} ✓`)
          return  // All good
        }
      } catch { /* fall through to recreate */ }
      console.log(`${label} node_modules junction exists but is broken — recreating...`)
    } else {
      // Plain directory (npm replaced the junction). Check if it has packages.
      console.log(`${label} node_modules is a plain directory — checking for packages to migrate...`)
      const hasPackages = fs.existsSync(path.join(NODE_MODULES_DIR, 'next'))
      if (hasPackages) {
        console.log(`${label} Migrating packages from OneDrive to ${NPM_REAL_DIR}...`)
        migrateNodeModules()
        return
      }
    }
    forceDeleteDir(NODE_MODULES_DIR)
  }

  // (Re)create the junction
  try {
    execSync(`cmd /c mklink /J "${NODE_MODULES_DIR}" "${NPM_REAL_DIR}"`, { stdio: 'pipe' })
    console.log(`${label} Created node_modules → ${NPM_REAL_DIR} ✓`)
  } catch (e) {
    console.error(`${label} FATAL: Failed to create node_modules junction:`, e.message)
    process.exit(1)
  }

  // Final verification
  try {
    const testFile = path.join(NODE_MODULES_DIR, 'next', 'dist', 'build', 'entries.js')
    const size = fs.statSync(testFile).size
    if (size === 0) throw new Error('entries.js is 0 bytes (possible cloud stub)')
    console.log(`${label} Verified: entries.js readable (${size} bytes) ✓`)
  } catch (e) {
    console.error(`${label} FATAL: Junction created but files not readable: ${e.message}`)
    process.exit(1)
  }
}

/**
 * Called when npm install has replaced the junction with a real directory.
 * Moves packages from project/node_modules (inside OneDrive) to
 * .npm-savetheday/node_modules (outside OneDrive), then recreates the junction.
 */
function migrateNodeModules() {
  const label = '[migrate]'

  // Use robocopy to MOVE all packages from node_modules → .npm-savetheday\node_modules
  // /MOVE removes source files after copy; /E includes subdirs; /NP hides progress
  // First: remove old destination content to avoid stale packages
  if (fs.existsSync(NPM_REAL_DIR)) {
    console.log(`${label} Clearing old ${NPM_REAL_DIR}...`)
    forceDeleteDir(NPM_REAL_DIR)
  }

  console.log(`${label} Moving packages (this takes ~30 seconds)...`)
  const roboResult = spawnSync('robocopy', [
    NODE_MODULES_DIR,
    NPM_REAL_DIR,
    '/MOVE', '/E', '/NP', '/NFL', '/NDL', '/NS', '/NC',
  ], { encoding: 'utf8', shell: true, timeout: 300000 })

  // robocopy exit codes 0-3 = success (0=no files, 1=OK, 2=extra, 3=OK+extra)
  if (roboResult.status > 3) {
    console.error(`${label} robocopy failed (exit ${roboResult.status}): ${roboResult.stderr}`)
    process.exit(1)
  }
  console.log(`${label} Packages moved to ${NPM_REAL_DIR} ✓`)

  // Delete the now-empty source directory
  forceDeleteDir(NODE_MODULES_DIR)

  // Create the junction
  try {
    execSync(`cmd /c mklink /J "${NODE_MODULES_DIR}" "${NPM_REAL_DIR}"`, { stdio: 'pipe' })
    console.log(`${label} Created junction node_modules → ${NPM_REAL_DIR} ✓`)
  } catch (e) {
    console.error(`${label} FATAL: Failed to create junction: ${e.message}`)
    process.exit(1)
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Returns true if the path is a proper Windows directory junction
 * (reparse tag 0xa0000003 = IO_REPARSE_TAG_MOUNT_POINT).
 * Returns false for OneDrive cloud placeholders (0x9000601a) or plain dirs.
 *
 * Node.js lstatSync reports both symlinks AND junctions as isSymbolicLink:true,
 * so we use fsutil to get the exact reparse tag.
 */
function isRealJunction(p) {
  try {
    const out = execSync(`fsutil reparsepoint query "${p}"`, { stdio: 'pipe' }).toString()
    return out.includes('0xa0000003')
  } catch {
    return false
  }
}

/**
 * Delete a directory or junction. Handles OneDrive cloud stubs.
 */
function forceDeleteDir(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true })
    if (!fs.existsSync(p)) return
  } catch { /* fall through */ }

  // Fallback: PowerShell
  spawnSync('powershell', [
    '-NonInteractive', '-NoProfile', '-Command',
    `Remove-Item -LiteralPath '${p}' -Recurse -Force -ErrorAction SilentlyContinue`
  ], { encoding: 'utf8' })
}
