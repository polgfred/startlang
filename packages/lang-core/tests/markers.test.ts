import { Interpreter } from '@startlang/lang-core/interpreter';
import { parse } from '@startlang/lang-core/parser.peggy';
import { isBreakpointSuspension } from '@startlang/lang-core/suspension';
import type { MarkerType } from '@startlang/lang-core/types';
import { describe, expect, it } from 'vitest';

describe('marker maps', () => {
  it('maps deeply nested block lines without repeated subtree walks', () => {
    const source = `
      begin render_sieve do
        table do
          for row_start = 1 to upper by columns do
            row do
              for n = row_start to row_start + columns - 1 do
                if n <= upper then
                  bg = none
                  weight = none
                  if n < 2 then
                    bg = "whitesmoke"
                  else if n = current then
                    bg = "gold"
                    weight = "bold"
                  else if composite[n] then
                    bg = "lightgrey"
                  else
                    bg = "palegreen"
                    weight = "bold"
                  end
                  cell n
                end
              end
            end
          end
        end
      end
      `;
    const rootNode = parse(`${source}\n`);
    const interpreter = new Interpreter();
    const startedAt = performance.now();

    interpreter.setMarkers(rootNode, []);

    expect(performance.now() - startedAt).toBeLessThan(100);
  });

  it('reads marker values from the live marker array', async () => {
    const source = `
      let x = 0
      repeat 3 do
        let x = x + 1
      end
      `;
    const markers: MarkerType[] = [];
    const rootNode = parse(`${source}\n`);
    const interpreter = new Interpreter();

    markers[2] = 'breakpoint';
    interpreter.setMarkers(rootNode, markers);

    let result = await interpreter.run(rootNode);

    if (result.status !== 'suspended') {
      throw new Error(`expected suspension, got ${result.status}`);
    }
    expect(isBreakpointSuspension(result.suspension)).toBe(true);
    expect(interpreter.topFrame.head.node.location.start.line).toBe(2);

    delete markers[2];
    markers[3] = 'breakpoint';

    result = await interpreter.resume(undefined);

    if (result.status !== 'suspended') {
      throw new Error(`expected suspension, got ${result.status}`);
    }
    expect(isBreakpointSuspension(result.suspension)).toBe(true);
    expect(interpreter.topFrame.head.node.location.start.line).toBe(3);
    expect(interpreter.getVariable('x')).toBe(0);

    delete markers[3];

    result = await interpreter.resume(undefined);

    expect(result.status).toBe('completed');
    expect(interpreter.getVariable('x')).toBe(3);
  });
});
