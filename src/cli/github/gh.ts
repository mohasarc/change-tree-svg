import { execFileSync } from 'node:child_process';

export type GhRunner = (args: string[], stdin?: string) => string;

export const ghRunner: GhRunner = (args, stdin) =>
  execFileSync('gh', args, { input: stdin, encoding: 'utf8' });

export function assertGhAuthed(run: GhRunner): void {
  try {
    run(['auth', 'status']);
  } catch {
    throw new Error('GitHub CLI is not authenticated. Run `gh auth login`, then re-run.');
  }
}
