/**
 * GBAIGBANCE Design System Tokens
 * Mathematical design scales and Apple-inspired iOS tokens
 */

export const colors = {
  primary: {
    DEFAULT: '#6600FF',
    hover: '#5500D6',
    active: '#4700B3',
    subtle: 'rgba(102, 0, 255, 0.08)',
    glow: 'rgba(102, 0, 255, 0.28)',
  },
  neutral: {
    canvasLight: '#F4F3F9',
    canvasDark: '#0D0C13',
    surfaceLight: '#FFFFFF',
    surfaceDark: '#171424',
    cardDark: '#1E192E',
    borderLight: 'rgba(0, 0, 0, 0.06)',
    borderDark: 'rgba(255, 255, 255, 0.08)',
  },
  accent: {
    amber: '#F59E0B',
    emerald: '#10B981',
    rose: '#F43F5E',
    cyan: '#06B6D4',
  },
} as const;

export const radii = {
  xs: '6px',
  sm: '10px',
  md: '14px',
  lg: '18px',
  xl: '22px',
  '2xl': '28px',
  pill: '9999px',
} as const;

export const shadows = {
  card: '0 8px 24px -4px rgba(0, 0, 0, 0.08)',
  cardHover: '0 14px 32px -4px rgba(0, 0, 0, 0.14)',
  glowPurple: '0 8px 28px -4px rgba(102, 0, 255, 0.35)',
  float: '0 20px 48px -8px rgba(0, 0, 0, 0.22)',
} as const;
