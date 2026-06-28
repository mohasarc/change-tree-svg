import { legendPlainText } from './legend.js';
import type { ParsedLine } from './types.js';

export function bodyEndChars(line: ParsedLine): number {
  if (line.marker === null) return line.body.length;
  return line.prefix.length + line.marker.length + 1 + line.body.length;
}

function median(sortedAscending: number[]): number {
  const mid = Math.floor(sortedAscending.length / 2);
  if (sortedAscending.length % 2 === 1) return sortedAscending[mid] as number;
  return ((sortedAscending[mid - 1] as number) + (sortedAscending[mid] as number)) / 2;
}

export function commentColumnChars(
  lines: ParsedLine[],
  delta: number,
  gap: number,
): number | null {
  const ends = lines
    .filter((line) => line.comment !== null)
    .map(bodyEndChars)
    .sort((a, b) => a - b);
  if (ends.length === 0) return null;
  const cutoff = median(ends) + delta;
  const aligned = ends.filter((end) => end <= cutoff);
  return Math.max(...aligned) + gap;
}

export function commentStartChars(line: ParsedLine, columnChars: number, gap: number): number {
  return Math.max(columnChars, bodyEndChars(line) + gap);
}

export function lineEndChars(
  line: ParsedLine,
  columnChars: number | null,
  gap: number,
): number {
  if (line.comment === null || columnChars === null) return bodyEndChars(line);
  return commentStartChars(line, columnChars, gap) + line.comment.length;
}

export function legendLengthChars(): number {
  return legendPlainText().length;
}
