import { describe, it, expect } from 'vitest';
import { djb2 } from './hash.js';

describe('djb2', () => {
  it('same string → same token', () => {
    expect(djb2('src/render.ts')).toBe(djb2('src/render.ts'));
  });

  it('different strings → different tokens', () => {
    expect(djb2('src/a.ts')).not.toBe(djb2('src/b.ts'));
  });

  it('output is base36 ([0-9a-z]+)', () => {
    expect(djb2('. ++ ** ~~ -- ...')).toMatch(/^[0-9a-z]+$/);
  });
});
