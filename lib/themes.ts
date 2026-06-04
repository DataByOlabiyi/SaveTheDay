// ──────────────────────────────────────────────────────────────
// Invitation Theme System
//
// Each theme maps to a set of CSS variable overrides injected
// directly onto the invitation page wrapper. The dark obsidian
// background stays constant — only the accent color family changes.
//
// `raw` is the R,G,B values for use in rgba(var(--accent-raw), opacity)
// ──────────────────────────────────────────────────────────────

export interface InvitationTheme {
  id:          string
  name:        string
  description: string
  // Core CSS variable overrides
  accent:      string  // --emerald-primary
  accentLight: string  // --emerald-light
  accentPale:  string  // --emerald-pale
  forest:      string  // --forest
  forestDeep:  string  // --forest-deep
  raw:         string  // --accent-raw  (R, G, B for rgba use)
  // Swatch preview colors for the settings picker
  swatch:      string[]
}

export const INVITATION_THEMES: InvitationTheme[] = [
  {
    id:          'emerald',
    name:        'Emerald',
    description: 'Lush, modern, romantic',
    accent:      '#0CA86E',
    accentLight: '#3DD9A0',
    accentPale:  '#C0EDD9',
    forest:      '#0B5240',
    forestDeep:  '#073628',
    raw:         '12, 168, 110',
    swatch:      ['#0CA86E', '#3DD9A0', '#073628'],
  },
  {
    id:          'champagne',
    name:        'Champagne',
    description: 'Black-tie, timeless, warm',
    accent:      '#C9A84C',
    accentLight: '#E8CC7A',
    accentPale:  '#F5E9C8',
    forest:      '#5C4A1E',
    forestDeep:  '#3D3010',
    raw:         '201, 168, 76',
    swatch:      ['#C9A84C', '#E8CC7A', '#3D3010'],
  },
  {
    id:          'blush',
    name:        'Blush',
    description: 'Soft, romantic, feminine',
    accent:      '#C4717A',
    accentLight: '#DFA0A7',
    accentPale:  '#F2D6D9',
    forest:      '#5C2E35',
    forestDeep:  '#3D1B20',
    raw:         '196, 113, 122',
    swatch:      ['#C4717A', '#DFA0A7', '#3D1B20'],
  },
  {
    id:          'midnight',
    name:        'Midnight',
    description: 'Formal, cinematic, dramatic',
    accent:      '#5B8FD4',
    accentLight: '#8CB4E8',
    accentPale:  '#C8DCF4',
    forest:      '#1E3358',
    forestDeep:  '#0F1E38',
    raw:         '91, 143, 212',
    swatch:      ['#5B8FD4', '#8CB4E8', '#0F1E38'],
  },
  {
    id:          'burgundy',
    name:        'Burgundy',
    description: 'Rich, intimate, traditional',
    accent:      '#A83D52',
    accentLight: '#C96070',
    accentPale:  '#F0C8CD',
    forest:      '#4A1A22',
    forestDeep:  '#300E14',
    raw:         '168, 61, 82',
    swatch:      ['#A83D52', '#C96070', '#300E14'],
  },
  {
    id:          'mauve',
    name:        'Mauve',
    description: 'Ethereal, whimsical, modern',
    accent:      '#9B7EC8',
    accentLight: '#C4A8E8',
    accentPale:  '#E8D8F8',
    forest:      '#3E2860',
    forestDeep:  '#280F45',
    raw:         '155, 126, 200',
    swatch:      ['#9B7EC8', '#C4A8E8', '#280F45'],
  },
]

export const DEFAULT_THEME_ID = 'emerald'

export function getTheme(id?: string | null): InvitationTheme {
  return INVITATION_THEMES.find(t => t.id === id) ?? INVITATION_THEMES[0]
}

export function getThemeVars(id?: string | null): React.CSSProperties {
  const t = getTheme(id)
  return {
    '--emerald-primary': t.accent,
    '--emerald-light':   t.accentLight,
    '--emerald-pale':    t.accentPale,
    '--forest':          t.forest,
    '--forest-deep':     t.forestDeep,
    '--accent-raw':      t.raw,
    '--accent':          t.accent,
    '--cta-bg':          t.accent,
  } as React.CSSProperties
}
