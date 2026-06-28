import { describe, expect, it } from 'vitest';
import {
  CHAR_WIDTH,
  DESCENT_ALLOWANCE,
  FONT_SIZE,
  H_PADDING,
  LINE_HEIGHT,
  V_PADDING,
} from './palette.js';

describe('palette scalars', () => {
  it('FONT_SIZE matches GitHub markdown code-block scale', () => {
    expect(FONT_SIZE).toBe(13.6);
  });

  it('CHAR_WIDTH is 0.6em', () => {
    expect(CHAR_WIDTH).toBe(0.6 * FONT_SIZE);
  });

  it('LINE_HEIGHT is 1.45em', () => {
    expect(LINE_HEIGHT).toBe(1.45 * FONT_SIZE);
  });

  it('H_PADDING derives from FONT_SIZE', () => {
    expect(H_PADDING).toBe(Math.round(1.2 * FONT_SIZE));
  });

  it('V_PADDING derives from FONT_SIZE', () => {
    expect(V_PADDING).toBe(Math.round(1.05 * FONT_SIZE));
  });

  it('DESCENT_ALLOWANCE keeps the 0.3em ratio', () => {
    expect(DESCENT_ALLOWANCE).toBe(0.3 * FONT_SIZE);
  });
});
