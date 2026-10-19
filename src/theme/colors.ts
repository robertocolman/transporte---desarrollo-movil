export const darkColors = {
  background: '#0d131f',
  surface: '#162032',
  surfaceHighlight: '#1f2d47',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  accent: '#38bdf8', // Celeste / Azul río Paraná
  accentMuted: '#0284c7',
  primary: '#0ea5e9',
  onPrimary: '#ffffff',
  border: '#27354f',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  card: '#162032',
};

export type Palette = typeof darkColors;

export const lightColors: Palette = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceHighlight: '#f1f5f9',
  text: '#0f172a',
  textMuted: '#64748b',
  accent: '#0284c7',
  accentMuted: '#38bdf8',
  primary: '#0284c7',
  onPrimary: '#ffffff',
  border: '#e2e8f0',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  card: '#ffffff',
};

export const colors = darkColors;

export const palettes = {
  light: lightColors,
  dark: darkColors,
};
