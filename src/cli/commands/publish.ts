import type { CliIO } from '../cli.js';
import type { CliOptions } from '../cli-args.js';
import { CliError } from '../cli-error.js';
import { resolveTreeText } from '../cli-input.js';
import { readStrips } from '../strip-files.js';
import { slice } from '../../engine/slice.js';
import { ghRunner, assertGhAuthed } from '../github/gh.js';
import { parseRemoteUrl, type RepoSlug } from '../github/remote.js';
import { gitRemoteUrl } from '../github/git.js';
import { contentHash, stripFiles } from '../github/assets.js';
import { uploadStrips } from '../github/upload.js';

export function resolveStrips(io: CliIO, options: CliOptions): string[] {
  if (options.outDir !== null) return readStrips(options.outDir);
  const stdin = io.stdin !== null && io.stdin.trim() !== '' ? io.stdin : null;
  const tree = resolveTreeText({ text: options.text, file: options.file, stdin });
  return slice(tree, {
    legend: options.legend,
    stripWidth: options.stripWidth,
    height: options.height ?? undefined,
  });
}

export function publishStrips(io: CliIO, options: CliOptions, strips: string[]): string[] {
  const run = io.gh ?? ghRunner;
  try {
    assertGhAuthed(run);
  } catch (err) {
    throw new CliError((err as Error).message);
  }
  const slug = resolveSlug(io, options);
  const hash = contentHash(strips);
  const files = stripFiles(strips, hash);
  return uploadStrips(run, { slug, branch: options.branch }, files);
}

function resolveSlug(io: CliIO, options: CliOptions): RepoSlug {
  if (options.repo !== null) {
    const slug = parseRepoArg(options.repo);
    if (slug === null) throw new CliError(`--repo must be owner/repo, got: ${options.repo}`);
    return slug;
  }
  let url: string;
  try {
    url = gitRemoteUrl(io.cwd ?? process.cwd());
  } catch {
    throw new CliError('could not read git remote origin; pass --repo owner/repo');
  }
  const slug = parseRemoteUrl(url);
  if (slug === null) throw new CliError(`could not parse a GitHub repo from remote: ${url}; pass --repo owner/repo`);
  return slug;
}

function parseRepoArg(repo: string): RepoSlug | null {
  const match = /^([^/]+)\/([^/]+)$/.exec(repo);
  return match ? { owner: match[1], repo: match[2] } : null;
}
