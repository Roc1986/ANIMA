/**
 * ANIMA Design System — Color Palette & Typography
 * Deep spiritual aesthetic: midnight, violet, lavender, gold.
 */

export const COLORS = {
  // ── Backgrounds ─────────────────────────────────────────────
  background: '#0F0A1E',    // Near-black midnight
  surface: '#1A1035',       // Dark purple surface
  surfaceElevated: '#231548', // Slightly lighter surface for cards/modals

  // ── Brand ───────────────────────────────────────────────────
  primary: '#2D1B69',       // Deep purple
  secondary: '#7C3AED',     // Violet
  accent: '#C4B5FD',        // Lavender

  // ── Text ────────────────────────────────────────────────────
  textPrimary: '#F5F3FF',   // Near-white
  textSecondary: '#A78BFA', // Light purple
  textMuted: '#6B7280',     // Grey for placeholders / disabled

  // ── Special ─────────────────────────────────────────────────
  gold: '#F59E0B',          // Gold for premium features
  goldLight: '#FCD34D',     // Light gold highlight
  success: '#10B981',       // Green for positive states
  warning: '#F59E0B',       // Amber for warnings
  error: '#EF4444',         // Red for errors

  // ── Tarot card ──────────────────────────────────────────────
  cardBack: '#1E1145',      // Card back deep purple
  cardBorder: '#7C3AED',    // Card border violet

  // ── Overlays ────────────────────────────────────────────────
  overlay: 'rgba(15, 10, 30, 0.85)',
  overlayLight: 'rgba(44, 27, 105, 0.4)',
} as const;

export const GRADIENTS = {
  background: ['#0F0A1E', '#1A1035', '#2D1B69'] as string[],
  card: ['#1A1035', '#2D1B69'] as string[],
  gold: ['#F59E0B', '#FCD34D'] as string[],
  accent: ['#7C3AED', '#C4B5FD'] as string[],
  header: ['#0F0A1E', 'transparent'] as string[],
} as const;

export const TYPOGRAPHY = {
  // Font families — Expo uses system fonts by default
  // Consider adding a custom font (e.g., Cormorant Garamond) via expo-font
  fontFamily: {
    regular: undefined, // System default
    medium: undefined,
    bold: undefined,
    serif: undefined, // For headings — load Cormorant or similar via expo-font
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const BORDER_RADIUS = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
} as const;

export const SHADOW = {
  card: {
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;
