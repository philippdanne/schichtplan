// Approximates the oklch() palette from the Claude Design prototype
// (design/project/Schichtplaner.dc.html) as hex values, since React Native
// (native platforms) has no oklch() support — only the web target could use
// the CSS color function directly.
export const colors = {
  bg: '#F5F7F3',
  surface: '#FCFDFB',
  border: '#DEE2D9',
  borderStrong: '#CCD1C5',
  textPrimary: '#26281F',
  textSecondary: '#6C7063',
  textMuted: '#8A8E80',
  accent: '#3E9C5C',
  accentContrast: '#FFFFFF',
  // Precomputed ~10% accent mixed into `surface` — used where the web design
  // specifies `color-mix()`, which has no native (iOS/Android) equivalent.
  accentBg: '#E9F3EB',
  danger: '#B85B3E',
  dangerBg: '#F3DCD3',
  warn: '#B87A3E',
  teal: '#3B9C8C',
  tealBg: '#DCF0EC',
  chipBg: '#E9ECE4',
  chipRemoveBg: '#DBDFD3',
  overlay: 'rgba(20,16,10,0.35)',
  roleVorstand: '#C2673A',
  roleFreiwillig: '#3B9C8C',
} as const;

export const swatches = ['#C2673A', '#3B9C8C', '#3E9C5C', '#4F5FB8', '#B84F5A'];
