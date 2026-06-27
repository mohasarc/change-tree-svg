// Generates example SVG artifacts for phase 4
import { parseLines } from '../../dist/parse.js';
import { measure } from '../../dist/layout.js';
import { renderSvg, djb2 } from '../../dist/render.js';
import { writeFileSync } from 'node:fs';

function render(input) {
  const lines = parseLines(input);
  const metrics = measure(lines, {});
  return renderSvg(lines, metrics, djb2(input));
}

// Default example — realistic change tree
const example = `.
├── src/
│   ├── ++ render.ts
│   ├── ** parse.ts # fix marker regex
│   ├── ~~ utils.ts # moved from lib/utils.ts
│   └── -- legacy.ts
└── ... 4 test files`;

writeFileSync(new URL('./example.svg', import.meta.url), render(example));
console.log('wrote example.svg');
