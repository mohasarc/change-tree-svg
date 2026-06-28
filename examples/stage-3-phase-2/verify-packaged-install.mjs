// Packs the real tarball, installs it into a throwaway dir, and proves the
// published artifact works: public API renders, bin runs, internals are not
// deep-importable, and no test files ship. Run with: node verify-packaged-install.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sampleTree = '.\n└── ++ a.ts';

function npm(args, cwd) {
  return execFileSync('npm', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function packTarball() {
  const out = npm(['pack', '--json'], packageRoot);
  const filename = JSON.parse(out)[0].filename;
  return resolve(packageRoot, filename);
}

function installInto(dir, tarball) {
  npm(['init', '-y'], dir);
  npm(['install', tarball], dir);
}

function checkPublicApi(dir) {
  const probe = join(dir, 'probe-api.mjs');
  writeFileSync(
    probe,
    `import { render, renderFallback, RenderError } from 'change-tree-svg';\n` +
      `const tree = ${JSON.stringify(sampleTree)};\n` +
      `const svg = render(tree);\n` +
      `const fallback = renderFallback(tree);\n` +
      `console.log(JSON.stringify({\n` +
      `  svgHasSvg: svg.includes('<svg'),\n` +
      `  fallbackIsString: typeof fallback === 'string',\n` +
      `  fallbackHasTree: fallback.includes('a.ts'),\n` +
      `  fallbackHasLegend: fallback.includes('++ added'),\n` +
      `  renderErrorIsCtor: typeof RenderError === 'function',\n` +
      `}));\n`,
  );
  const result = JSON.parse(execFileSync('node', [probe], { cwd: dir, encoding: 'utf8' }));
  return (
    result.svgHasSvg &&
    result.fallbackIsString &&
    result.fallbackHasTree &&
    result.fallbackHasLegend &&
    result.renderErrorIsCtor
  );
}

function checkBin(dir) {
  const bin = join(dir, 'node_modules', '.bin', 'change-tree-svg');
  const out = execFileSync(bin, ['--text', '++ a.ts'], { cwd: dir, encoding: 'utf8' });
  return out.includes('<svg') && out.includes('++ added');
}

function checkDeepImportBlocked(dir) {
  const probe = join(dir, 'probe-deep.mjs');
  writeFileSync(
    probe,
    `let code = null;\n` +
      `try { await import('change-tree-svg/dist/engine/render.js'); }\n` +
      `catch (err) { code = err.code; }\n` +
      `console.log(code);\n`,
  );
  const out = execFileSync('node', [probe], { cwd: dir, encoding: 'utf8' }).trim();
  return out === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
}

function checkNoTestFilesShipped() {
  const out = npm(['pack', '--dry-run', '--json'], packageRoot);
  const files = JSON.parse(out)[0].files.map((entry) => entry.path);
  return !files.some((path) => /\.test\./.test(path));
}

function main() {
  const tarball = packTarball();
  const dir = mkdtempSync(join(tmpdir(), 'change-tree-svg-pack-'));
  const results = [];
  try {
    installInto(dir, tarball);
    results.push(['(a) public API renders', checkPublicApi(dir)]);
    results.push(['(b) installed bin runs', checkBin(dir)]);
    results.push(['(c) deep import blocked', checkDeepImportBlocked(dir)]);
    results.push(['(d) no test files shipped', checkNoTestFilesShipped()]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(tarball, { force: true });
  }

  let allPassed = true;
  for (const [label, passed] of results) {
    console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
    if (!passed) allPassed = false;
  }
  console.log(allPassed ? '\nAll assertions passed.' : '\nSome assertions failed.');
  process.exit(allPassed ? 0 : 1);
}

main();
