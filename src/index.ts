import { DEFAULT_MAX_LINE_WIDTH, measureLayout } from "./measure-layout.js";
import { parseChangeTree } from "./parse-change-tree.js";
import { renderSvg } from "./render-svg.js";

export interface RenderOptions {
  maxLineWidth?: number;
}

export function renderChangeTree(
  tree: string,
  options?: RenderOptions,
): string {
  const lines = parseChangeTree(tree);
  const metrics = measureLayout(
    lines,
    options?.maxLineWidth ?? DEFAULT_MAX_LINE_WIDTH,
  );
  return renderSvg(metrics);
}
