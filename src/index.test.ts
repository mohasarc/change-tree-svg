import { expect, test } from "vitest";

import { renderChangeTree } from "./index.js";

test("renderChangeTree is importable from the package entry", () => {
  expect(typeof renderChangeTree).toBe("function");
});

test("renderChangeTree returns a string", () => {
  expect(typeof renderChangeTree("...")).toBe("string");
});
