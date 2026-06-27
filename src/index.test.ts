import { expect, test } from "vitest";

import { LEGEND_TEXT } from "./measure-layout.js";
import { ChangeTreeRenderError } from "./parse-change-tree.js";
import { LIGHT_PALETTE } from "./palette.js";
import { renderChangeTree } from "./index.js";

const SAMPLE_TREE = [
  ".",
  "├── apps/",
  "│   └── cli/",
  "│       ├── src/",
  "│       │   ├── ** program.ts # registers context command",
  "│       │   └── ++ commands/context/",
  "│       │       └── ++ ... 2 files # command compute + registration",
  "└── packages/",
  "    └── core/src/",
  "        ├── ++ intermediate-representation/context-result.ts # result model",
  "        └── ** index.ts # exports context surface",
].join("\n");

function textContent(svg: string): string {
  return svg
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

test("renderChangeTree is importable from the package entry", () => {
  expect(typeof renderChangeTree).toBe("function");
});

test("renderChangeTree returns an svg document", () => {
  const svg = renderChangeTree(SAMPLE_TREE);
  expect(svg.trimStart().startsWith("<svg")).toBe(true);
  expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
});

test("end-to-end output carries lines, marker colors, muted classes, legend", () => {
  const svg = renderChangeTree(SAMPLE_TREE);
  const content = textContent(svg);
  for (const line of SAMPLE_TREE.split("\n")) {
    expect(content).toContain(line);
  }
  expect(svg).toContain(LIGHT_PALETTE.markerAdded);
  expect(svg).toContain(LIGHT_PALETTE.markerChanged);
  expect(svg).toContain(LIGHT_PALETTE.markerMoved);
  expect(svg).toContain(LIGHT_PALETTE.markerRemoved);
  expect(svg).toContain('class="indent"');
  expect(svg).toContain('class="comment"');
  expect(content).toContain(LEGEND_TEXT);
});

test("renderChangeTree is deterministic", () => {
  expect(renderChangeTree(SAMPLE_TREE)).toBe(renderChangeTree(SAMPLE_TREE));
});

test("rejects empty tree through the entry point", () => {
  expect(() => renderChangeTree("   ")).toThrowError(ChangeTreeRenderError);
  expect(() => renderChangeTree("   ")).toThrowError(
    "Cannot render tree: tree is empty.",
  );
});

test("rejects an over-wide line through the entry point", () => {
  const wide = "└── ++ " + "a".repeat(200) + ".ts";
  expect(() => renderChangeTree(wide)).toThrowError(ChangeTreeRenderError);
  expect(() => renderChangeTree(wide)).toThrowError(
    /Cannot render tree: line 1 exceeds maximum width of 120 characters\./,
  );
});

test("honors maxLineWidth option through the entry point", () => {
  const line = "└── ++ " + "a".repeat(50) + ".ts";
  expect(() => renderChangeTree(line, { maxLineWidth: 40 })).toThrowError(
    /maximum width of 40 characters/,
  );
});

test("rejects unsupported control characters through the entry point", () => {
  expect(() => renderChangeTree("└── ++ ab.ts")).toThrowError(
    "Cannot render tree: tree contains unsupported control characters.",
  );
});
