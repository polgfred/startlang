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
  GridSlotCell,
  StackCell,
  ValueCell,
} from '@startlang/lang-browser/cells';
import {
  Circle,
  ShapeGroup,
} from '@startlang/lang-browser/shapes';

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
  return runSource(source);
}

async function runSource(source: string): Promise<ExampleResult> {
  const host = new BrowserPresentationHost();
  const interpreter = new Interpreter(host);

  interpreter.registerGlobals(runtimeGlobals);
  interpreter.registerGlobals(browserPresentationGlobals);

  await runUntilComplete(interpreter, await interpreter.run(parse(`${source}\n`)));

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

  if (cell instanceof GridSlotCell) {
    return cell.children.flatMap(getText);
  }

  return [];
}

function getOutputText(host: BrowserPresentationHost) {
  return host.outputCells.flatMap(getText);
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
  it('outputs top-level prints as standalone cells', async () => {
    const { host } = await runSource(`
      print "A"
      print "B"
    `);

    expect(host.outputCells).toHaveLength(2);
    expect(host.outputCells[0]).toBeInstanceOf(ValueCell);
    expect(host.outputCells[1]).toBeInstanceOf(ValueCell);
    expect(getOutputText(host)).toEqual(['A', 'B']);
  });

  it('configures cells with record arguments instead of current-container mutation', async () => {
    const { host } = await runSource(`
      stack { stack.direction = "row" } do
        print { value.variant = "h3" }, "A"
        print "B"
      end
    `);

    expect(host.outputCells).toHaveLength(1);
    expect(host.outputCells[0]).toBeInstanceOf(StackCell);
    expect((host.outputCells[0] as StackCell).stackProps.direction).toBe('row');
    expect(((host.outputCells[0] as StackCell).children[0] as ValueCell).variant).toBe('h3');
    expect(getOutputText(host)).toEqual(['A', 'B']);
  });

  it('uses table cells as explicit row slots', async () => {
    const { host } = await runSource(`
      table do
        row do
          cell { align = "right", span = 2, width = 80 }, "A"
          cell do
            stack do
              print "B"
              print "C"
            end
          end
        end
      end
    `);

    const table = host.outputCells[0] as GridCell;
    const row = table.rows[0];
    const first = row.children[0];
    const second = row.children[1];

    expect(first).toBeInstanceOf(GridSlotCell);
    expect(first.slotProps.align).toBe('right');
    expect(first.slotProps.span).toBe(2);
    expect(first.slotProps.width).toBe(80);
    expect(getText(first)).toEqual(['A']);
    expect(getText(second)).toEqual(['B', 'C']);
  });

  it('rejects non-cell children inside table rows', async () => {
    await expect(
      runSource(`
        table do
          row do
            print "oops"
          end
        end
      `)
    ).rejects.toThrow('table rows can only contain cells');
  });

  it('renders nested graphics groups with scoped drawing defaults', async () => {
    const { host } = await runSource(`
      set shape.fill.color = "red"

      group { shape.rotate = 45 } do
        circle 0, 0, 1

        group do
          set fill.color = "blue"
          circle 0, 0, 2
        end

        set rotate = 90
        circle 0, 0, 3
      end

      circle 0, 0, 4
    `);

    expect(host.shapes).toHaveLength(2);
    expect(host.shapes[0]).toBeInstanceOf(ShapeGroup);
    expect(host.shapes[1]).toBeInstanceOf(Circle);

    const group = host.shapes[0] as ShapeGroup;
    expect(group.shapeProps.rotate).toBe(45);
    expect(group.children).toHaveLength(3);

    const first = group.children[0] as Circle;
    const nested = group.children[1] as ShapeGroup;
    const third = group.children[2] as Circle;
    const topLevel = host.shapes[1] as Circle;

    expect(first.shapeProps['fill.color']).toBe('red');
    expect(nested.children[0].shapeProps['fill.color']).toBe('blue');
    expect(third.shapeProps['fill.color']).toBe('red');
    expect(third.shapeProps.rotate).toBe(90);
    expect(topLevel.shapeProps['fill.color']).toBe('red');
    expect(topLevel.shapeProps.rotate).toBe(0);
  });

  it('resolves text props with contextual and fully-qualified names', async () => {
    const { host } = await runSource(`
      set text.font.size = 12
      text { font.size = 24, shape.fill.color = "green" }, 0, 0, "Hello"
    `);

    expect(host.shapes).toHaveLength(1);
    expect(host.shapes[0]).toHaveProperty('textProps');

    const text = host.shapes[0] as unknown as {
      shapeProps: { ['fill.color']: string | null };
      textProps: { ['font.size']: number };
    };
    expect(text.shapeProps['fill.color']).toBe('green');
    expect(text.textProps['font.size']).toBe(24);
  });

  it('rejects fully-qualified props outside the current context', async () => {
    await expect(
      runSource(`
        rect { text.font.size = 24 }, 0, 0, 10, 10
      `)
    ).rejects.toThrow('unknown property "text.font.size"');
  });

  it('rejects graphics inside cell containers', async () => {
    await expect(
      runSource(`
        stack do
          rect 0, 0, 10, 10
        end
      `)
    ).rejects.toThrow('cannot create graphics inside a cell container');
  });

  it('rejects cells inside graphics groups', async () => {
    await expect(
      runSource(`
        group do
          print "nope"
        end
      `)
    ).rejects.toThrow('cannot create cells inside a graphics group');
  });

  it('renders an immutable preview of the in-progress cell path', () => {
    const host = new BrowserPresentationHost();

    host.addCell(new ValueCell('complete'));
    host.pushCell(new StackCell());
    host.addCell(new ValueCell('partial stack child'));
    host.pushCell(new GridCell());
    host.pushCell(new GridRowCell());
    host.addCell(new GridSlotCell().addChild(new ValueCell('partial row child')));

    expect(getOutputText(host)).toEqual(['complete']);
    expect(host.getInProgressOutputCells().flatMap(getText)).toEqual([
      'complete',
      'partial stack child',
      'partial row child',
    ]);
  });

  it('renders an immutable preview of the in-progress shape group path', () => {
    const host = new BrowserPresentationHost();

    host.pushShape(new Circle(0, 0, 1, host.getShapeProps()));
    host.beginShapeGroup(new ShapeGroup(host.getShapeProps({ rotate: 45 })));
    host.pushShape(new Circle(0, 0, 2, host.getShapeProps()));
    host.beginShapeGroup(new ShapeGroup(host.getShapeProps({ 'scale.x': 2 })));
    host.pushShape(new Circle(0, 0, 3, host.getShapeProps()));

    expect(host.shapes).toHaveLength(1);

    const shapes = host.getInProgressShapes();
    expect(shapes).toHaveLength(2);
    expect(shapes[0]).toBeInstanceOf(Circle);
    expect(shapes[1]).toBeInstanceOf(ShapeGroup);

    const group = shapes[1] as ShapeGroup;
    expect(group.shapeProps.rotate).toBe(45);
    expect(group.children).toHaveLength(2);
    expect(group.children[0]).toBeInstanceOf(Circle);
    expect(group.children[1]).toBeInstanceOf(ShapeGroup);

    const nested = group.children[1] as ShapeGroup;
    expect(nested.shapeProps['scale.x']).toBe(2);
    expect(nested.children).toHaveLength(1);
  });

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
