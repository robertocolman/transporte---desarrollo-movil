export const darkColors = {
  background: '#0D1729',
  surface: '#14243D',
  surfaceHighlight: '#1D3552',

  text: '#F1F5F9',
  textMuted: '#A7B8C9',

  accent: '#19B58B',
  accentMuted: '#087F69',

  primary: '#087DB4',
  onPrimary: '#FFFFFF',

  border: '#2A4059',

  success: '#19B58B',
  warning: '#F59E0B',
  danger: '#EF4444',

  card: '#14243D',
};

export type Palette = typeof darkColors;

export const lightColors: Palette = {
  background: '#F5F8FA',
  surface: '#FFFFFF',
  surfaceHighlight: '#EAF2F6',

  text: '#102344',
  textMuted: '#64748B',

  accent: '#087F69',
  accentMuted: '#19B58B',

  primary: '#087DB4',
  onPrimary: '#FFFFFF',

  border: '#DCE5EB',

  success: '#087F69',
  warning: '#D97706',
  danger: '#DC2626',

  card: '#FFFFFF',
};

export const colors = darkColors;

export const palettes = {
  light: lightColors,
  dark: darkColors,
};
