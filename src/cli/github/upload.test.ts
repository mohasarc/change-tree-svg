import { describe, it, expect } from 'vitest';
import { uploadStrips } from './upload.js';
import { assertGhAuthed } from './gh.js';
import { stripFiles, contentHash } from './assets.js';

const strips = ['<svg>a</svg>', '<svg>b</svg>', '<svg>c</svg>'];
const hash = contentHash(strips);
const files = stripFiles(strips, hash);
const target = { slug: { owner: 'o', repo: 'r' }, branch: 'media' };

function methodOf(args: string[]): string {
  const i = args.indexOf('-X');
  return i >= 0 ? args[i + 1] : 'GET';
}

function label(args: string[]): string {
  const endpoint = args[1];
  const method = methodOf(args);
  if (endpoint === 'repos/o/r/git/ref/heads/media' && method === 'GET') return 'ensure';
  if (endpoint === 'repos/o/r/git/refs' && method === 'POST') return 'create-ref';
  if (endpoint.startsWith('repos/o/r/git/commits/')) return 'basetree';
  if (endpoint.startsWith('repos/o/r/contents/')) return 'probe';
  if (endpoint === 'repos/o/r/git/blobs') return 'blob';
  if (endpoint === 'repos/o/r/git/trees') return 'tree';
  if (endpoint === 'repos/o/r/git/commits' && method === 'POST') return 'commit';
  if (endpoint === 'repos/o/r/git/refs/heads/media' && method === 'PATCH') return 'ref';
  return 'other';
}

interface RunnerOptions {
  authed?: boolean;
  branchExists?: boolean;
  pathExists?: boolean;
}

function makeRunner({ authed = true, branchExists = true, pathExists = false }: RunnerOptions = {}) {
  const calls: { args: string[]; stdin?: string }[] = [];
  let blobN = 0;
  const run = (args: string[], stdin?: string): string => {
    calls.push({ args, stdin });
    if (args[0] === 'auth') {
      if (!authed) throw new Error('gh: not logged in');
      return '';
    }
    const endpoint = args[1];
    const method = methodOf(args);
    if (endpoint === 'repos/o/r/git/ref/heads/media') {
      if (!branchExists) throw new Error('404 Not Found');
      return JSON.stringify({ object: { sha: 'PARENT' } });
    }
    if (endpoint === 'repos/o/r') return JSON.stringify({ default_branch: 'main' });
    if (endpoint === 'repos/o/r/git/ref/heads/main') return JSON.stringify({ object: { sha: 'DEFTIP' } });
    if (endpoint === 'repos/o/r/git/refs' && method === 'POST') return JSON.stringify({});
    if (endpoint.startsWith('repos/o/r/git/commits/')) return JSON.stringify({ tree: { sha: 'BASETREE' } });
    if (endpoint.startsWith('repos/o/r/contents/')) {
      if (!pathExists) throw new Error('404 Not Found');
      return JSON.stringify({ sha: 'EXISTING' });
    }
    if (endpoint === 'repos/o/r/git/blobs') return JSON.stringify({ sha: `BLOB${blobN++}` });
    if (endpoint === 'repos/o/r/git/trees') return JSON.stringify({ sha: 'NEWTREE' });
    if (endpoint === 'repos/o/r/git/commits' && method === 'POST') return JSON.stringify({ sha: 'NEWCOMMIT' });
    if (endpoint === 'repos/o/r/git/refs/heads/media' && method === 'PATCH') return JSON.stringify({});
    throw new Error(`unexpected gh call: ${args.join(' ')}`);
  };
  return { run, calls };
}

describe('uploadStrips', () => {
  it('issues branch-ensure → blobs → tree → commit → ref-update in order', () => {
    const { run, calls } = makeRunner();
    uploadStrips(run, target, files);
    const seq = calls.map((c) => label(c.args)).filter((l) => l !== 'basetree' && l !== 'probe' && l !== 'other');
    expect(seq).toEqual(['ensure', 'blob', 'blob', 'blob', 'tree', 'commit', 'ref']);
  });

  it('sends one base64 blob per strip and a tree on the base tree', () => {
    const { run, calls } = makeRunner();
    uploadStrips(run, target, files);
    const blobCalls = calls.filter((c) => label(c.args) === 'blob');
    expect(blobCalls).toHaveLength(3);
    const firstBlob = Buffer.from(strips[0]).toString('base64');
    expect(blobCalls[0].args).toContain(`content=${firstBlob}`);
    expect(blobCalls[0].args).toContain('encoding=base64');
    const treeCall = calls.find((c) => label(c.args) === 'tree')!;
    expect(treeCall.stdin).toContain('BASETREE');
    expect(treeCall.stdin).toContain(files[0].path);
    expect(treeCall.stdin).toContain('BLOB0');
    const commitCall = calls.find((c) => label(c.args) === 'commit')!;
    expect(commitCall.args).toContain('tree=NEWTREE');
    expect(commitCall.args).toContain('parents[]=PARENT');
    const refCall = calls.find((c) => label(c.args) === 'ref')!;
    expect(refCall.args).toContain('sha=NEWCOMMIT');
  });

  it('returns raw urls in strip order', () => {
    const { run } = makeRunner();
    const urls = uploadStrips(run, target, files);
    expect(urls).toEqual(files.map((f) => `https://raw.githubusercontent.com/o/r/media/${f.path}`));
  });

  it('skips all write calls when the contents probe already finds the tree', () => {
    const { run, calls } = makeRunner({ pathExists: true });
    const urls = uploadStrips(run, target, files);
    const writeLabels = ['blob', 'tree', 'commit', 'ref', 'create-ref'];
    expect(calls.map((c) => label(c.args)).filter((l) => writeLabels.includes(l))).toEqual([]);
    expect(urls).toEqual(files.map((f) => `https://raw.githubusercontent.com/o/r/media/${f.path}`));
  });

  it('creates an orphan branch when it is missing: no base_tree, no parents', () => {
    const { run, calls } = makeRunner({ branchExists: false });
    uploadStrips(run, target, files);
    const treeCall = calls.find((c) => label(c.args) === 'tree')!;
    expect(treeCall.stdin).not.toContain('base_tree');
    const commitCall = calls.find((c) => label(c.args) === 'commit')!;
    expect(commitCall.args.some((a) => a.startsWith('parents[]='))).toBe(false);
    const createRef = calls.find((c) => label(c.args) === 'create-ref')!;
    expect(createRef.args).toContain('ref=refs/heads/media');
    expect(createRef.args).toContain('sha=NEWCOMMIT');
    expect(calls.some((c) => endpointOf(c.args) === 'repos/o/r')).toBe(false);
  });
});

describe('assertGhAuthed', () => {
  it('passes when gh auth status succeeds', () => {
    const { run } = makeRunner();
    expect(() => assertGhAuthed(run)).not.toThrow();
  });

  it('throws an error telling the user to run gh auth login', () => {
    const { run } = makeRunner({ authed: false });
    expect(() => assertGhAuthed(run)).toThrow(/gh auth login/);
  });
});
