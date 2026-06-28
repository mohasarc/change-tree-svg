import { describe, it, expect } from 'vitest';
import { parseArgs, USAGE } from './cli-args.js';
import { CliError } from './cli-error.js';
import { DEFAULT_STRIP_WIDTH } from '../engine/palette.js';

describe('parseArgs', () => {
  it('defaults: render command, no input, legend on, fallback on, no help', () => {
    expect(parseArgs([])).toEqual({
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
    });
  });

  it('leading subcommand sets command', () => {
    expect(parseArgs(['render']).command).toBe('render');
    expect(parseArgs(['slice']).command).toBe('slice');
    expect(parseArgs(['markup']).command).toBe('markup');
    expect(parseArgs(['upload']).command).toBe('upload');
    expect(parseArgs(['embed']).command).toBe('embed');
  });

  it('absent subcommand defaults to render', () => {
    expect(parseArgs(['--text', 'a']).command).toBe('render');
  });

  it('unknown subcommand throws CliError', () => {
    expect(() => parseArgs(['bogus'])).toThrow(CliError);
  });

  it('subcommand still parses following flags', () => {
    const options = parseArgs(['slice', '--text', 'a\nb', '--out-dir', 'd']);
    expect(options.command).toBe('slice');
    expect(options.text).toBe('a\nb');
    expect(options.outDir).toBe('d');
  });

  it('--text and -t populate text', () => {
    expect(parseArgs(['--text', 'a\nb']).text).toBe('a\nb');
    expect(parseArgs(['-t', 'a\nb']).text).toBe('a\nb');
  });

  it('--file and -f populate file', () => {
    expect(parseArgs(['--file', 'p']).file).toBe('p');
    expect(parseArgs(['-f', 'p']).file).toBe('p');
  });

  it('--output and -o populate output', () => {
    expect(parseArgs(['--output', 'p']).output).toBe('p');
    expect(parseArgs(['-o', 'p']).output).toBe('p');
  });

  it('--no-legend turns legend off', () => {
    expect(parseArgs(['--no-legend']).legend).toBe(false);
  });

  it('--no-fallback turns fallback off', () => {
    expect(parseArgs(['--no-fallback']).fallback).toBe(false);
  });

  it('--container turns container on', () => {
    expect(parseArgs(['--container']).container).toBe(true);
  });

  it('--strip-width parses a number', () => {
    expect(parseArgs(['--strip-width', '320']).stripWidth).toBe(320);
  });

  it('--strip-width rejects a non-number', () => {
    expect(() => parseArgs(['--strip-width', 'wide'])).toThrow(CliError);
  });

  it('--height parses a number', () => {
    expect(parseArgs(['--height', '480']).height).toBe(480);
  });

  it('--height rejects a non-number', () => {
    expect(() => parseArgs(['--height', 'tall'])).toThrow(CliError);
  });

  it('--out-dir, --base-url, --repo, --branch populate their fields', () => {
    const options = parseArgs([
      '--out-dir',
      'strips',
      '--base-url',
      'https://x/y',
      '--repo',
      'o/r',
      '--branch',
      'assets',
    ]);
    expect(options.outDir).toBe('strips');
    expect(options.baseUrl).toBe('https://x/y');
    expect(options.repo).toBe('o/r');
    expect(options.branch).toBe('assets');
  });

  it('--help and -h set help', () => {
    expect(parseArgs(['--help']).help).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('unknown flag throws CliError', () => {
    expect(() => parseArgs(['--bogus'])).toThrow(CliError);
  });

  it('--text with no value throws CliError', () => {
    expect(() => parseArgs(['--text'])).toThrow(CliError);
  });

  it('USAGE lists subcommands and input/output flags', () => {
    expect(USAGE).toContain('--text');
    expect(USAGE).toContain('--file');
    expect(USAGE).toContain('--output');
    expect(USAGE).toContain('slice');
    expect(USAGE).toContain('markup');
  });
});
