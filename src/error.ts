export class RenderError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`Cannot render tree: ${reason}.`);
    this.name = 'RenderError';
    this.reason = reason;
  }
}
