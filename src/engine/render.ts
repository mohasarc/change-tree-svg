import type { ParsedLine, LayoutMetrics, Marker } from './types.js';
import { FONT_SIZE, LIGHT, DARK } from './palette.js';
import { LEGEND_ENTRIES } from './legend.js';

export { djb2 } from './hash.js';

const MARKER_CSS_VAR: Record<Marker, string> = {
  '++': 'added',
  '**': 'changed',
  '~~': 'moved',
  '--': 'removed',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface Palette {
  containerFill: string;
  pathText: string;
  muted: string;
  markerAdded: string;
  markerChanged: string;
  markerMoved: string;
  markerRemoved: string;
}

function cssProps(palette: Palette, indent: string): string {
  return [
    `--ct-fill: ${palette.containerFill}`,
    `--ct-path: ${palette.pathText}`,
    `--ct-muted: ${palette.muted}`,
    `--ct-added: ${palette.markerAdded}`,
    `--ct-changed: ${palette.markerChanged}`,
    `--ct-moved: ${palette.markerMoved}`,
    `--ct-removed: ${palette.markerRemoved}`,
  ].map((p) => `${indent}${p};`).join('\n');
}

function buildStyle(): string {
  return `<style>
    :root {
${cssProps(LIGHT, '      ')}
    }
    @media (prefers-color-scheme: dark) {
      :root {
${cssProps(DARK, '        ')}
      }
    }
    text { font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace; font-size: ${FONT_SIZE}px; }
  </style>`;
}

function treeLineText(line: ParsedLine, x: number, y: number): string {
  const pos = `x="${x}" y="${y}"`;

  if (line.raw.trimEnd() === '') {
    return `  <text ${pos}></text>`;
  }

  if (line.marker !== null) {
    const cssVar = MARKER_CSS_VAR[line.marker];
    const parts: string[] = [];
    if (line.prefix) {
      parts.push(`<tspan fill="var(--ct-muted)">${esc(line.prefix)}</tspan>`);
    }
    parts.push(`<tspan fill="var(--ct-${cssVar})">${esc(line.marker)}</tspan>`);
    parts.push(`<tspan fill="var(--ct-path)"> ${esc(line.body)}</tspan>`);
    if (line.comment !== null) {
      parts.push(`<tspan fill="var(--ct-muted)"> ${esc(line.comment)}</tspan>`);
    }
    return `  <text ${pos}>${parts.join('')}</text>`;
  }

  return `  <text ${pos}><tspan fill="var(--ct-path)">${esc(line.body)}</tspan></text>`;
}

function legendText(x: number, y: number): string {
  const last = LEGEND_ENTRIES.length - 1;
  const segs = LEGEND_ENTRIES.flatMap((entry, i) => {
    const cssVar = MARKER_CSS_VAR[entry.marker];
    const spacing = i < last ? '   ' : '';
    return [
      `<tspan fill="var(--ct-${cssVar})">${entry.marker}</tspan>`,
      `<tspan fill="var(--ct-muted)"> ${entry.label}${spacing}</tspan>`,
    ];
  }).join('');
  return `  <text x="${x}" y="${y}">${segs}</text>`;
}

const DESC_TEXT =
  'Colored Unicode repository tree showing where changes live in a diff. ' +
  'Status markers: ++ added (green), ** changed (yellow), ~~ moved (purple), -- removed (red). ' +
  'Collapsed ... groups are authored summaries, not automatically verified file counts.';

export function renderInner(lines: ParsedLine[], metrics: LayoutMetrics): string {
  const { hPadding, vPadding, lineHeight } = metrics;
  const legendY = vPadding + (lines.length + 1.5) * lineHeight;

  const treeLines = lines
    .map((line, i) => treeLineText(line, hPadding, vPadding + (i + 1) * lineHeight))
    .join('\n');

  const legend = metrics.legend ? `\n${legendText(hPadding, legendY)}` : '';

  return `${buildStyle()}
${treeLines}${legend}`;
}

export function renderSvg(lines: ParsedLine[], metrics: LayoutMetrics, inputHash: string): string {
  const { canvasWidth, canvasHeight } = metrics;
  const titleId = `ct-${inputHash}-title`;
  const descId = `ct-${inputHash}-desc`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" role="img" aria-labelledby="${titleId} ${descId}">
  <title id="${titleId}">Change Tree</title>
  <desc id="${descId}">${DESC_TEXT}</desc>
  <rect width="100%" height="100%" rx="8" fill="var(--ct-fill)" />
  ${renderInner(lines, metrics)}
</svg>`;
}
