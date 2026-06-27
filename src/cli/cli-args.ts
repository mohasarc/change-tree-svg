import { CliError } from './cli-error.js';

export interface CliOptions {
  text: string | null;
  file: string | null;
  output: string | null;
  legend: boolean;
  fallback: boolean;
  help: boolean;
}

export const USAGE = [
  'Usage: change-tree-svg [options]',
  '',
  'Input (exactly one):',
  '  -t, --text <tree>   Change Tree notation as a string',
  '  -f, --file <path>   read Change Tree notation from a file',
  '  (or pipe Change Tree notation on stdin)',
  '',
  'Output:',
  '  -o, --output <path> write SVG to a file instead of stdout',
  '  --no-fallback       omit the plain-text fallback',
  '',
  'Other:',
  '  --no-legend         hide the legend in SVG and fallback',
  '  -h, --help          show this help',
].join('\n');

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    text: null,
    file: null,
    output: null,
    legend: true,
    fallback: true,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    switch (flag) {
      case '--text':
      case '-t':
        options.text = takeValue(argv, ++i, flag);
        break;
      case '--file':
      case '-f':
        options.file = takeValue(argv, ++i, flag);
        break;
      case '--output':
      case '-o':
        options.output = takeValue(argv, ++i, flag);
        break;
      case '--no-legend':
        options.legend = false;
        break;
      case '--no-fallback':
        options.fallback = false;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new CliError(`Unknown option: ${flag}`);
    }
  }

  return options;
}

function takeValue(argv: string[], index: number, flag: string): string {
  if (index >= argv.length) throw new CliError(`Missing value for ${flag}`);
  return argv[index];
}
