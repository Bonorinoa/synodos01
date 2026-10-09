// Presentation-only preferences. They never change graph data, traversal, or evidence.
export type DisplaySettings = { ghosts: number; contours: 'full' | 'faint' | 'off'; paper: 'grid' | 'plain'; motion: 'smooth' | 'instant'; labels: 'compact' | 'regular' | 'large' };
export const DISPLAY_DEFAULTS: DisplaySettings = { ghosts: 1, contours: 'full', paper: 'grid', motion: 'smooth', labels: 'regular' };
const KEY = 'an:display';
export const DISPLAY_EVENT = 'an:display';
export const LABEL_SCALE = { compact: .9, regular: 1, large: 1.15 } as const;

export function readDisplay(): DisplaySettings {
  if (typeof window === 'undefined') return DISPLAY_DEFAULTS;
  try { return { ...DISPLAY_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return DISPLAY_DEFAULTS; }
}
export function applyDisplay(s: DisplaySettings) {
  const root = document.documentElement;
  root.style.setProperty('--ghost-strength', String(s.ghosts));
  root.dataset.contours = s.contours; root.dataset.paper = s.paper; root.dataset.motion = s.motion;
}
export function saveDisplay(s: DisplaySettings) {
  localStorage.setItem(KEY, JSON.stringify(s)); applyDisplay(s);
  window.dispatchEvent(new CustomEvent(DISPLAY_EVENT, { detail: s }));
}
