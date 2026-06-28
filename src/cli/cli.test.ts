import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli, type CliIO } from './cli.js';
import { USAGE } from './cli-args.js';
import { slice } from '../engine/slice.js';
import { DEFAULT_STRIP_WIDTH } from '../engine/palette.js';
import { contentHash, stripFiles, rawUrl } from './github/assets.js';
import { parseRemoteUrl } from './github/remote.js';
import type { GhRunner } from './github/gh.js';

const TREE = '.\n└── ++ a.ts';
const WIDE_TREE = '.\n└── ++ ' + 'a'.repeat(60) + '.ts';
const LEGEND_LINE = '++ added   ** changed   ~~ moved   -- removed';

function run(overrides: Partial<CliIO>) {
  const out: string[] = [];
  const err: string[] = [];
  const io: CliIO = {
    argv: [],
    stdin: null,
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
    ...overrides,
  };
  const code = runCli(io);
  return { code, out: out.join(''), err: err.join('') };
}

describe('runCli', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'cli-'));
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('default routes SVG + fallback to stdout', () => {
    const { code, out } = run({ argv: ['--text', TREE] });
    expect(code).toBe(0);
    expect(out).toContain('<svg');
    const svg = out.split('\n\n')[0];
    expect(svg).toMatch(/<\/svg>$/);
    expect(out).toContain(LEGEND_LINE);
    expect(out.endsWith('\n')).toBe(true);
  });

  it('--no-fallback emits pure SVG with single trailing newline', () => {
    const { code, out } = run({ argv: ['--text', TREE, '--no-fallback'] });
    expect(code).toBe(0);
    expect(out).not.toContain('\n\n');
    expect(out).toMatch(/<\/svg>\n$/);
  });

  it('-o writes pure SVG to file and fallback to stdout', () => {
    const path = join(dir, 'out.svg');
    const { code, out } = run({ argv: ['--text', TREE, '-o', path] });
    expect(code).toBe(0);
    const file = readFileSync(path, 'utf8');
    expect(file).toMatch(/^<svg/);
    expect(file).toMatch(/<\/svg>$/);
    expect(out).toBe(`.\n└── ++ a.ts\n\n++ added   ** changed   ~~ moved   -- removed\n`);
  });

  it('-o with --no-fallback writes file and leaves stdout empty', () => {
    const path = join(dir, 'out2.svg');
    const { code, out } = run({ argv: ['--text', TREE, '-o', path, '--no-fallback'] });
    expect(code).toBe(0);
    expect(readFileSync(path, 'utf8')).toMatch(/^<svg/);
    expect(out).toBe('');
  });

  it('default render is bare, --container adds the panel rect', () => {
    expect(run({ argv: ['--text', TREE] }).out).not.toContain('<rect');
    expect(run({ argv: ['--text', TREE, '--container'] }).out).toContain('<rect');
  });

  it('--no-legend drops legend from SVG and fallback', () => {
    const { code, out } = run({ argv: ['--text', TREE, '--no-legend'] });
    expect(code).toBe(0);
    expect(out).not.toContain(LEGEND_LINE);
  });

  it('reads from stdin', () => {
    const { code, out } = run({ stdin: TREE });
    expect(code).toBe(0);
    expect(out).toContain('<svg');
  });

  it('-o into an unwritable path reports file-create error', () => {
    const path = join(dir, 'missing-dir', 'out.svg');
    const { code, out, err } = run({ argv: ['--text', TREE, '-o', path] });
    expect(code).toBe(1);
    expect(err).toContain(`SVG file could not be created: ${path}`);
    expect(out).not.toContain('<svg');
  });

  it('collision reports the one-input error', () => {
    const { code, err } = run({ argv: ['--text', TREE], stdin: 'other' });
    expect(code).toBe(1);
    expect(err).toContain('exactly one Change Tree input must be provided');
  });

  it('no input reports the required error', () => {
    const { code, err } = run({ argv: [] });
    expect(code).toBe(1);
    expect(err).toContain('Change Tree input is required');
  });

  it('over-wide tree reports a RenderError', () => {
    const wide = '.\n└── ' + 'a'.repeat(500);
    const { code, err } = run({ argv: ['--text', wide] });
    expect(code).toBe(1);
    expect(err).toMatch(/^Cannot render tree:/);
  });

  it('--help prints usage to stdout', () => {
    const { code, out } = run({ argv: ['--help'] });
    expect(code).toBe(0);
    expect(out).toContain(USAGE);
  });

  it('unknown flag prints usage to stderr', () => {
    const { code, err } = run({ argv: ['--bogus'] });
    expect(code).toBe(1);
    expect(err).toContain(USAGE);
  });

  it('slice writes one strip file per slice and prints their names', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'slice-'));
    const expected = slice(WIDE_TREE, {}).length;
    const { code, out } = run({ argv: ['slice', '--text', WIDE_TREE, '--out-dir', outDir] });
    expect(code).toBe(0);
    expect(expected).toBeGreaterThan(1);
    const files = readdirSync(outDir).filter((name) => name.endsWith('.svg')).sort();
    expect(files.length).toBe(expected);
    for (let i = 0; i < expected; i++) {
      expect(files).toContain(`p${i}.svg`);
      expect(readFileSync(join(outDir, `p${i}.svg`), 'utf8')).toMatch(/^<svg/);
      expect(out).toContain(`p${i}.svg`);
    }
    rmSync(outDir, { recursive: true, force: true });
  });

  it('slice without --out-dir errors', () => {
    const { code, err } = run({ argv: ['slice', '--text', WIDE_TREE] });
    expect(code).toBe(1);
    expect(err).toContain('--out-dir');
  });

  it('markup over a strip dir prints a <pre> of base-url srcs', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'markup-'));
    run({ argv: ['slice', '--text', WIDE_TREE, '--out-dir', outDir] });
    const count = slice(WIDE_TREE, {}).length;
    const { code, out } = run({
      argv: ['markup', '--out-dir', outDir, '--base-url', 'https://x/y'],
    });
    expect(code).toBe(0);
    expect(out).toMatch(/^<pre>/);
    expect(out).toContain('</pre>');
    for (let i = 0; i < count; i++) {
      expect(out).toContain(`src="https://x/y/p${i}.svg"`);
    }
    expect(out.match(/<picture>/g)?.length).toBe(count);
    rmSync(outDir, { recursive: true, force: true });
  });

  it('markup without --base-url errors', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'markup-'));
    const { code, err } = run({ argv: ['markup', '--out-dir', outDir] });
    expect(code).toBe(1);
    expect(err).toContain('--base-url');
    rmSync(outDir, { recursive: true, force: true });
  });
});

const METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];

function methodOf(args: string[]): string {
  const i = args.indexOf('-X');
  return i >= 0 ? args[i + 1] : 'GET';
}

function endpointOf(args: string[]): string {
  return args.find((arg, i) => i > 0 && !arg.startsWith('-') && !METHODS.includes(arg)) ?? '';
}

interface FakeRunnerOptions {
  authed?: boolean;
  branchExists?: boolean;
  pathExists?: boolean;
}

function makeGhRunner({ authed = true, branchExists = true, pathExists = false }: FakeRunnerOptions = {}) {
  const calls: { args: string[]; stdin?: string }[] = [];
  let blobN = 0;
  const run: GhRunner = (args, stdin) => {
    calls.push({ args, stdin });
    if (args[0] === 'auth') {
      if (!authed) throw new Error('gh: not logged in');
      return '';
    }
    const endpoint = endpointOf(args);
    const method = methodOf(args);
    if (/\/git\/ref\/heads\/media$/.test(endpoint)) {
      if (!branchExists) throw new Error('404 Not Found');
      return JSON.stringify({ object: { sha: 'PARENT' } });
    }
    if (endpoint.includes('/contents/')) {
      if (!pathExists) throw new Error('404 Not Found');
      return JSON.stringify({ sha: 'EXISTING' });
    }
    if (/\/git\/commits\/[^/]+$/.test(endpoint)) return JSON.stringify({ tree: { sha: 'BASETREE' } });
    if (/\/git\/blobs$/.test(endpoint)) return JSON.stringify({ sha: `BLOB${blobN++}` });
    if (/\/git\/trees$/.test(endpoint)) return JSON.stringify({ sha: 'NEWTREE' });
    if (/\/git\/commits$/.test(endpoint) && method === 'POST') return JSON.stringify({ sha: 'NEWCOMMIT' });
    if (/\/git\/refs\/heads\/media$/.test(endpoint) && method === 'PATCH') return JSON.stringify({});
    if (/\/git\/refs$/.test(endpoint) && method === 'POST') return JSON.stringify({});
    throw new Error(`unexpected gh call: ${args.join(' ')}`);
  };
  return { run, calls };
}

