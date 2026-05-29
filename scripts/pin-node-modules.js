#!/usr/bin/env node
/**
 * pin-node-modules.js  (postinstall hook)
 *
 * Runs after every `npm install`.  npm replaces the node_modules junction with
 * a real directory during install.  This script moves the freshly installed
 * packages OUTSIDE OneDrive and recreates the junction, so OneDrive can never
 * evict them.
 *
 * Package layout that makes Node.js CJS resolution work:
 *
 *   project/node_modules         ← Windows junction (reparse point 0xa0000003)
 *       ↓ points to
 *   %USERPROFILE%\.npm-savetheday\node_modules\   ← real directory outside OneDrive
 *       next\
 *       react\
 *       react-dom\
 *       …all other packages…
 *
 * WHY packages must be inside a "node_modules" subdirectory of the target:
 *   Node.js CJS walks up from the physical path of each loaded file.
 *   Physical path of entries.js = .npm-savetheday\node_modules\next\dist\build\entries.js
 *   Algorithm generates search dirs:
 *     …\next\dist\build\node_modules   no
 *     …\next\dist\node_modules         no
 *     …\next\node_modules              no
 *     .npm-savetheday\node_modules     YES → contains react\, next\, etc. ✓
 *   Without the "node_modules" parent segment, the upward walk would need
 *   .npm-savetheday\node_modules to exist one level above packages, which it
 *   wouldn't when packages are at the root of .npm-savetheday.
 */

const fs   = require('fs')
const path = require('path')
const { execSync, spawnSync } = require('child_process')

const USERPROFILE     = process.env.USERPROFILE || 'C:\\Users\\DELL'
const PROJECT_ROOT    = path.resolve(__dirname, '..')
const NODE_MODULES    = path.join(PROJECT_ROOT, 'node_modules')
// Target: packages live at .npm-savetheday\node_modules\<pkg>
const NPM_REAL_DIR    = path.join(USERPROFILE, '.npm-savetheday', 'node_modules')

console.log('[postinstall] Checking node_modules junction...')

// Check if node_modules is already the junction we want
if (fs.existsSync(NODE_MODULES)) {
  const stat = fs.lstatSync(NODE_MODULES)
  if (stat.isSymbolicLink() || isRealJunction(NODE_MODULES)) {
    // Verify it resolves correctly
    try {
      const testFile = path.join(NODE_MODULES, 'next', 'dist', 'build', 'entries.js')
      if (fs.existsSync(testFile) && fs.statSync(testFile).size > 0) {
        console.log('[postinstall] node_modules junction is already in place ✓')
        process.exit(0)
      }
    } catch { /* fall through */ }
  }
}

// node_modules is a plain directory (npm just reinstalled) — migrate to outside OneDrive
if (!fs.existsSync(NODE_MODULES) || !fs.lstatSync(NODE_MODULES).isDirectory()) {
  console.error('[postinstall] node_modules missing or not a directory — skipping migration')
  process.exit(0)
}

console.log('[postinstall] npm replaced the junction — migrating packages outside OneDrive...')

// Ensure parent of NPM_REAL_DIR exists
const npmParent = path.dirname(NPM_REAL_DIR)
if (!fs.existsSync(npmParent)) {
  fs.mkdirSync(npmParent, { recursive: true })
}

// Clear old destination
if (fs.existsSync(NPM_REAL_DIR)) {
  console.log('[postinstall] Removing old packages...')
  forceDeleteDir(NPM_REAL_DIR)
}

// Move packages (robocopy /MOVE is fast for large trees on same drive)
console.log('[postinstall] Moving packages to safe location (outside OneDrive)...')
const roboResult = spawnSync('robocopy', [
  NODE_MODULES,
  NPM_REAL_DIR,
  '/MOVE', '/E', '/NP', '/NFL', '/NDL', '/NS', '/NC',
], { encoding: 'utf8', shell: true, timeout: 300000 })

// robocopy exit codes 0-3 = success
if (roboResult.status > 3) {
  console.error(`[postinstall] robocopy failed (exit ${roboResult.status}):`, roboResult.stderr)
  console.error('[postinstall] Packages may still be inside OneDrive — OneDrive may evict them.')
  process.exit(0)  // non-fatal
}

// Delete the now-empty source directory
forceDeleteDir(NODE_MODULES)

// Create the junction
try {
  execSync(`cmd /c mklink /J "${NODE_MODULES}" "${NPM_REAL_DIR}"`, { stdio: 'pipe' })
  console.log(`[postinstall] node_modules → ${NPM_REAL_DIR} ✓`)

  // Verify
  const testFile = path.join(NODE_MODULES, 'next', 'dist', 'build', 'entries.js')
  if (fs.existsSync(testFile)) {
    console.log('[postinstall] Junction verified ✓')
  }
} catch (e) {
  console.error('[postinstall] Failed to create junction:', e.message)
  process.exit(1)
}

function isRealJunction(p) {
  try {
    const out = execSync(`fsutil reparsepoint query "${p}"`, { stdio: 'pipe' }).toString()
    return out.includes('0xa0000003')
  } catch { return false }
}

function forceDeleteDir(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true })
    if (!fs.existsSync(p)) return
  } catch { /* fall through */ }
  spawnSync('powershell', [
    '-NonInteractive', '-NoProfile', '-Command',
    `Remove-Item -LiteralPath '${p}' -Recurse -Force -ErrorAction SilentlyContinue`
  ], { encoding: 'utf8' })
}
