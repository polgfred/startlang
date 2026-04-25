import { Interpreter } from '@startlang/lang-core/interpreter';
import { describe, expect, it } from 'vitest';

describe('data handlers', () => {
  it('selects handlers and formats values for presentation', () => {
    const interpreter = new Interpreter();

    expect(interpreter.getHandler(null).getPrettyValue(null)).toBe('*none*');
    expect(interpreter.getHandler(true).getPrettyValue(true)).toBe('*true*');
    expect(interpreter.getHandler(false).getPrettyValue(false)).toBe('*false*');
    expect(interpreter.getHandler(42).getPrettyValue(42)).toBe('42');
    expect(interpreter.getHandler(Infinity).getPrettyValue(Infinity)).toBe(
      '*infinity*'
    );
    expect(interpreter.getHandler(-Infinity).getPrettyValue(-Infinity)).toBe(
      '-*infinity*'
    );
    expect(interpreter.getHandler('hello').getPrettyValue('hello')).toBe(
      'hello'
    );
    expect(
      interpreter.getHandler([1, true, null]).getPrettyValue([1, true, null])
    ).toBe('[1, *true*, *none*]');
    expect(
      interpreter.getHandler({ name: 'Ada', ok: true }).getPrettyValue({
        name: 'Ada',
        ok: true,
      })
    ).toBe('{name=Ada, ok=*true*}');
  });

  it('rejects unsupported JS values and unsupported handler operations', () => {
    const interpreter = new Interpreter();

    expect(() => interpreter.getHandler(() => null)).toThrow(
      'could not determine type'
    );
    expect(() => interpreter.evalUnaryOp('-', true)).toThrow(
      'unary operator - not supported'
    );
    expect(() => interpreter.getHandler('abc').getIterable('abc')).toThrow(
      'not supported'
    );
  });

  it('gets and sets indexes through type handlers', () => {
    const interpreter = new Interpreter();

    interpreter.setVariable('list', [10, 20, [30, 40]]);
    interpreter.setVariable('record', { user: { name: 'Ada' } });

    expect(interpreter.getVariableIndex('list', [1])).toBe(10);
    expect(interpreter.getVariableIndex('list', [-1, 2])).toBe(40);
    expect(interpreter.getVariableIndex('record', ['user', 'name'])).toBe(
      'Ada'
    );
    expect(interpreter.getHandler('abcd').getIndex('abcd', -1)).toBe('d');

    interpreter.setVariableIndex('list', [3, 1], 35);
    interpreter.setVariableIndex('record', ['user', 'name'], 'Grace');

    expect(interpreter.getVariable('list')).toEqual([10, 20, [35, 40]]);
    expect(interpreter.getVariable('record')).toEqual({
      user: { name: 'Grace' },
    });
  });

  it('exposes list and record iteration values', () => {
    const interpreter = new Interpreter();

    expect(interpreter.getHandler(['a', 'b']).getIterable(['a', 'b'])).toEqual([
      'a',
      'b',
    ]);
    expect(
      interpreter.getHandler({ b: 2, a: 1 }).getIterable({ b: 2, a: 1 })
    ).toEqual(['b', 'a']);
  });

  it('reports missing runtime functions', () => {
    const interpreter = new Interpreter();

    expect(() => interpreter.getRuntimeFunction('missing', [])).toThrow(
      'function missing not found'
    );
  });
});
