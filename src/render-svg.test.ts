import { expect, test } from "vitest";

import { measureLayout, LEGEND_TEXT } from "./measure-layout.js";
import { parseChangeTree } from "./parse-change-tree.js";
import { LIGHT_PALETTE, DARK_PALETTE } from "./palette.js";
import { renderSvg } from "./render-svg.js";

function render(tree: string): string {
  return renderSvg(measureLayout(parseChangeTree(tree), 120));
}

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

test("preserves every input line's text in order", () => {
  const svg = render(SAMPLE_TREE);
  const content = textContent(svg);
  let cursor = 0;
  for (const line of SAMPLE_TREE.split("\n")) {
    const at = content.indexOf(line, cursor);
    expect(at, `line not found in order: ${line}`).toBeGreaterThanOrEqual(0);
    cursor = at + line.length;
  }
});

test("each marker carries its status class", () => {
  const svg = render(SAMPLE_TREE);
  expect(svg).toContain('class="marker-changed"');
  expect(svg).toContain('class="marker-added"');
  // moved and removed appear in legend even if not in this tree
  expect(svg).toContain('class="marker-moved"');
  expect(svg).toContain('class="marker-removed"');
});

test("style maps marker classes to the four colors", () => {
  const svg = render(SAMPLE_TREE);
  expect(svg).toMatch(
    new RegExp(`\\.marker-added\\s*\\{[^}]*${LIGHT_PALETTE.markerAdded}`),
  );
  expect(svg).toMatch(
    new RegExp(`\\.marker-changed\\s*\\{[^}]*${LIGHT_PALETTE.markerChanged}`),
  );
  expect(svg).toMatch(
    new RegExp(`\\.marker-moved\\s*\\{[^}]*${LIGHT_PALETTE.markerMoved}`),
  );
  expect(svg).toMatch(
    new RegExp(`\\.marker-removed\\s*\\{[^}]*${LIGHT_PALETTE.markerRemoved}`),
  );
});

test("branch glyphs and comments are muted, paths are neutral", () => {
  const svg = render(SAMPLE_TREE);
  expect(svg).toContain('class="indent"');
  expect(svg).toContain('class="comment"');
  expect(svg).toContain('class="path"');
  expect(svg).toMatch(new RegExp(`\\.indent\\s*\\{[^}]*${LIGHT_PALETTE.muted}`));
  expect(svg).toMatch(new RegExp(`\\.comment\\s*\\{[^}]*${LIGHT_PALETTE.muted}`));
  expect(svg).toMatch(new RegExp(`\\.path\\s*\\{[^}]*${LIGHT_PALETTE.path}`));
});

test("legend appears with marker colors", () => {
  const svg = render(SAMPLE_TREE);
  expect(textContent(svg)).toContain(LEGEND_TEXT);
  expect(svg).toContain('class="legend-added"');
  expect(svg).toContain('class="legend-changed"');
  expect(svg).toContain('class="legend-moved"');
  expect(svg).toContain('class="legend-removed"');
});

test("legend sits below the tree lines", () => {
  const svg = render(SAMPLE_TREE);
  const legendIndex = svg.indexOf(LEGEND_TEXT);
  const lastTreeLine = "exports context surface";
  expect(svg.indexOf(lastTreeLine)).toBeLessThan(legendIndex);
});

test("style carries light palette by default and dark via media query", () => {
  const svg = render(SAMPLE_TREE);
  const styleMatch = svg.match(/<style>([\s\S]*?)<\/style>/);
  expect(styleMatch).not.toBeNull();
  const style = styleMatch![1];
  const mediaIndex = style.indexOf("@media (prefers-color-scheme: dark)");
  expect(mediaIndex).toBeGreaterThan(0);
  const lightRules = style.slice(0, mediaIndex);
  const darkRules = style.slice(mediaIndex);
  // light palette defaults
  expect(lightRules).toContain(LIGHT_PALETTE.path);
  expect(lightRules).toContain(LIGHT_PALETTE.container);
  // dark overrides path and container
  expect(darkRules).toContain(DARK_PALETTE.path);
  expect(darkRules).toContain(DARK_PALETTE.container);
  // markers shared: not overridden inside the dark block
  expect(darkRules).not.toContain(LIGHT_PALETTE.markerAdded.replace("#", ""));
});

test("markers keep one color across both themes", () => {
  const svg = render(SAMPLE_TREE);
  const style = svg.match(/<style>([\s\S]*?)<\/style>/)![1];
  const mediaIndex = style.indexOf("@media (prefers-color-scheme: dark)");
  const darkRules = style.slice(mediaIndex);
  for (const marker of [
    LIGHT_PALETTE.markerAdded,
    LIGHT_PALETTE.markerChanged,
    LIGHT_PALETTE.markerMoved,
    LIGHT_PALETTE.markerRemoved,
  ]) {
    expect(darkRules).not.toContain(marker);
  }
});

test("container is rounded, translucent, no stroke or filter", () => {
  const svg = render(SAMPLE_TREE);
  const rect = svg.match(/<rect[^>]*>/)![0];
  expect(rect).toContain('rx="8"');
  expect(rect).toContain('class="container"');
  expect(rect).not.toContain("stroke");
  expect(svg).not.toContain("<filter");
  expect(svg).not.toContain("filter=");
  // translucent fill driven by container class
  expect(svg).toMatch(
    new RegExp(`\\.container\\s*\\{[^}]*rgba\\(`),
  );
});

test("accessibility: role, aria-label and descriptive desc", () => {
  const svg = render(SAMPLE_TREE);
  expect(svg).toContain('role="img"');
  expect(svg).toMatch(/aria-label="[^"]+"/);
  const desc = svg.match(/<desc>([\s\S]*?)<\/desc>/);
  expect(desc).not.toBeNull();
  const text = desc![1];
  expect(text).toContain("Unicode");
  expect(text.toLowerCase()).toContain("tree");
  expect(text).toContain("added");
  expect(text).toContain("changed");
  expect(text).toContain("moved");
  expect(text).toContain("removed");
  expect(text.toLowerCase()).toContain("authored");
});

test("xml-escapes ampersand and angle brackets in user text", () => {
  const svg = render("└── ++ a&b<c>.ts # x & y < z");
  expect(svg).not.toMatch(/&(?!(amp|lt|gt|quot|#\d+);)/);
  // raw < only allowed as part of tags; user '<' must be escaped
  expect(svg).toContain("a&amp;b&lt;c&gt;.ts");
  expect(svg).toContain("x &amp; y &lt; z");
});

test("escapes special characters in desc and aria-label", () => {
  const svg = render("└── ++ a&b<c>.ts # note");
  const desc = svg.match(/<desc>([\s\S]*?)<\/desc>/)![1];
  expect(desc).not.toMatch(/&(?!(amp|lt|gt|quot|#\d+);)/);
});

test("renderSvg is deterministic for identical metrics", () => {
  const a = render(SAMPLE_TREE);
  const b = render(SAMPLE_TREE);
  expect(a).toBe(b);
});

test("renders tree with no markers plus legend", () => {
  const svg = render([".", "└── README.md # just docs"].join("\n"));
  expect(textContent(svg)).toContain("README.md");
  expect(textContent(svg)).toContain(LEGEND_TEXT);
});

test("output is a single svg element", () => {
  const svg = render(SAMPLE_TREE);
  expect(svg.trimStart().startsWith("<svg")).toBe(true);
  expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
});
