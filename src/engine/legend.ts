import type { Marker } from './types.js';

export interface LegendEntry {
  marker: Marker;
  label: string;
}

export const LEGEND_ENTRIES: readonly LegendEntry[] = [
  { marker: '++', label: 'added' },
  { marker: '**', label: 'changed' },
  { marker: '~~', label: 'moved' },
  { marker: '--', label: 'removed' },
];

export function legendPlainText(): string {
  return LEGEND_ENTRIES.map((entry) => `${entry.marker} ${entry.label}`).join('   ');
}
