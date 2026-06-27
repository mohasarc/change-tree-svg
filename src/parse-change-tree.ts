export interface TreeLine {
  indent: string;
  marker: "++" | "**" | "~~" | "--" | null;
  body: string;
  comment: string | null; // verbatim from the whitespace run preceding the first " #" onward
}

export class ChangeTreeRenderError extends Error {}

const MARKERS = ["++", "**", "~~", "--"] as const;

const INDENT_CHARACTERS = new Set([" ", "\t", "├", "└", "│", "─"]);

function hasUnsupportedControlCharacter(tree: string): boolean {
  for (const character of tree) {
    const code = character.codePointAt(0);
    if (code === undefined) continue;
    if (character === "\t" || character === "\n") continue;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function splitComment(line: string): { rest: string; comment: string | null } {
  for (let index = 1; index < line.length; index += 1) {
    if (line[index] === "#" && /\s/.test(line[index - 1])) {
      const beforeHash = line.slice(0, index);
      const body = beforeHash.replace(/\s+$/, "");
      const gap = beforeHash.slice(body.length);
      return { rest: body, comment: gap + line.slice(index) };
    }
  }
  return { rest: line, comment: null };
}

function splitIndent(rest: string): { indent: string; remainder: string } {
  let index = 0;
  while (index < rest.length && INDENT_CHARACTERS.has(rest[index])) {
    index += 1;
  }
  return { indent: rest.slice(0, index), remainder: rest.slice(index) };
}

function splitMarker(remainder: string): {
  marker: TreeLine["marker"];
  body: string;
} {
  for (const marker of MARKERS) {
    if (remainder === marker) return { marker, body: "" };
    if (remainder.startsWith(marker + " ")) {
      return { marker, body: remainder.slice(marker.length + 1) };
    }
  }
  return { marker: null, body: remainder };
}

function parseLine(line: string): TreeLine {
  const { rest, comment } = splitComment(line);
  const { indent, remainder } = splitIndent(rest);
  const { marker, body } = splitMarker(remainder);
  return { indent, marker, body, comment };
}

export function parseChangeTree(tree: string): TreeLine[] {
  if (tree.trim() === "") {
    throw new ChangeTreeRenderError("Cannot render tree: tree is empty.");
  }
  if (hasUnsupportedControlCharacter(tree)) {
    throw new ChangeTreeRenderError(
      "Cannot render tree: tree contains unsupported control characters.",
    );
  }
  return tree.split("\n").map(parseLine);
}
