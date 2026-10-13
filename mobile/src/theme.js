/**
 * Vanix Sentinel — Design System / Theme
 *
 * A modern, inviting, Apple/Stripe-grade light palette:
 * - Crisp, clean, luminous background (#F8FAFC / #F1F5F9)
 * - Pure white elevated cards (#FFFFFF) with refined subtle shadows
 * - High-contrast obsidian & slate typography (#0F172A, #475569)
 * - Electric Royal Azure Blue primary (#2563EB)
 * - Vivid semantic status colors (Emerald, Coral, Amber, Sky)
 */

export const COLORS = {
  // ── Backgrounds ──────────────────────────────────────────
  bgPrimary:   '#F1F5F9',   // Crisp, clean modern canvas (Slate 100)
  bgSecondary: '#FFFFFF',   // Pure white secondary / surfaces
  bgCard:      '#FFFFFF',   // Pristine pure white card
  bgCardSolid: '#FFFFFF',   // Solid card
  bgInset:     '#F8FAFC',   // Recessed stats container (Slate 50)
  bgOverlay:   'rgba(15, 23, 42, 0.65)', // Modal overlay backdrop

  // ── Surfaces & Borders ───────────────────────────────────
  border:      '#E2E8F0',   // Crisp slate border (Slate 200)
  borderLight: '#EDF2F7',   // Ultra light divider
  borderFocus: '#2563EB',   // Blue focus ring

  // ── Primary (Electric Royal Blue) ────────────────────────
  primary:     '#2563EB',   // Electric Royal Blue (modern, trusted, engaging)
  primaryDark: '#1D4ED8',   // Deep blue for pressed / active
  primaryGlow: 'rgba(37, 99, 235, 0.12)', // Subtle blue tint
  primaryMuted:'rgba(37, 99, 235, 0.08)',

  // ── Accent (Warm Radiant Amber / Gold) ───────────────────
  accent:      '#F59E0B',   // Warm amber
  accentLight: '#FBBF24',   // Bright sun gold
  accentGlow:  'rgba(245, 158, 11, 0.14)',

  // ── Semantic Status ──────────────────────────────────────
  success:     '#10B981',   // Crisp emerald green
  successGlow: 'rgba(16, 185, 129, 0.12)',
  successDark: '#059669',

  danger:      '#EF4444',   // Vibrant modern coral red
  dangerDark:  '#DC2626',   // Strong red
  dangerGlow:  'rgba(239, 68, 68, 0.10)',

  info:        '#0284C7',   // Sky / Cyan blue
  infoDark:    '#0369A1',
  infoGlow:    'rgba(2, 132, 199, 0.12)',

  cyan:        '#06B6D4',   // Electric cyan
  cyanGlow:    'rgba(6, 182, 212, 0.12)',

  warning:     '#F59E0B',
  warningGlow: 'rgba(245, 158, 11, 0.12)',

  // ── Text ─────────────────────────────────────────────────
  textPrimary:   '#0F172A', // Slate 900 (Deep, high contrast, readable)
  textSecondary: '#475569', // Slate 600 (Clear secondary text)
  textTertiary:  '#94A3B8', // Slate 400 (Subdued meta & labels)
  textPlaceholder:'#94A3B8',
  textInverse:   '#FFFFFF', // White text on dark/colored surfaces

  // ── Chart-specific ───────────────────────────────────────
  chartLine:   '#2563EB',
  chartGradStart: 'rgba(37, 99, 235, 0.28)',
  chartGradEnd:   'rgba(37, 99, 235, 0.01)',
  chartGrid:   '#E2E8F0',
  chartAxisText: '#64748B',

  // ── Misc ─────────────────────────────────────────────────
  white:       '#FFFFFF',
  black:       '#000000',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 100,
};

export const FONTS = {
  h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, fontWeight: '500' },
  bodyBold: { fontSize: 14, fontWeight: '700' },
  caption: { fontSize: 12, fontWeight: '600' },
  captionSmall: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  overline: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  metric: { fontSize: 22, fontWeight: '800' },
  metricLarge: { fontSize: 28, fontWeight: '800' },
};

export const SHADOWS = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardLight: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  glow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
};
