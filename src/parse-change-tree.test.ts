import { describe, expect, it } from "vitest";
import {
  ChangeTreeRenderError,
  parseChangeTree,
  type TreeLine,
} from "./parse-change-tree.js";

function rejoin(line: TreeLine): string {
  const marker = line.marker === null ? "" : line.marker + (line.body === "" ? "" : " ");
  return line.indent + marker + line.body + (line.comment ?? "");
}

describe("parseChangeTree order and verbatim fidelity", () => {
  it("keeps one record per line in input order and round-trips each line", () => {
    const tree = [
      ".",
      "└── packages/",
      "    └── core/",
      "        ├── ++ context-result.ts      # ContextResult model",
      "        └── ** refs-result-builder.ts # delegates kind counting",
    ].join("\n");

    const lines = parseChangeTree(tree);

    expect(lines).toHaveLength(5);
    const original = tree.split("\n");
    lines.forEach((line, index) => {
      expect(rejoin(line)).toBe(original[index]);
    });
  });
});

describe("parseChangeTree marker recognition", () => {
  it("reads a marker in marker position", () => {
    const [line] = parseChangeTree("├── ++ file.ts");
    expect(line.indent).toBe("├── ");
    expect(line.marker).toBe("++");
    expect(line.body).toBe("file.ts");
    expect(line.comment).toBeNull();
  });

  it("treats a marker-like string mid-path as path text", () => {
    const [line] = parseChangeTree("└── src/a**b.ts");
    expect(line.marker).toBeNull();
    expect(line.body).toBe("src/a**b.ts");
  });

  it("treats a marker-like string inside a comment as comment text", () => {
    const [line] = parseChangeTree("└── file.ts # ++ added");
    expect(line.marker).toBeNull();
    expect(line.body).toBe("file.ts");
    expect(line.comment).toBe(" # ++ added");
  });

  it("treats ... as body after a marker", () => {
    const [line] = parseChangeTree("└── ++ ... 12 files");
    expect(line.marker).toBe("++");
    expect(line.body).toBe("... 12 files");
  });

  it("treats ... as body with no marker", () => {
    const [line] = parseChangeTree("└── ... 12 files");
    expect(line.marker).toBeNull();
    expect(line.body).toBe("... 12 files");
  });
});

describe("parseChangeTree comment boundary", () => {
  it("keeps a hash with no preceding whitespace in the body", () => {
    const [line] = parseChangeTree("└── a#b.ts");
    expect(line.comment).toBeNull();
    expect(line.body).toBe("a#b.ts");
  });

  it("splits off a comment when the hash is preceded by a space", () => {
    const [line] = parseChangeTree("└── path # note");
    expect(line.body).toBe("path");
    expect(line.comment).toBe(" # note");
  });

  it("preserves aligned multi-space gap before the comment verbatim", () => {
    const [line] = parseChangeTree("└── file.ts      # note");
    expect(line.body).toBe("file.ts");
    expect(line.comment).toBe("      # note");
  });
});

describe("parseChangeTree empty lines", () => {
  it("preserves a blank line as a record with empty segments in order", () => {
    const lines = parseChangeTree(["├── ++ a.ts", "", "└── ** b.ts"].join("\n"));
    expect(lines).toHaveLength(3);
    expect(lines[1]).toEqual({
      indent: "",
      marker: null,
      body: "",
      comment: null,
    });
  });
});

describe("parseChangeTree rejections", () => {
  it("rejects an empty tree", () => {
    expect(() => parseChangeTree("")).toThrowError(
      new ChangeTreeRenderError("Cannot render tree: tree is empty."),
    );
  });

  it("rejects a whitespace-only tree", () => {
    expect(() => parseChangeTree("   \n\t")).toThrowError(
      new ChangeTreeRenderError("Cannot render tree: tree is empty."),
    );
  });

  it("rejects unsupported control characters", () => {
    expect(() => parseChangeTree("└── ab.ts")).toThrowError(
      new ChangeTreeRenderError(
        "Cannot render tree: tree contains unsupported control characters.",
      ),
    );
  });

  it("allows tab and newline", () => {
    expect(() => parseChangeTree("├── ++ a.ts\n\t└── ** b.ts")).not.toThrow();
  });
});
