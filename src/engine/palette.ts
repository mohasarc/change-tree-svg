export const FONT_SIZE = 18;
export const CHAR_WIDTH = 0.6 * FONT_SIZE;    // 10.8
export const LINE_HEIGHT = FONT_SIZE * 1.5;   // 27
export const H_PADDING = 21;
export const V_PADDING = 19;
export const DESCENT_ALLOWANCE = 0.3 * FONT_SIZE;   // 5.4 — bare bottom inset for descenders
export const LEGEND_GAP = LINE_HEIGHT;
export const DEFAULT_MAX_LINE_WIDTH = 120;
export const DEFAULT_STRIP_WIDTH = 240;

// GitHub Primer semantic tokens
export const LIGHT = {
  containerFill: 'rgba(246,248,250,0.85)',
  pathText: '#24292f',
  muted: '#57606a',
  markerAdded: '#1a7f37',
  markerChanged: '#9a6700',
  markerMoved: '#8250df',
  markerRemoved: '#cf222e',
} as const;

export const DARK = {
  containerFill: 'rgba(22,27,34,0.85)',
  pathText: '#e6edf3',
  muted: '#8b949e',
  markerAdded: '#3fb950',
  markerChanged: '#d29922',
  markerMoved: '#bc8cff',
  markerRemoved: '#f85149',
} as const;
