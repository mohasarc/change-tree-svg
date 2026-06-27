import type { LayoutMetrics, LineMetrics } from "./measure-layout.js";
import {
  CORNER_RADIUS_PX,
  FONT_SIZE_PX,
  HORIZONTAL_PADDING_PX,
  LEGEND_TEXT,
  VERTICAL_PADDING_PX,
} from "./measure-layout.js";
import { DARK_PALETTE, LIGHT_PALETTE } from "./palette.js";

const FONT_FAMILY =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

const MARKER_CLASS: Record<NonNullable<LineMetrics["line"]["marker"]>, string> = {
  "++": "marker-added",
  "**": "marker-changed",
  "~~": "marker-moved",
  "--": "marker-removed",
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tspan(className: string, text: string): string {
  if (text === "") return "";
  return `<tspan class="${className}">${escapeXml(text)}</tspan>`;
}

function lineTspans(line: LineMetrics["line"]): string {
  const markerSpace = line.body === "" ? "" : " ";
  const segments = [tspan("indent", line.indent)];
  if (line.marker !== null) {
    segments.push(tspan(MARKER_CLASS[line.marker], line.marker));
    segments.push(tspan("path", markerSpace));
  }
  segments.push(tspan("path", line.body));
  if (line.comment !== null) {
    segments.push(tspan("comment", line.comment));
  }
  return segments.join("");
}

function styleBlock(): string {
  const light = LIGHT_PALETTE;
  const dark = DARK_PALETTE;
  return [
    "<style>",
    `text { font-family: ${FONT_FAMILY}; font-size: ${FONT_SIZE_PX}px; font-weight: normal; white-space: pre; }`,
    `.container { fill: ${light.container}; }`,
    `.path { fill: ${light.path}; }`,
    `.indent { fill: ${light.muted}; }`,
    `.comment { fill: ${light.muted}; }`,
    `.marker-added, .legend-added { fill: ${light.markerAdded}; }`,
    `.marker-changed, .legend-changed { fill: ${light.markerChanged}; }`,
    `.marker-moved, .legend-moved { fill: ${light.markerMoved}; }`,
    `.marker-removed, .legend-removed { fill: ${light.markerRemoved}; }`,
    "@media (prefers-color-scheme: dark) {",
    `.container { fill: ${dark.container}; }`,
    `.path { fill: ${dark.path}; }`,
    `.indent { fill: ${dark.muted}; }`,
    `.comment { fill: ${dark.muted}; }`,
    "}",
    "</style>",
  ].join("\n");
}

function legendTspans(): string {
  const [added, changed, moved, removed] = LEGEND_TEXT.split("   ");
  return [
    tspan("legend-added", added),
    tspan("path", "   "),
    tspan("legend-changed", changed),
    tspan("path", "   "),
    tspan("legend-moved", moved),
    tspan("path", "   "),
    tspan("legend-removed", removed),
  ].join("");
}

function describe(): string {
  return (
    "Colored Unicode repository tree showing where changes live in a diff. " +
    "Status markers: ++ added, ** changed, ~~ moved, -- removed. " +
    "Collapsed ... groups are authored summaries, not automatically verified diff counts."
  );
}

export function renderSvg(metrics: LayoutMetrics): string {
  const { widthPx, heightPx, lineHeightPx, lines } = metrics;
  const baselineOffset = Math.round(FONT_SIZE_PX * 0.8);
  const textX = HORIZONTAL_PADDING_PX;

  const lineElements = lines.map((measured, index) => {
    const y = VERTICAL_PADDING_PX + index * lineHeightPx + baselineOffset;
    return `<text x="${textX}" y="${y}" xml:space="preserve">${lineTspans(measured.line)}</text>`;
  });

  const legendY =
    VERTICAL_PADDING_PX + lines.length * lineHeightPx + baselineOffset;
  const legendElement = `<text x="${textX}" y="${legendY}" xml:space="preserve">${legendTspans()}</text>`;

  const description = escapeXml(describe());
  const ariaLabel = escapeXml(
    "Change Tree: colored Unicode repository tree of where changes live.",
  );

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}" role="img" aria-label="${ariaLabel}">`,
    `<desc>${description}</desc>`,
    styleBlock(),
    `<rect class="container" x="0" y="0" width="${widthPx}" height="${heightPx}" rx="${CORNER_RADIUS_PX}" ry="${CORNER_RADIUS_PX}"/>`,
    ...lineElements,
    legendElement,
    "</svg>",
  ].join("\n");
}
