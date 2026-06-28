import type { GhRunner } from './gh.js';
import type { RepoSlug } from './remote.js';
import { rawUrl, type StripFile } from './assets.js';

export interface UploadTarget {
  slug: RepoSlug;
  branch: string;
}

export function uploadStrips(run: GhRunner, target: UploadTarget, files: StripFile[]): string[] {
  const { slug, branch } = target;
  const base = `repos/${slug.owner}/${slug.repo}`;
  const urls = files.map((file) => rawUrl(slug, branch, file.path));

  const parentSha = branchTipSha(run, base, branch);
  const directory = dirOf(files[0].path);
  if (parentSha !== null && treeAlreadyPublished(run, base, branch, directory)) return urls;

  const baseTreeSha = parentSha === null ? null : treeShaOfCommit(run, base, parentSha);
  const entries = files.map((file) => ({
    path: file.path,
    mode: '100644',
    type: 'blob',
    sha: createBlob(run, base, file.svg),
  }));
  const newTreeSha = createTree(run, base, baseTreeSha, entries);
  const commitSha = createCommit(run, base, newTreeSha, parentSha, `media: ${directory}`);
  if (parentSha === null) createRef(run, base, branch, commitSha);
  else updateRef(run, base, branch, commitSha);
  return urls;
}

function branchTipSha(run: GhRunner, base: string, branch: string): string | null {
  try {
    return objectSha(run(['api', `${base}/git/ref/heads/${branch}`]));
  } catch {
    return null;
  }
}

function treeAlreadyPublished(run: GhRunner, base: string, branch: string, directory: string): boolean {
  try {
    run(['api', `${base}/contents/${directory}?ref=${branch}`]);
    return true;
  } catch {
    return false;
  }
}

function treeShaOfCommit(run: GhRunner, base: string, commitSha: string): string {
  return JSON.parse(run(['api', `${base}/git/commits/${commitSha}`])).tree.sha as string;
}

function createBlob(run: GhRunner, base: string, svg: string): string {
  const content = Buffer.from(svg).toString('base64');
  const out = run(['api', '-X', 'POST', `${base}/git/blobs`, '-f', `content=${content}`, '-f', 'encoding=base64']);
  return JSON.parse(out).sha as string;
}

interface TreeEntry {
  path: string;
  mode: string;
  type: string;
  sha: string;
}

function createTree(run: GhRunner, base: string, baseTreeSha: string | null, tree: TreeEntry[]): string {
  const body = baseTreeSha === null ? { tree } : { base_tree: baseTreeSha, tree };
  const out = run(['api', '-X', 'POST', `${base}/git/trees`, '--input', '-'], JSON.stringify(body));
  return JSON.parse(out).sha as string;
}

function createCommit(run: GhRunner, base: string, treeSha: string, parentSha: string | null, message: string): string {
  const args = ['api', '-X', 'POST', `${base}/git/commits`, '-f', `message=${message}`, '-f', `tree=${treeSha}`];
  if (parentSha !== null) args.push('-f', `parents[]=${parentSha}`);
  return JSON.parse(run(args)).sha as string;
}

function createRef(run: GhRunner, base: string, branch: string, commitSha: string): void {
  run(['api', '-X', 'POST', `${base}/git/refs`, '-f', `ref=refs/heads/${branch}`, '-f', `sha=${commitSha}`]);
}

function updateRef(run: GhRunner, base: string, branch: string, commitSha: string): void {
  run(['api', '-X', 'PATCH', `${base}/git/refs/heads/${branch}`, '-f', `sha=${commitSha}`]);
}

function objectSha(out: string): string {
  return JSON.parse(out).object.sha as string;
}

function dirOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/'));
}
