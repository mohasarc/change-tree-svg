import { execFileSync } from 'node:child_process';

export function gitRemoteUrl(cwd: string): string {
  return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8' }).trim();
}
