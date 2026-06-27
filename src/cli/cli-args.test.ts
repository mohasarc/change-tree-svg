import { describe, it, expect } from 'vitest';
import { parseArgs, USAGE } from './cli-args.js';
import { CliError } from './cli-error.js';

describe('parseArgs', () => {
  it('defaults: no input, legend on, fallback on, no help', () => {
    expect(parseArgs([])).toEqual({
      text: null,
      file: null,
      output: null,
      legend: true,
      fallback: true,
      help: false,
    });
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

  it('USAGE lists input and output flags', () => {
    expect(USAGE).toContain('--text');
    expect(USAGE).toContain('--file');
    expect(USAGE).toContain('--output');
  });
});
