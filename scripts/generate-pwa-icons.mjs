/**
 * PWA Icon Generator
 * Generates all required PWA icon sizes from the SVG source using Sharp.
 * Run once: node scripts/generate-pwa-icons.mjs
 */

import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SVG_SOURCE = join(__dirname, 'pwa-icon-source.svg')
const OUT_DIR = join(ROOT, 'public', 'icons')

// Ensure output dir exists
mkdirSync(OUT_DIR, { recursive: true })

const svgBuffer = readFileSync(SVG_SOURCE)

const icons = [
  // ── Standard PWA icons ─────────────────────────────────────
  { size: 72,   name: 'icon-72.png' },
  { size: 96,   name: 'icon-96.png' },
  { size: 128,  name: 'icon-128.png' },
  { size: 144,  name: 'icon-144.png' },
  { size: 152,  name: 'icon-152.png' },
  { size: 192,  name: 'icon-192.png' },
  { size: 384,  name: 'icon-384.png' },
  { size: 512,  name: 'icon-512.png' },
  // ── Apple touch icons ──────────────────────────────────────
  { size: 120,  name: 'apple-touch-icon-120.png' },
  { size: 152,  name: 'apple-touch-icon-152.png' },
  { size: 167,  name: 'apple-touch-icon-167.png' },
  { size: 180,  name: 'apple-touch-icon.png' },
  // ── Maskable icon (for Android adaptive icons) ─────────────
  // Maskable icons have padding so content stays in the 80% safe zone.
  // We scale the SVG to 75% and place it on a solid brand background.
  { size: 512,  name: 'icon-maskable-512.png', maskable: true },
  { size: 192,  name: 'icon-maskable-192.png', maskable: true },
  // ── Favicon sizes ──────────────────────────────────────────
  { size: 16,   name: 'favicon-16.png' },
  { size: 32,   name: 'favicon-32.png' },
  { size: 48,   name: 'favicon-48.png' },
]

async function generateMaskable(size, outputPath) {
  // Render SVG at 75% of final size (inner safe zone)
  const innerSize = Math.round(size * 0.75)
  const padding = Math.round((size - innerSize) / 2)

  const innerBuffer = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer()

  // Composite onto solid obsidian background
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 8, g: 12, b: 10, alpha: 1 }, // #080C0A
    },
  })
    .composite([{ input: innerBuffer, top: padding, left: padding }])
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(outputPath)
}

async function main() {
  console.log('🎨  Generating PWA icons…\n')

  for (const icon of icons) {
    const outputPath = join(OUT_DIR, icon.name)

    if (icon.maskable) {
      await generateMaskable(icon.size, outputPath)
    } else {
      await sharp(svgBuffer)
        .resize(icon.size, icon.size)
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath)
    }

    console.log(`  ✓  ${icon.name}  (${icon.size}×${icon.size})`)
  }

  console.log('\n✅  All icons generated → public/icons/')
}

main().catch((err) => {
  console.error('Icon generation failed:', err)
  process.exit(1)
})
