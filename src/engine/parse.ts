import type { Marker, ParsedLine } from './types.js';

const MARKER_RE = /^([ \t│├└─]*)(\+\+|\*\*|~~|--) (.+?)(?:\s+(#.+))?$/;

export function parseLines(input: string): ParsedLine[] {
  return input.split('\n').map((raw) => {
    const m = MARKER_RE.exec(raw);
    if (m) {
      return {
        raw,
        prefix: m[1] ?? '',
        marker: m[2] as Marker,
        body: m[3] ?? '',
        comment: m[4] ?? null,
      };
    }
    return {
      raw,
      prefix: '',
      marker: null,
      body: raw.trimEnd(),
      comment: null,
    };
  });
}
