export interface RepoSlug {
  owner: string;
  repo: string;
}

const HTTPS = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/;
const SSH = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/;

export function parseRemoteUrl(url: string): RepoSlug | null {
  const match = HTTPS.exec(url) ?? SSH.exec(url);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}
