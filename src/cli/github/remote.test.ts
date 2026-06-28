import { describe, it, expect } from 'vitest';
import { parseRemoteUrl } from './remote.js';

describe('parseRemoteUrl', () => {
  it('parses https url with .git suffix', () => {
    expect(parseRemoteUrl('https://github.com/o/r.git')).toEqual({ owner: 'o', repo: 'r' });
  });

  it('parses https url without .git suffix', () => {
    expect(parseRemoteUrl('https://github.com/o/r')).toEqual({ owner: 'o', repo: 'r' });
  });

  it('parses ssh url', () => {
    expect(parseRemoteUrl('git@github.com:o/r.git')).toEqual({ owner: 'o', repo: 'r' });
  });

  it('trims a trailing slash', () => {
    expect(parseRemoteUrl('https://github.com/o/r/')).toEqual({ owner: 'o', repo: 'r' });
  });

  it('returns null for non-github host', () => {
    expect(parseRemoteUrl('https://gitlab.com/o/r.git')).toBeNull();
  });

  it('returns null for garbage', () => {
    expect(parseRemoteUrl('not a url')).toBeNull();
  });
});
