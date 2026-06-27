export interface TreeLine {
  indent: string;
  marker: "++" | "**" | "~~" | "--" | null;
  body: string;
  comment: string | null;
}

export class ChangeTreeRenderError extends Error {}
