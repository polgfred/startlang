import { Interpreter } from '@startlang/lang-core/interpreter';
import type { CallFrame } from '@startlang/lang-core/nodes';
import { parse } from '@startlang/lang-core/parser.peggy';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import {
  BreakpointSuspension,
  InputSuspension,
} from '@startlang/lang-core/suspension';
import type { RuntimeFunctions } from '@startlang/lang-core/types';
import type { MarkerType } from '@startlang/lang-core/types';
import { describe, expect, it, vi } from 'vitest';

async function runSnippet(source: string, globals: RuntimeFunctions = {}) {
  const interpreter = new Interpreter();
  interpreter.registerGlobals(runtimeGlobals);
  interpreter.registerGlobals(globals);

  const result = await interpreter.run(parse(`${source}\n`));

  if (result.status !== 'completed') {
    throw new Error(`unexpected suspension: ${result.suspension.kind}`);
  }

  return interpreter;
}

function parseSnippet(source: string) {
  return parse(`${source}\n`);
}

describe('core language snippets', () => {
  it('evaluates literals, operators, precedence, and interpolation', async () => {
    const calls: unknown[][] = [];

    await runSnippet(
      `
      spy none, true, false, infinity
      spy 1 + 2 * 3 ^ 4
      spy (((1 + 2) * 3) ^ 4)
      spy -2 ^ 2, (-2) ^ 2, +5
      spy 5 % 2, 5 / 2
      spy 1 + 2 > 5 or 3 + 4 < 10
      spy not false and true
      spy "sum={1 + 2}, truth={true}, escaped={{}}"
      `,
      {
        spy(_interpreter, args) {
          calls.push(args);
        },
      }
    );

    expect(calls).toEqual([
      [null, true, false, Infinity],
      [163],
      [6561],
      [4, 4, 5],
      [1, 2.5],
      [true],
      [true],
      ['sum=3, truth=*true*, escaped={}'],
    ]);
  });

  it('short-circuits logical operators', async () => {
    const boom = vi.fn(() => {
      throw new Error('should not run');
    });
    const calls: unknown[][] = [];

    await runSnippet(
      `
      spy false and boom()
      spy true or boom()
      `,
      {
        boom,
        spy(_interpreter, args) {
          calls.push(args);
        },
      }
    );

    expect(boom).not.toHaveBeenCalled();
    expect(calls).toEqual([[false], [true]]);
  });

  it('assigns variables globally and inside loops', async () => {
    const interpreter = await runSnippet(`
      let total = 0
      total = total + 1
      repeat 3 do
        total = total + 2
      end
    `);

    expect(interpreter.getVariable('total')).toBe(7);
  });

  it('builds and indexes lists, records, and strings', async () => {
    const calls: unknown[][] = [];

    await runSnippet(
      `
      letters = ["a", "b", "c"]
      person = { name = "Lily", stats = { age = 17 } }
      bones = "Bones"
      letters[2] = "B"
      person.stats.age = person.stats.age + 1
      spy letters, letters.2, letters[-1]
      spy person.name, person.stats.age, bones[1], bones[-1]
      `,
      {
        spy(_interpreter, args) {
          calls.push(args);
        },
      }
    );

    expect(calls).toEqual([
      [['a', 'B', 'c'], 'B', 'c'],
      ['Lily', 18, 'B', 's'],
    ]);
  });

  it('dispatches data methods from the first argument type', async () => {
    const calls: unknown[][] = [];

    await runSnippet(
      `
      list = [1, 2, 3, 4]
      record = { b = 2, a = 1 }
      text = "a,b,c"
      spy len(list), range(list, 2, 3), join(list, "-")
      spy len(record), keys(record)
      spy len(text), range(text, 2, 3), split(text, ",")
      `,
      {
        spy(_interpreter, args) {
          calls.push(args);
        },
      }
    );

    expect(calls).toEqual([
      [4, [2, 3], '1-2-3-4'],
      [2, ['b', 'a']],
      [5, ',b', ['a', 'b', 'c']],
    ]);
  });

  it('dispatches numeric runtime methods', async () => {
    const calls: unknown[][] = [];

    await runSnippet(
      `
      spy abs(-5), cbrt(27), log(100, 10)
      spy bitand(6, 3), bitor(4, 1), bitxor(6, 3), bitnot(0)
      spy sqrt(64), round(1.6), sin(30), cos(60), num("42")
      `,
      {
        spy(_interpreter, args) {
          calls.push(args);
        },
      }
    );

    expect(calls.slice(0, 2)).toEqual([
      [5, 3, 2],
      [2, 5, 5, -1],
    ]);
    expect(calls[2][0]).toBe(8);
    expect(calls[2][1]).toBe(2);
    expect(calls[2][2]).toBeCloseTo(0.5);
    expect(calls[2][3]).toBeCloseTo(0.5);
    expect(calls[2][4]).toBe(42);
  });

  it('dispatches random number runtime functions', async () => {
    const calls: unknown[][] = [];

    await runSnippet(
      `
      spy rand(), rand(1, 3)
      `,
      {
        spy(_interpreter, args) {
          calls.push(args);
        },
      }
    );

    expect(typeof calls[0][0]).toBe('number');
    expect(calls[0][0]).toBeGreaterThanOrEqual(0);
    expect(calls[0][0]).toBeLessThan(1);
    expect(typeof calls[0][1]).toBe('number');
    expect(calls[0][1]).toBeGreaterThanOrEqual(1);
    expect(calls[0][1]).toBeLessThanOrEqual(3);
    expect(Number.isInteger(calls[0][1])).toBe(true);
  });

  it('concatenates and compares strings, lists, and records', async () => {
    const calls: unknown[][] = [];

    await runSnippet(
      `
      spy "a" :: "b", "a" < "b"
      spy [1] :: [2, 3], [1, { a = true }] = [1, { a = true }]
      spy [1] != [2]
      spy { a = 1 } :: { b = 2, a = 3 }
      spy { a = [1] } = { a = [1] }, { a = 1 } != { a = 2 }
      `,
      {
        spy(_interpreter, args) {
          calls.push(args);
        },
      }
    );

    expect(calls).toEqual([
      ['ab', true],
      [[1, 2, 3], true],
      [true],
      [{ a: 3, b: 2 }],
      [true, true],
    ]);
  });

  it('reports handler errors through snippet execution', async () => {
    await expect(runSnippet('bad = 1 + "1"')).rejects.toThrow(
      'operands must be of the same type'
    );
    await expect(runSnippet('bad = "a" + "b"')).rejects.toThrow(
      'binary operator + not supported'
    );
    await expect(runSnippet('bad = num("nope")')).rejects.toThrow(
      'cannot convert nope to number'
    );
    await expect(runSnippet('bad = format(1, "bogus")')).rejects.toThrow(
      'invalid format: bogus'
    );
  });

  it('runs if, else-if, and else branches', async () => {
    const calls: unknown[][] = [];

    await runSnippet(
      `
      value = 5
      if value < 5 then
        spy "low"
      else if value > 5 then
        spy "high"
      else
        spy "same"
      end

      if false then spy "no" else spy "yes"
      `,
      {
        spy(_interpreter, args) {
          calls.push(args);
        },
      }
    );

    expect(calls).toEqual([['same'], ['yes']]);
  });

  it('runs repeat, while, numeric for, and for-in loops', async () => {
    const calls: unknown[][] = [];

    const interpreter = await runSnippet(
      `
      total = 0
      repeat 2 do total = total + 1

      while total < 5 do
        total = total + 2
      end

      for i = 5 to 1 by -2 do
        spy "for", i
      end

      for item in ["x", "y"] do
        spy "list", item
      end

      for key in { a = 1, b = 2 } do
        spy "record", key
      end
      `,
      {
        spy(_interpreter, args) {
          calls.push(args);
        },
      }
    );

    expect(interpreter.getVariable('total')).toBe(6);
    expect(calls).toEqual([
      ['for', 5],
      ['for', 3],
      ['for', 1],
      ['list', 'x'],
      ['list', 'y'],
      ['record', 'a'],
      ['record', 'b'],
    ]);
  });

  it('handles break, next, and exit flow', async () => {
    const calls: unknown[][] = [];

    await runSnippet(
      `
      for i = 1 to 5 do
        if i = 2 then next
        if i = 4 then break
        spy i
      end

      spy "before exit"
      exit
      spy "after exit"
      `,
      {
        spy(_interpreter, args) {
          calls.push(args);
        },
      }
    );

    expect(calls).toEqual([[1], [3], ['before exit']]);
  });

  it('defines functions with parameters, returns, nested calls, and local scope', async () => {
    const calls: unknown[][] = [];

    const interpreter = await runSnippet(
      `
      x = 10

      begin add(a, b) do
        x = 99
        return a + b
      end

      begin twice(n) do
        return add(n, n)
      end

      begin noReturn() do
        local = 123
      end

      spy add(2, 3), twice(4)
      noReturn
      `,
      {
        spy(_interpreter, args) {
          calls.push(args);
        },
      }
    );

    expect(calls).toEqual([[5, 8]]);
    expect(interpreter.getVariable('x')).toBe(10);
    expect(interpreter.getVariable('local')).toBeUndefined();
  });

  it('runs user functions as commands and ignores their return for call flow', async () => {
    const calls: unknown[][] = [];

    await runSnippet(
      `
      begin greet(name) do
        spy "hello", name
        return 123
      end

      greet "Ada"
      spy "done"
      `,
      {
        spy(_interpreter, args) {
          calls.push(args);
        },
      }
    );

    expect(calls).toEqual([['hello', 'Ada'], ['done']]);
  });

  it('passes do-bodies to runtime command frames', async () => {
    const calls: unknown[][] = [];

    await runSnippet(
      `
      wrap do
        spy "inside"
      end
      `,
      {
        spy(_interpreter, args) {
          calls.push(args);
        },
        wrap(_interpreter, _args, node) {
          if (!node.body) {
            throw new Error('missing body');
          }
          return node.body.makeFrame() as CallFrame;
        },
      }
    );

    expect(calls).toEqual([['inside']]);
  });

  it('routes set statements to the presentation host', async () => {
    const settings: unknown[][] = [];
    const host = {
      takeSnapshot() {
        return {};
      },
      restoreSnapshot() {},
      setConfiguration(name: string, value: unknown) {
        settings.push([name, value]);
      },
    };
    const interpreter = new Interpreter(host);

    const result = await interpreter.run(
      parseSnippet(`
      set stroke.color = "red"
      set opacity = 1 / 4
      `)
    );

    expect(result.status).toBe('completed');
    expect(settings).toEqual([
      ['stroke.color', 'red'],
      ['opacity', 0.25],
    ]);
  });
});

