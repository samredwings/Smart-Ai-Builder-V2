// App Forge — Design Tokens
// Metaphor: Terminal / Glass — dark, layered, precise

export const Colors = {
  // Base
  bg: '#080808',
  surface: '#111111',
  card: '#181818',
  cardElevated: '#202020',
  border: '#252525',
  borderSubtle: '#1a1a1a',

  // Brand
  primary: '#FFD700',
  primaryDim: '#FFD70022',
  primaryMuted: '#b89e00',

  // Accent
  accent: '#00E5A0',
  accentDim: '#00E5A015',

  // Text
  text: '#F0F0F0',
  textSecondary: '#A0A0A0',
  textMuted: '#606060',

  // Semantic
  success: '#22c55e',
  successDim: '#22c55e18',
  error: '#ef4444',
  errorDim: '#ef444418',
  warning: '#f59e0b',
  warningDim: '#f59e0b15',

  // Role colors for requirement sources
  sourceOriginal: '#3b82f6',
  sourceAdded: '#8b5cf6',
  sourceChanged: '#f59e0b',
  sourceManual: '#606060',
};

export const Typography = {
  fontSizeXs: 11,
  fontSizeSm: 13,
  fontSizeBase: 16,
  fontSizeMd: 18,
  fontSizeLg: 20,
  fontSizeXl: 24,
  fontSizeHero: 32,

  weightRegular: '400' as const,
  weightMedium: '500' as const,
  weightSemibold: '600' as const,
  weightBold: '700' as const,

  lineHeightBase: 24,
  lineHeightRelaxed: 26,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
};
