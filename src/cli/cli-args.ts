import { CliError } from './cli-error.js';
import { DEFAULT_STRIP_WIDTH } from '../engine/palette.js';

export type Command = 'render' | 'slice' | 'markup' | 'upload' | 'embed';

const COMMANDS: readonly Command[] = ['render', 'slice', 'markup', 'upload', 'embed'];

export interface CliOptions {
  command: Command;
  text: string | null;
  file: string | null;
  output: string | null;
  legend: boolean;
  fallback: boolean;
  container: boolean;
  stripWidth: number;
  height: number | null;
  outDir: string | null;
  baseUrl: string | null;
  repo: string | null;
  branch: string;
  help: boolean;
}

export const USAGE = [
  'Usage: change-tree-svg [command] [options]',
  '',
  'Commands:',
  '  render   render SVG (default)',
  '  slice    write strip SVGs to a directory',
  '  markup   print the GitHub <pre> embed block',
  '  upload   publish strips to the media branch',
  '  embed    slice, upload, and print the embed block',
  '',
  'Input (exactly one):',
  '  -t, --text <tree>     Change Tree notation as a string',
  '  -f, --file <path>     read Change Tree notation from a file',
  '  (or pipe Change Tree notation on stdin)',
  '',
  'Output:',
  '  -o, --output <path>   write SVG to a file instead of stdout',
  '  --no-fallback         omit the plain-text fallback',
  '',
  'Slicing:',
  '  --strip-width <px>    strip width (default 240)',
  '  --height <px>         scale strips to this height',
  '  --out-dir <dir>       slice: directory to write strip files',
  '  --base-url <url>      markup: base URL for strip srcs',
  '',
  'Publishing:',
  '  --repo <owner/repo>   override detected GitHub repo',
  '  --branch <name>       media branch (default media)',
  '',
  'Other:',
  '  --container           render the standalone padded panel',
  '  --no-legend           hide the legend in SVG and fallback',
  '  -h, --help            show this help',
].join('\n');

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    command: 'render',
    text: null,
    file: null,
    output: null,
    legend: true,
    fallback: true,
    container: false,
    stripWidth: DEFAULT_STRIP_WIDTH,
    height: null,
    outDir: null,
    baseUrl: null,
    repo: null,
    branch: 'media',
    help: false,
  };

  let start = 0;
  if (argv.length > 0 && !argv[0].startsWith('-')) {
    if (!COMMANDS.includes(argv[0] as Command)) {
      throw new CliError(`Unknown command: ${argv[0]}`);
    }
    options.command = argv[0] as Command;
    start = 1;
  }

  for (let i = start; i < argv.length; i++) {
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
      case '--strip-width':
        options.stripWidth = takeNumber(argv, ++i, flag);
        break;
      case '--height':
        options.height = takeNumber(argv, ++i, flag);
        break;
      case '--out-dir':
        options.outDir = takeValue(argv, ++i, flag);
        break;
      case '--base-url':
        options.baseUrl = takeValue(argv, ++i, flag);
        break;
      case '--repo':
        options.repo = takeValue(argv, ++i, flag);
        break;
      case '--branch':
        options.branch = takeValue(argv, ++i, flag);
        break;
      case '--container':
        options.container = true;
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

function takeNumber(argv: string[], index: number, flag: string): number {
  const value = takeValue(argv, index, flag);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new CliError(`Invalid number for ${flag}: ${value}`);
  return parsed;
}