function expectedUrls(slug: { owner: string; repo: string }): string[] {
  const strips = slice(WIDE_TREE, { legend: true, stripWidth: DEFAULT_STRIP_WIDTH });
  return stripFiles(strips, contentHash(strips)).map((f) => rawUrl(slug, 'media', f.path));
}

describe('upload and embed commands', () => {
  it('embed slices, uploads, and prints a <pre> of raw urls', () => {
    const { run: gh } = makeGhRunner();
    const { code, out } = run({ argv: ['embed', '--text', WIDE_TREE, '--repo', 'o/r'], gh });
    expect(code).toBe(0);
    expect(out).toMatch(/^<pre>/);
    expect(out).toContain('</pre>');
    const urls = expectedUrls({ owner: 'o', repo: 'r' });
    expect(urls.length).toBeGreaterThan(1);
    for (const url of urls) expect(out).toContain(`src="${url}"`);
    expect(out.match(/<picture>/g)?.length).toBe(urls.length);
  });

  it('embed without --repo detects the git remote', () => {
    const { run: gh } = makeGhRunner();
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
    const slug = parseRemoteUrl(remote)!;
    const { code, out } = run({ argv: ['embed', '--text', WIDE_TREE], gh });
    expect(code).toBe(0);
    expect(out).toContain(`raw.githubusercontent.com/${slug.owner}/${slug.repo}/media/`);
  });

  it('embed with an unauthed gh exits 1 with the auth message', () => {
    const { run: gh } = makeGhRunner({ authed: false });
    const { code, err } = run({ argv: ['embed', '--text', WIDE_TREE, '--repo', 'o/r'], gh });
    expect(code).toBe(1);
    expect(err).toContain('gh auth login');
  });

  it('upload prints one raw url per strip in order', () => {
    const { run: gh } = makeGhRunner();
    const { code, out } = run({ argv: ['upload', '--text', WIDE_TREE, '--repo', 'o/r'], gh });
    expect(code).toBe(0);
    expect(out).toBe(`${expectedUrls({ owner: 'o', repo: 'r' }).join('\n')}\n`);
  });

  it('upload reads strips from --out-dir', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'upload-'));
    run({ argv: ['slice', '--text', WIDE_TREE, '--out-dir', outDir] });
    const { run: gh } = makeGhRunner();
    const { code, out } = run({ argv: ['upload', '--out-dir', outDir, '--repo', 'o/r'], gh });
    expect(code).toBe(0);
    expect(out).toBe(`${expectedUrls({ owner: 'o', repo: 'r' }).join('\n')}\n`);
    rmSync(outDir, { recursive: true, force: true });
  });

  it('upload is idempotent: second run prints same urls and issues no writes', () => {
    const { run: gh, calls } = makeGhRunner({ pathExists: true });
    const { code, out } = run({ argv: ['upload', '--text', WIDE_TREE, '--repo', 'o/r'], gh });
    expect(code).toBe(0);
    expect(out).toBe(`${expectedUrls({ owner: 'o', repo: 'r' }).join('\n')}\n`);
    expect(calls.some((c) => c.args.includes('-X'))).toBe(false);
  });
});
