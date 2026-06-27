import type { ParsedLine, LayoutMetrics, Marker } from './types.js';
import { FONT_SIZE, LIGHT, DARK } from './palette.js';

const MARKER_CSS_VAR: Record<Marker, string> = {
  '++': 'added',
  '**': 'changed',
  '~~': 'moved',
  '--': 'removed',
};

export function djb2(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (((h << 5) + h) + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

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
  const segs = [
    `<tspan fill="var(--ct-added)">++</tspan>`,
    `<tspan fill="var(--ct-muted)"> added   </tspan>`,
    `<tspan fill="var(--ct-changed)">**</tspan>`,
    `<tspan fill="var(--ct-muted)"> changed   </tspan>`,
    `<tspan fill="var(--ct-moved)">~~</tspan>`,
    `<tspan fill="var(--ct-muted)"> moved   </tspan>`,
    `<tspan fill="var(--ct-removed)">--</tspan>`,
    `<tspan fill="var(--ct-muted)"> removed</tspan>`,
  ].join('');
  return `  <text x="${x}" y="${y}">${segs}</text>`;
}

const DESC_TEXT =
  'Colored Unicode repository tree showing where changes live in a diff. ' +
  'Status markers: ++ added (green), ** changed (yellow), ~~ moved (purple), -- removed (red). ' +
  'Collapsed ... groups are authored summaries, not automatically verified file counts.';

export function renderSvg(lines: ParsedLine[], metrics: LayoutMetrics, inputHash: string): string {
  const { canvasWidth, canvasHeight, hPadding, vPadding, lineHeight } = metrics;
  const titleId = `ct-${inputHash}-title`;
  const descId = `ct-${inputHash}-desc`;
  const legendY = vPadding + (lines.length + 1.5) * lineHeight;

  const treeLines = lines
    .map((line, i) => treeLineText(line, hPadding, vPadding + (i + 1) * lineHeight))
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" role="img" aria-labelledby="${titleId} ${descId}">
  ${buildStyle()}
  <title id="${titleId}">Change Tree</title>
  <desc id="${descId}">${DESC_TEXT}</desc>
  <rect width="100%" height="100%" rx="8" fill="var(--ct-fill)" />
${treeLines}
${legendText(hPadding, legendY)}
</svg>`;
}
