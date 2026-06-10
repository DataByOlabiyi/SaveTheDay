'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface ParsedRow {
  name: string
  email?: string
  phone?: string
  valid: boolean
  error?: string
}

interface ImportResult {
  created: number
  skipped: number
  errors: string[]
}

interface ImportGuestsModalProps {
  weddingId: string
  onClose: () => void
  onSuccess: (count: number) => void
}

// ──────────────────────────────────────────────────────────────
// CSV helpers (no external dependency)
// ──────────────────────────────────────────────────────────────

/** Parse a single CSV line, respecting quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"' && !inQuotes) {
      inQuotes = true
    } else if (ch === '"' && inQuotes) {
      if (line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = false
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result.map(c => c.trim().replace(/^["']|["']$/g, ''))
}

// Column name aliases we recognise
const NAME_ALIASES  = ['name', 'full name', 'fullname', 'guest name', 'guest']
const EMAIL_ALIASES = ['email', 'email address', 'e-mail']
const PHONE_ALIASES = ['phone', 'mobile', 'tel', 'telephone', 'whatsapp', 'number', 'phone number', 'mobile number']

function matchHeader(header: string, aliases: string[]): boolean {
  return aliases.includes(header.toLowerCase().trim())
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return []

  const firstLine = parseCSVLine(lines[0])
  const hasHeaders = firstLine.some(h => NAME_ALIASES.includes(h.toLowerCase().trim()))

  let nameIdx  = -1
  let emailIdx = -1
  let phoneIdx = -1

  if (hasHeaders) {
    firstLine.forEach((h, i) => {
      if (matchHeader(h, NAME_ALIASES) && nameIdx  === -1) nameIdx  = i
      if (matchHeader(h, EMAIL_ALIASES) && emailIdx === -1) emailIdx = i
      if (matchHeader(h, PHONE_ALIASES) && phoneIdx === -1) phoneIdx = i
    })
  } else {
    // Assume: col 0 = name, col 1 = email, col 2 = phone
    nameIdx = 0; emailIdx = 1; phoneIdx = 2
  }

  const dataLines = hasHeaders ? lines.slice(1) : lines

  return dataLines
    .map((line): ParsedRow => {
      const cells = parseCSVLine(line)
      const name  = nameIdx  >= 0 ? (cells[nameIdx]  ?? '') : ''
      const email = emailIdx >= 0 ? (cells[emailIdx] ?? '') : ''
      const phone = phoneIdx >= 0 ? (cells[phoneIdx] ?? '') : ''

      if (!name.trim()) {
        // Only show row if it has at least some data
        if (!email.trim() && !phone.trim()) return null as unknown as ParsedRow
        return { name: '', email: email || undefined, phone: phone || undefined, valid: false, error: 'Missing name' }
      }

      return {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        valid: true,
      }
    })
    .filter(Boolean)
}


// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export function ImportGuestsModal({
  weddingId,
  onClose,
  onSuccess,
}: ImportGuestsModalProps) {
  const [step, setStep]             = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [rows, setRows]             = useState<ParsedRow[]>([])
  const [fileName, setFileName]     = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [dragging, setDragging]     = useState(false)
  const [result, setResult]         = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validRows   = rows.filter(r => r.valid)
  const invalidRows = rows.filter(r => !r.valid)

  // ── File processing ──────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    setParseError(null)
    const ext = file.name.split('.').pop()?.toLowerCase()

    try {
      if (ext !== 'csv') {
        setParseError('Please upload a .csv file. To convert an Excel file: File → Save As → CSV.')
        return
      }

      const text = await file.text()
      const parsed = parseCSV(text)

      if (parsed.length === 0) {
        setParseError('The file appears to be empty or could not be parsed')
        return
      }

      setFileName(file.name)
      setRows(parsed)
      setStep('preview')
    } catch {
      setParseError('Failed to read the file — please check it and try again')
    }
  }, [])

  // ── Drag & drop handlers ─────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  // ── Import ───────────────────────────────────────────────────

  const handleImport = async () => {
    if (validRows.length === 0) return
    setStep('importing')

    try {
      const res = await fetch('/api/admin/guests/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId,
          guests: validRows.map(r => ({ name: r.name, email: r.email, phone: r.phone })),
        }),
      })
      const data: ImportResult = await res.json()
      setResult(data)
      setStep('done')
    } catch {
      setResult({ created: 0, skipped: 0, errors: ['Network error — please try again'] })
      setStep('done')
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="import-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={step === 'importing' ? undefined : onClose}
      />

      {/* Panel */}
      <motion.div
        key="import-panel"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-2xl bg-[#151518] border border-white/10 pointer-events-auto max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 flex items-start justify-between flex-shrink-0">
            <div>
              <h2
                className="font-display text-ivory/85 font-light tracking-wider"
                style={{ fontSize: '1.15rem' }}
              >
                Import Guests
              </h2>
              <p className="text-xs text-ivory/25 mt-1 tracking-wider">
                {step === 'upload' && 'Upload a CSV file'}
                {step === 'preview' && `${fileName} — ${rows.length} row${rows.length !== 1 ? 's' : ''} found`}
                {step === 'importing' && 'Importing…'}
                {step === 'done' && 'Import complete'}
              </p>
            </div>
            {step !== 'importing' && (
              <button
                onClick={onClose}
                className="text-ivory/20 hover:text-ivory/50 transition-colors mt-0.5"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">

            {/* ── UPLOAD STEP ── */}
            {step === 'upload' && (
              <div className="p-6 space-y-5">
                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-sm p-12 text-center cursor-pointer transition-all ${
                    dragging
                      ? 'border-gold-DEFAULT/40 bg-gold-DEFAULT/5'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
                  />
                  <svg
                    className="mx-auto mb-3 text-ivory/20"
                    width="32" height="32" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.5"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  <p className="text-sm text-ivory/40 tracking-wider">
                    {dragging ? 'Drop to upload' : 'Drop file here or click to browse'}
                  </p>
                  <p className="text-xs text-ivory/20 mt-1.5">.csv only</p>
                </div>

                {/* Parse error */}
                {parseError && (
                  <p className="text-red-400/80 text-sm tracking-wider">{parseError}</p>
                )}

                {/* Format guide */}
                <div className="admin-card p-4 space-y-2">
                  <p className="text-xs tracking-widest uppercase text-ivory/25">Expected format</p>
                  <div className="font-mono text-xs text-ivory/40 bg-white/[0.03] px-3 py-2 rounded-sm space-y-0.5">
                    <p className="text-ivory/60">name, email, phone</p>
                    <p>Temi Johnson, temi@example.com, +2348012345678</p>
                    <p>David Okafor, david@example.com,</p>
                    <p>Fatima Abdullahi,,+2348087654321</p>
                  </div>
                  <p className="text-xs text-ivory/20 leading-relaxed">
                    Column headers are optional and case-insensitive.
                    Only <span className="text-ivory/40">name</span> is required —
                    email and phone can be filled in later.
                  </p>
                </div>
              </div>
            )}

            {/* ── PREVIEW STEP ── */}
            {step === 'preview' && (
              <div className="p-6 space-y-4">
                {/* Summary bar */}
                <div className="flex gap-4 text-xs tracking-wider">
                  <span className="text-green-400/70">
                    ✓ {validRows.length} will be imported
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="text-red-400/60">
                      ✕ {invalidRows.length} will be skipped (no name)
                    </span>
                  )}
                </div>

                {/* Preview table */}
                <div className="overflow-x-auto border border-white/5 rounded-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        {['Name', 'Email', 'Phone'].map(h => (
                          <th key={h} className="text-left py-2.5 px-3 text-xs tracking-widest uppercase text-ivory/25 font-normal">
                            {h}
                          </th>
                        ))}
                        <th className="py-2.5 px-3 text-xs tracking-widest uppercase text-ivory/25 font-normal" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr
                          key={i}
                          className={`border-b border-white/[0.04] ${!row.valid ? 'opacity-40' : ''}`}
                        >
                          <td className="py-2 px-3 text-sm text-ivory/80">
                            {row.name || <span className="text-red-400/60 italic">—</span>}
                          </td>
                          <td className="py-2 px-3 text-xs text-ivory/35">{row.email || '—'}</td>
                          <td className="py-2 px-3 text-xs text-ivory/35">{row.phone || '—'}</td>
                          <td className="py-2 px-3 text-right">
                            {!row.valid && (
                              <span className="text-xs text-red-400/60 italic">{row.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Re-upload link */}
                <button
                  onClick={() => { setStep('upload'); setRows([]); setFileName('') }}
                  className="text-xs text-ivory/25 hover:text-ivory/50 transition-colors tracking-wider underline underline-offset-2"
                >
                  Upload a different file
                </button>
              </div>
            )}

            {/* ── IMPORTING STEP ── */}
            {step === 'importing' && (
              <div className="p-12 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  className="w-8 h-8 border-2 border-gold-DEFAULT/20 border-t-gold-DEFAULT rounded-full mx-auto mb-4"
                />
                <p className="text-sm text-ivory/40 tracking-wider">
                  Importing {validRows.length} guest{validRows.length !== 1 ? 's' : ''}…
                </p>
              </div>
            )}

            {/* ── DONE STEP ── */}
            {step === 'done' && result && (
              <div className="p-8 text-center space-y-4">
                {result.created > 0 ? (
                  <div>
                    <p className="font-display text-4xl font-light text-gold-DEFAULT mb-2">
                      {result.created}
                    </p>
                    <p className="text-sm text-ivory/50 tracking-wider">
                      guest{result.created !== 1 ? 's' : ''} added successfully
                    </p>
                  </div>
                ) : (
                  <p className="text-ivory/40 text-sm tracking-wider">No new guests were added</p>
                )}

                {result.skipped > 0 && (
                  <p className="text-xs text-ivory/25 tracking-wider">
                    {result.skipped} row{result.skipped !== 1 ? 's' : ''} skipped (already exist or invalid)
                  </p>
                )}

                {result.errors.length > 0 && (
                  <div className="text-left space-y-1">
                    <p className="text-xs text-red-400/60 tracking-wider">{result.errors.length} error{result.errors.length !== 1 ? 's' : ''}:</p>
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-400/50">{e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/5 flex gap-3 flex-shrink-0">
            {step === 'upload' && (
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-xs tracking-widest uppercase text-ivory/30 border border-white/10 hover:border-white/20 hover:text-ivory/50 transition-colors"
              >
                Cancel
              </button>
            )}

            {step === 'preview' && (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 text-xs tracking-widest uppercase text-ivory/30 border border-white/10 hover:border-white/20 hover:text-ivory/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={validRows.length === 0}
                  className="flex-1 py-2.5 text-xs tracking-widest uppercase bg-gold-DEFAULT/10 text-gold-DEFAULT border border-gold-DEFAULT/20 hover:bg-gold-DEFAULT/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Import {validRows.length} Guest{validRows.length !== 1 ? 's' : ''}
                </button>
              </>
            )}

            {step === 'done' && (
              <button
                onClick={() => { if (result && result.created > 0) onSuccess(result.created); else onClose() }}
                className="flex-1 py-2.5 text-xs tracking-widest uppercase bg-gold-DEFAULT/10 text-gold-DEFAULT border border-gold-DEFAULT/20 hover:bg-gold-DEFAULT/20 transition-colors"
              >
                {result && result.created > 0 ? 'Done' : 'Close'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
