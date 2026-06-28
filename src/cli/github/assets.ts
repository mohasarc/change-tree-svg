import { djb2 } from '../../engine/hash.js';
import type { RepoSlug } from './remote.js';

export interface StripFile {
  path: string;
  svg: string;
}

export function contentHash(strips: string[]): string {
  return djb2(strips.join(''));
}

export function stripFiles(strips: string[], hash: string): StripFile[] {
  return strips.map((svg, i) => ({ path: `trees/${hash}/p${i}.svg`, svg }));
}

export function rawUrl(slug: RepoSlug, branch: string, path: string): string {
  return `https://raw.githubusercontent.com/${slug.owner}/${slug.repo}/${branch}/${path}`;
}
