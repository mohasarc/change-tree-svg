import { describe, it, expect } from 'vitest';
import { contentHash, stripFiles, rawUrl } from './assets.js';

const strips = ['<svg>a</svg>', '<svg>b</svg>', '<svg>c</svg>'];

describe('contentHash', () => {
  it('is stable for the same strips', () => {
    expect(contentHash(strips)).toBe(contentHash([...strips]));
  });

  it('changes when any strip byte changes', () => {
    const mutated = [strips[0], strips[1], '<svg>C</svg>'];
    expect(contentHash(mutated)).not.toBe(contentHash(strips));
  });
});

describe('stripFiles', () => {
  it('builds content-addressed paths per strip', () => {
    const files = stripFiles(strips, 'abc');
    expect(files.map((f) => f.path)).toEqual([
      'trees/abc/p0.svg',
      'trees/abc/p1.svg',
      'trees/abc/p2.svg',
    ]);
    expect(files.map((f) => f.svg)).toEqual(strips);
  });
});

describe('rawUrl', () => {
  it('builds the raw.githubusercontent.com url', () => {
    expect(rawUrl({ owner: 'o', repo: 'r' }, 'media', 'trees/abc/p0.svg')).toBe(
      'https://raw.githubusercontent.com/o/r/media/trees/abc/p0.svg',
    );
  });
});
