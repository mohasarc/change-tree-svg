export const FONT_SIZE = 13.6;                       // GitHub markdown fenced code block (85% of 16px)
export const CHAR_WIDTH = 0.6 * FONT_SIZE;           // 8.16
export const LINE_HEIGHT = 1.45 * FONT_SIZE;         // 19.72
export const H_PADDING = Math.round(1.2 * FONT_SIZE);   // 16
export const V_PADDING = Math.round(1.05 * FONT_SIZE);  // 14
export const DESCENT_ALLOWANCE = 0.3 * FONT_SIZE;    // bare bottom inset for descenders
export const LEGEND_GAP = LINE_HEIGHT;
export const DEFAULT_MAX_LINE_WIDTH = 120;
export const DEFAULT_STRIP_WIDTH = 240;

export const COMMENT_GAP = 2;           // char-widths between column and comment
export const COMMENT_OUTLIER_DELTA = 8; // chars past median before a body overflows
export const ORIGIN_NUDGE = -1;         // px left shift in bare mode to cancel glyph side-bearing

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
