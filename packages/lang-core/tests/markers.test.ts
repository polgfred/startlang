import { EditorModel } from '@startlang/lang-core/editor-model';
import { Interpreter } from '@startlang/lang-core/interpreter';
import { BlockNode, IfNode, RepeatNode } from '@startlang/lang-core/nodes';
import { parse } from '@startlang/lang-core/parser.peggy';
import { isBreakpointSuspension } from '@startlang/lang-core/suspension';
import type { MarkerType } from '@startlang/lang-core/types';
import { describe, expect, it } from 'vitest';

import { buildMarkerLineMap, mapMarkers } from '../src/editor-markers.js';

describe('marker maps', () => {
  it('keeps editor-owned markers behind a run-ready marker map', () => {
    const model = new EditorModel(`
      repeat 3 do

        print "inside"
      end
      `);

    expect(model.toggleMarker(3)).toBe(true);
    expect(model.getSnapshot().markers).toEqual([
      { lineNumber: 4, marker: 'breakpoint' },
    ]);

    const { markerMap, node } = model.parseProgram();
    const repeatNode = (node as BlockNode).elems[0] as RepeatNode;
    const insidePrintNode = (repeatNode.body as BlockNode).elems[0];

    expect(markerMap.get(insidePrintNode)).toBe('breakpoint');

    model.toggleMarker(4);
    expect(markerMap.get(insidePrintNode)).toBe('snapshot');

    model.toggleMarker(4);
    expect(markerMap.get(insidePrintNode)).toBeUndefined();
  });

  it('uses live editor-owned markers after resuming from a breakpoint', async () => {
    const model = new EditorModel(
      ['let x = 0', 'repeat 3 do', '  let x = x + 1', 'end', ''].join('\n')
    );
    const interpreter = new Interpreter();

    model.toggleMarker(3);
    const { markerMap, node } = model.parseProgram();
    interpreter.setMarkerMap(markerMap);

    const result = await interpreter.run(node);

    if (result.status !== 'suspended') {
      throw new Error(`expected suspension, got ${result.status}`);
    }
    expect(isBreakpointSuspension(result.suspension)).toBe(true);
    expect(interpreter.topFrame.head.node.location.start.line).toBe(3);

    model.toggleMarker(3);
    model.toggleMarker(3);

    const resumed = await interpreter.resume(undefined);

    expect(resumed.status).toBe('completed');
    expect(interpreter.getVariable('x')).toBe(3);
  });

  it('maps marked lines to the nearest matching AST node', () => {
    const source = `
      repeat 3 do
        if true then
          print "then"
        else
          print "else"
        end
      end
      `;
    const rootNode = parse(`${source}\n`);
    const repeatNode = (rootNode as BlockNode).elems[0] as RepeatNode;
    const ifNode = (repeatNode.body as BlockNode).elems[0] as IfNode;
    const thenPrintNode = (ifNode.thenBody as BlockNode).elems[0];
    const markers: MarkerType[] = [];

    markers[3] = 'snapshot';
    markers[4] = 'breakpoint';

    const markerMap = mapMarkers(rootNode, markers);

    expect(markerMap.get(ifNode)).toBe('snapshot');
    expect(markerMap.get(thenPrintNode)).toBe('breakpoint');
    expect(markerMap.get(repeatNode)).toBeUndefined();
  });

  it('resolves clicked lines to marker owner start lines', () => {
    const source = `
      repeat 3 do

        print "inside"
      end

      print "after"
      `;
    const rootNode = parse(`${source}\n`);
    const lineMap = buildMarkerLineMap(rootNode);

    expect(lineMap.resolve(2)?.lineNumber).toBe(2);
    expect(lineMap.resolve(3)?.lineNumber).toBe(4);
    expect(lineMap.resolve(5)?.lineNumber).toBe(2);
    expect(lineMap.resolve(6)?.lineNumber).toBe(7);
  });

  it('maps blank lines forward to the next child in the current block', () => {
    const source = `
      repeat 3 do

        print "inside"
      end

      print "after"
      `;
    const rootNode = parse(`${source}\n`);
    const repeatNode = (rootNode as BlockNode).elems[0] as RepeatNode;
    const insidePrintNode = (repeatNode.body as BlockNode).elems[0];
    const afterPrintNode = (rootNode as BlockNode).elems[1];
    const markers: MarkerType[] = [];

    markers[3] = 'breakpoint';
    markers[6] = 'snapshot';

    const markerMap = mapMarkers(rootNode, markers);

    expect(markerMap.get(insidePrintNode)).toBe('breakpoint');
    expect(markerMap.get(afterPrintNode)).toBe('snapshot');
    expect(markerMap.get(repeatNode)).toBeUndefined();
  });

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

    interpreter.setMarkerMap(mapMarkers(rootNode, []));

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
    interpreter.setMarkerMap(mapMarkers(rootNode, markers));

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
