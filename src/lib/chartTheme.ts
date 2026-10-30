/**
 * Colors for Recharts props on light/dark-aware charts. CSS variables work inside SVG attributes,
 * so these follow the active theme without re-rendering.
 */
export const CHART = {
  ink: 'var(--color-ink)',
  grid: 'var(--color-zinc-200)',
  axis: 'var(--color-zinc-500)',
  cursor: 'var(--color-zinc-100)',
  muted: '#9ca3af',
  accent: '#3b82f6',
};

/** Charts drawn on a fixed dark background (frontier, backtester) use the same colors in both themes. */
export const DARK_CHART = {
  background: 'bg-[#111111]',
  grid: '#222',
  axis: '#444',
  tick: '#888',
  tooltip: { backgroundColor: '#111', borderColor: '#333', color: '#eee', fontSize: '10px', fontFamily: 'monospace' },
};
