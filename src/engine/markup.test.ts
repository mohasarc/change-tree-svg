import { describe, it, expect } from 'vitest';
import { embedMarkup } from './markup.js';
import { RenderError } from './error.js';

const urls = [
  'https://raw.githubusercontent.com/o/r/media/trees/abc/p0.svg',
  'https://raw.githubusercontent.com/o/r/media/trees/abc/p1.svg',
  'https://raw.githubusercontent.com/o/r/media/trees/abc/p2.svg',
];

describe('embedMarkup', () => {
  it('wraps N urls in one <pre> with N picture/img', () => {
    const markup = embedMarkup(urls);
    expect(markup.match(/<pre>/g)).toHaveLength(1);
    expect(markup.match(/<\/pre>/g)).toHaveLength(1);
    expect(markup.match(/<picture>/g)).toHaveLength(urls.length);
    expect(markup.match(/<img\b/g)).toHaveLength(urls.length);
    expect(markup.match(/alt=""/g)).toHaveLength(urls.length);
  });

  it('has no whitespace between tags', () => {
    const markup = embedMarkup(urls);
    expect(markup).not.toMatch(/>\s+</);
  });

  it('each img sits inside a picture, urls in document order, single line', () => {
    const markup = embedMarkup(urls);
    expect(markup).not.toContain('\n');
    expect(markup.match(/<img[^>]*>(?!<\/picture>)/)).toBeNull();
    const positions = urls.map((url) => markup.indexOf(url));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    for (const url of urls) expect(markup).toContain(`src="${url}"`);
  });

  it('throws RenderError on empty array', () => {
    expect(() => embedMarkup([])).toThrow(RenderError);
  });
});
