import { Interpreter } from '@startlang/lang-core/interpreter';
import { parse } from '@startlang/lang-core/parser.peggy';
import { BreakpointSuspension } from '@startlang/lang-core/suspension';
import type { MarkerType } from '@startlang/lang-core/types';
import { describe, expect, it } from 'vitest';

describe('marker maps', () => {
  it('reads marker values from the live marker array', async () => {
    const source = [
      'let x = 0',
      'repeat 3 do',
      '  let x = x + 1',
      'end',
      '',
    ].join('\n');
    const markers: MarkerType[] = [];
    const rootNode = parse(source);
    const interpreter = new Interpreter();

    markers[2] = 'breakpoint';
    interpreter.setMarkers(rootNode, markers);

    let result = await interpreter.run(rootNode);

    if (result.status !== 'suspended') {
      throw new Error(`expected suspension, got ${result.status}`);
    }
    expect(result.suspension).toBeInstanceOf(BreakpointSuspension);
    expect(interpreter.topFrame.head.node.location.start.line).toBe(2);

    delete markers[2];
    markers[3] = 'breakpoint';

    result = await interpreter.resumeSuspension(undefined);

    if (result.status !== 'suspended') {
      throw new Error(`expected suspension, got ${result.status}`);
    }
    expect(result.suspension).toBeInstanceOf(BreakpointSuspension);
    expect(interpreter.topFrame.head.node.location.start.line).toBe(3);
    expect(interpreter.getVariable('x')).toBe(0);

    delete markers[3];

    result = await interpreter.resumeSuspension(undefined);

    expect(result.status).toBe('completed');
    expect(interpreter.getVariable('x')).toBe(3);
  });
});
