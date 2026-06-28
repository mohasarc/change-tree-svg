import { RenderError } from './error.js';

export function embedMarkup(urls: string[]): string {
  if (urls.length === 0) throw new RenderError('no strip urls to embed');
  const pictures = urls.map((url) => `<picture><img src="${url}" alt=""></picture>`).join('');
  return `<pre>${pictures}</pre>`;
}
