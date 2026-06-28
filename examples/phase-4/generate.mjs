// Generates example SVG artifacts for phase 4 (bare, matching CLI default output)
import { render } from '../../dist/index.js';
import { writeFileSync } from 'node:fs';

const example = `.
├── src/
│   ├── ++ render.ts
│   ├── ** parse.ts # fix marker regex
│   ├── ~~ utils.ts # moved from lib/utils.ts
│   └── -- legacy.ts
└── ... 4 test files`;

const cli = `.
├── src/
│   ├── ++ cli.ts # entry + routing
│   └── ** index.ts
└── ... 3 test files`;

const jobs = [
  ['example', example, {}],
  ['cli-default', cli, {}],
  ['cli-no-legend', cli, { legend: false }],
];

for (const [name, input, opts] of jobs) {
  writeFileSync(new URL(`./${name}.svg`, import.meta.url), render(input, opts) + '\n');
  console.log(`wrote ${name}.svg`);
}
