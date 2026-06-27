import { describe, expect, it } from "vitest";
import { parseChangeTree } from "./parse-change-tree.js";
import {
  CHAR_ADVANCE_PX,
  HORIZONTAL_PADDING_PX,
  VERTICAL_PADDING_PX,
  LEGEND_TEXT,
  measureLayout,
} from "./measure-layout.js";
import { ChangeTreeRenderError } from "./parse-change-tree.js";

describe("measureLayout", () => {
  it("counts the whole visible line including the comment", () => {
    const line = "├── ++ file.ts # added";
    const metrics = measureLayout(parseChangeTree(line), 120);
    expect(metrics.lines[0].characterWidth).toBe([...line].length);
  });

  it("counts a marker-only line without a phantom trailing space", () => {
    const markerOnly = "└── ++";
    const markerWithComment = "└── ++ # note";
    expect(
      measureLayout(parseChangeTree(markerOnly), 120).lines[0].characterWidth,
    ).toBe([...markerOnly].length);
    expect(
      measureLayout(parseChangeTree(markerWithComment), 120).lines[0]
        .characterWidth,
    ).toBe([...markerWithComment].length);
  });

  it("counts each box-drawing glyph as one cell", () => {
    const line = "│   └── ** deep.ts";
    const metrics = measureLayout(parseChangeTree(line), 120);
    expect(metrics.lines[0].characterWidth).toBe([...line].length);
  });

  it("derives canvas width from the widest line and the legend", () => {
    const widerThanLegend = "x".repeat([...LEGEND_TEXT].length + 20);
    const wideMetrics = measureLayout(parseChangeTree(widerThanLegend), 200);
    expect(wideMetrics.widthPx).toBe(
      Math.round([...widerThanLegend].length * CHAR_ADVANCE_PX) +
        2 * HORIZONTAL_PADDING_PX,
    );

    const narrowMetrics = measureLayout(parseChangeTree("."), 120);
    expect(narrowMetrics.widthPx).toBe(
      Math.round([...LEGEND_TEXT].length * CHAR_ADVANCE_PX) +
        2 * HORIZONTAL_PADDING_PX,
    );
  });

  it("includes the legend so the canvas is at least legend-wide", () => {
    const metrics = measureLayout(parseChangeTree("."), 120);
    const legendWidthPx =
      Math.round([...LEGEND_TEXT].length * CHAR_ADVANCE_PX) +
      2 * HORIZONTAL_PADDING_PX;
    expect(metrics.widthPx).toBeGreaterThanOrEqual(legendWidthPx);
  });

  it("derives canvas height from line count plus legend plus padding", () => {
    const tree = "a\nb\nc";
    const lineCount = 3;
    const metrics = measureLayout(parseChangeTree(tree), 120);
    const legendHeight = metrics.lineHeightPx;
    expect(metrics.heightPx).toBe(
      lineCount * metrics.lineHeightPx +
        legendHeight +
        2 * VERTICAL_PADDING_PX,
    );
  });

  it("rejects an over-wide line at the default maximum", () => {
    const tree = "x".repeat(121);
    expect(() => measureLayout(parseChangeTree(tree), 120)).toThrow(
      ChangeTreeRenderError,
    );
    expect(() => measureLayout(parseChangeTree(tree), 120)).toThrow(
      "Cannot render tree: line 1 exceeds maximum width of 120 characters.",
    );
  });

  it("reports the 1-based line number of the over-wide line", () => {
    const tree = ["ok", "ok", "x".repeat(121)].join("\n");
    expect(() => measureLayout(parseChangeTree(tree), 120)).toThrow(
      "Cannot render tree: line 3 exceeds maximum width of 120 characters.",
    );
  });

  it("honors the maxLineWidth option and interpolates it into the message", () => {
    const tree = "x".repeat(50);
    expect(() => measureLayout(parseChangeTree(tree), 40)).toThrow(
      "Cannot render tree: line 1 exceeds maximum width of 40 characters.",
    );
  });

  it("measures a within-width tree without throwing and contains every line", () => {
    const tree = "└── ++ short.ts\n└── ** other.ts";
    const metrics = measureLayout(parseChangeTree(tree), 120);
    expect(metrics.lines).toHaveLength(2);
    const widest = Math.max(...metrics.lines.map((line) => line.characterWidth));
    expect(metrics.widthPx).toBeGreaterThanOrEqual(
      Math.round(widest * CHAR_ADVANCE_PX) + 2 * HORIZONTAL_PADDING_PX,
    );
    expect(metrics.heightPx).toBeGreaterThan(2 * VERTICAL_PADDING_PX);
  });
});