describe('core language suspensions and snapshots', () => {
  it('suspends for input and resumes into the awaiting expression', async () => {
    const interpreter = new Interpreter();
    interpreter.registerGlobals(runtimeGlobals);

    const result = await interpreter.run(
      parseSnippet(`
      name = input("Name?", "Ada")
      greeting = "Hello, {name}"
      `)
    );

    expect(result.status).toBe('suspended');
    if (result.status !== 'suspended') {
      throw new Error('expected suspension');
    }
    const suspension = result.suspension;
    expect(suspension).toBeInstanceOf(InputSuspension);
    if (!(suspension instanceof InputSuspension)) {
      throw new Error('expected input suspension');
    }
    expect(suspension.prompt).toBe('Name?');
    expect(suspension.initial).toBe('Ada');

    const resumed = await interpreter.resumeSuspension('Grace');

    expect(resumed.status).toBe('completed');
    expect(interpreter.getVariable('name')).toBe('Grace');
    expect(interpreter.getVariable('greeting')).toBe('Hello, Grace');
  });

  it('takes explicit snapshots and restores interpreter and host state', async () => {
    const restored: unknown[] = [];
    const interpreter = new Interpreter({
      takeSnapshot() {
        return { saved: true };
      },
      restoreSnapshot(snapshot: unknown) {
        restored.push(snapshot);
      },
    });

    const result = await interpreter.run(
      parseSnippet(`
      value = 1
      snapshot
      value = 2
      `)
    );

    expect(result.status).toBe('completed');
    expect(interpreter.getVariable('value')).toBe(2);
    expect(interpreter.history).toHaveLength(1);

    interpreter.moveToSnapshot(0);

    expect(interpreter.getVariable('value')).toBe(1);
    expect(restored).toEqual([{ saved: true }]);
  });

  it('takes marker snapshots and breakpoint suspensions at node entry', async () => {
    const markers: MarkerType[] = [];
    const source = [
      'value = 0',
      'value = value + 1',
      'value = value + 1',
      '',
    ].join('\n');
    const rootNode = parse(source);
    const interpreter = new Interpreter();

    markers[2] = 'snapshot';
    markers[3] = 'breakpoint';
    interpreter.setMarkers(rootNode, markers);

    const result = await interpreter.run(rootNode);

    expect(result.status).toBe('suspended');
    if (result.status !== 'suspended') {
      throw new Error('expected suspension');
    }
    expect(result.suspension).toBeInstanceOf(BreakpointSuspension);
    expect(interpreter.history).toHaveLength(2);
    expect(interpreter.getVariable('value')).toBe(1);

    const resumed = await interpreter.resumeSuspension(undefined);

    expect(resumed.status).toBe('completed');
    expect(interpreter.getVariable('value')).toBe(2);
  });
});
