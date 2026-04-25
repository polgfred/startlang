import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { Interpreter, type RunResult } from '@startlang/lang-core/interpreter';
import { parse } from '@startlang/lang-core/parser.peggy';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import { InputSuspension } from '@startlang/lang-core/suspension';
import { describe, expect, it } from 'vitest';

import {
  BrowserPresentationHost,
  browserPresentationGlobals,
} from '@startlang/lang-browser/browser';
import {
  GridCell,
  GridRowCell,
  StackCell,
  ValueCell,
} from '@startlang/lang-browser/cells';

const repoDir = path.resolve(import.meta.dirname, '../../..');
const examplesDir = path.join(repoDir, 'apps/web/tests');

interface ExampleResult {
  host: BrowserPresentationHost;
  interpreter: Interpreter;
}

async function runUntilComplete(
  interpreter: Interpreter,
  result: RunResult
): Promise<void> {
  while (result.status === 'suspended') {
    const { suspension } = result;

    if (suspension instanceof InputSuspension) {
      result = await interpreter.resume(suspension.initial);
      continue;
    }

    throw new Error(`unsupported suspension: ${suspension.kind}`);
  }
}

async function runExample(name: string): Promise<ExampleResult> {
  const source = await readFile(path.join(examplesDir, name), 'utf8');
  const host = new BrowserPresentationHost();
  const interpreter = new Interpreter(host);

  interpreter.registerGlobals(runtimeGlobals);
  interpreter.registerGlobals(browserPresentationGlobals);

  await runUntilComplete(interpreter, await interpreter.run(parse(source)));

  return { host, interpreter };
}

function getText(cell: unknown): string[] {
  if (cell instanceof ValueCell) {
    return [cell.value];
  }

  if (cell instanceof StackCell) {
    return cell.children.flatMap(getText);
  }

  if (cell instanceof GridCell) {
    return [...cell.headers, ...cell.rows].flatMap(getText);
  }

  if (cell instanceof GridRowCell) {
    return cell.children.flatMap(getText);
  }

  return [];
}

function getOutputText(host: BrowserPresentationHost) {
  return getText(host.outputBuffer);
}

async function playNumguessWithBinarySearch() {
  const source = await readFile(
    path.join(examplesDir, 'numguess.start'),
    'utf8'
  );
  const host = new BrowserPresentationHost();
  const interpreter = new Interpreter(host);
  const guesses: number[] = [];

  interpreter.registerGlobals(runtimeGlobals);
  interpreter.registerGlobals(browserPresentationGlobals);

  let lo = 1;
  let hi = 100;
  let lastGuess: number | null = null;
  let result = await interpreter.run(parse(source));

  while (result.status === 'suspended') {
    if (!(result.suspension instanceof InputSuspension)) {
      throw new Error(`unsupported suspension: ${result.suspension.kind}`);
    }

    if (lastGuess !== null) {
      const feedback = getOutputText(host).at(-1);
      if (feedback === 'Too low.') {
        lo = lastGuess + 1;
      } else if (feedback === 'Too high.') {
        hi = lastGuess - 1;
      } else {
        throw new Error(`unexpected numguess feedback: ${feedback}`);
      }
    }

    const guess = Math.floor((lo + hi) / 2);
    guesses.push(guess);
    lastGuess = guess;
    result = await interpreter.resume(String(guess));
  }

  return { guesses, host, interpreter };
}

describe('browser examples', () => {
  it.each([
    ['box.start', 73],
    ['sine.start', 74],
    ['victor.start', 50],
  ])('%s renders graphics output', async (name, shapeCount) => {
    const { host, interpreter } = await runExample(name);

    expect(interpreter.isSuspended).toBe(false);
    expect(host.shapes).toHaveLength(shapeCount);
  });

  it.each([
    ['invest.start', ['Years', '$100,000.00', "That's a total growth"]],
    ['layout.start', ['The Beatles', 'Pink Floyd', 'Members']],
    ['numguess.start', ['Your guesses:', 'Goodbye!']],
    ['sieve.start', ['2 is prime', '97 is prime']],
  ])('%s renders text output', async (name, expectedText) => {
    const { host, interpreter } = await runExample(name);
    const text = getOutputText(host).join('\n');

    expect(interpreter.isSuspended).toBe(false);
    for (const expected of expectedText) {
      expect(text).toContain(expected);
    }
  });

  it('can play numguess by splitting the difference', async () => {
    const { guesses, host, interpreter } = await playNumguessWithBinarySearch();
    const text = getOutputText(host).join('\n');

    expect(interpreter.isSuspended).toBe(false);
    expect(guesses.length).toBeLessThanOrEqual(10);
    expect(text).toContain('You guessed it!');
    expect(text).not.toContain('Sorry, out of guesses.');
  });
});
