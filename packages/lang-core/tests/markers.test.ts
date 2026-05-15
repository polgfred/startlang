import { EditorModel } from '@startlang/lang-core/editor-model';
import { Interpreter } from '@startlang/lang-core/interpreter';
import {
  BlockNode,
  CallExpressionNode,
  IfNode,
  LetNode,
  RepeatNode,
} from '@startlang/lang-core/nodes';
import { parse } from '@startlang/lang-core/parser.peggy';
import type { MarkerType } from '@startlang/lang-core/types';
import { describe, expect, it } from 'vitest';

import { buildMarkerLineMap, mapMarkers } from '../src/editor-markers.js';

describe('marker maps', () => {
  function expectPaused(result: Awaited<ReturnType<Interpreter['run']>>) {
    if (result.status !== 'paused') {
      throw new Error(`expected pause, got ${result.status}`);
    }
    return result.pause;
  }

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

    const { markerMap, program } = model.parseProgram();
    const repeatNode = program.main.elems[0] as RepeatNode;
    const insidePrintNode = (repeatNode.body as BlockNode).elems[0];

    expect(markerMap(insidePrintNode)).toBe('breakpoint');

    model.toggleMarker(4);
    expect(markerMap(insidePrintNode)).toBe('snapshot');

    model.toggleMarker(4);
    expect(markerMap(insidePrintNode)).toBeUndefined();
  });

  it('uses live editor-owned markers after resuming from a breakpoint', async () => {
    const model = new EditorModel(
      ['let x = 0', 'repeat 3 do', '  let x = x + 1', 'end', ''].join('\n')
    );
    const interpreter = new Interpreter();

    model.toggleMarker(3);
    const { markerMap, program } = model.parseProgram();
    interpreter.setMarkerMap(markerMap);

    const result = await interpreter.run(program);

    expect(expectPaused(result).kind).toBe('breakpoint');
    expect(interpreter.topFrame.head.node.location.start.line).toBe(3);

    model.toggleMarker(3);
    model.toggleMarker(3);

    const resumed = await interpreter.continue();

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
    const program = parse(`${source}\n`);
    const repeatNode = program.main.elems[0] as RepeatNode;
    const ifNode = (repeatNode.body as BlockNode).elems[0] as IfNode;
    const thenPrintNode = (ifNode.thenBody as BlockNode).elems[0];
    const markers: MarkerType[] = [];

    markers[3] = 'snapshot';
    markers[4] = 'breakpoint';

    const markerMap = mapMarkers(program, markers);

    expect(markerMap(ifNode)).toBe('snapshot');
    expect(markerMap(thenPrintNode)).toBe('breakpoint');
    expect(markerMap(repeatNode)).toBeUndefined();
  });

  it('assigns source locations to each branch in an if chain', () => {
    const source = `
      if false then
        print "then"
      else if false then
        print "else-if"
      else
        print "else"
      end
      `;
    const program = parse(`${source}\n`);
    const ifNode = program.main.elems[0] as IfNode;
    const thenPrintNode = (ifNode.thenBody as BlockNode).elems[0];
    const elseIfNode = ifNode.elseBody as IfNode;
    const elseIfPrintNode = (elseIfNode.thenBody as BlockNode).elems[0];
    const elseNode = elseIfNode.elseBody as BlockNode;
    const elsePrintNode = elseNode.elems[0];

    expect(ifNode.location.start.line).toBe(2);
    expect(thenPrintNode.location.start.line).toBe(3);
    expect(elseIfNode.location.start.line).toBe(4);
    expect(elseIfPrintNode.location.start.line).toBe(5);
    expect(elseNode.location.start.line).toBe(7);
    expect(elsePrintNode.location.start.line).toBe(7);
  });

  it('resolves clicked lines to marker owner start lines', () => {
    const source = `
      repeat 3 do

        print "inside"
      end

      print "after"
      `;
    const program = parse(`${source}\n`);
    const lineMap = buildMarkerLineMap(program);

    expect(lineMap.resolve(2)?.lineNumber).toBe(2);
    expect(lineMap.resolve(3)?.lineNumber).toBe(4);
    expect(lineMap.resolve(5)?.lineNumber).toBe(2);
    expect(lineMap.resolve(6)?.lineNumber).toBe(7);
  });

  it('maps marker lines inside a top-level function body to the body statements', () => {
    const source = `
      print "before"

      begin foo do
        print "in foo"
      end

      print "after"
      `;
    const program = parse(`${source}\n`);
    const beforePrintNode = program.main.elems[0];
    const afterPrintNode = program.main.elems[1];
    const insidePrintNode = (program.functions.foo.body as BlockNode).elems[0];
    const markers: MarkerType[] = [];

    // line 5 is the `print "in foo"` line inside the function body
    markers[5] = 'breakpoint';

    const markerMap = mapMarkers(program, markers);

    expect(markerMap(insidePrintNode)).toBe('breakpoint');
    expect(markerMap(beforePrintNode)).toBeUndefined();
    expect(markerMap(afterPrintNode)).toBeUndefined();
  });

  it('maps blank lines forward to the next child in the current block', () => {
    const source = `
      repeat 3 do

        print "inside"
      end

      print "after"
      `;
    const program = parse(`${source}\n`);
    const repeatNode = program.main.elems[0] as RepeatNode;
    const insidePrintNode = (repeatNode.body as BlockNode).elems[0];
    const afterPrintNode = program.main.elems[1];
    const markers: MarkerType[] = [];

    markers[3] = 'breakpoint';
    markers[6] = 'snapshot';

    const markerMap = mapMarkers(program, markers);

    expect(markerMap(insidePrintNode)).toBe('breakpoint');
    expect(markerMap(afterPrintNode)).toBe('snapshot');
    expect(markerMap(repeatNode)).toBeUndefined();
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
    const program = parse(`${source}\n`);
    const interpreter = new Interpreter();
    const startedAt = performance.now();

    interpreter.setMarkerMap(mapMarkers(program, []));

    expect(performance.now() - startedAt).toBeLessThan(100);
  });

  it('marks block-level nodes as statements without marking expression nodes', () => {
    const program = parse(['value = abs(-1)', 'print value', ''].join('\n'));
    const [letNode, printNode] = program.main.elems;
    const callExpression = (letNode as LetNode).value;

    expect(letNode.isStatement).toBe(true);
    expect(printNode.isStatement).toBe(true);
    expect(callExpression).toBeInstanceOf(CallExpressionNode);
    expect(callExpression.isStatement).toBe(false);
  });

  it('steps from a breakpoint to the next statement without stopping in expressions', async () => {
    const source = [
      'value = 1',
      'value = (1 + 2) * 3',
      'value = value + 1',
      '',
    ].join('\n');
    const markers: MarkerType[] = [];
    const program = parse(source);
    const interpreter = new Interpreter();

    markers[1] = 'breakpoint';
    interpreter.setMarkerMap(mapMarkers(program, markers));

    let result = await interpreter.run(program);

    expect(expectPaused(result).kind).toBe('breakpoint');
    expect(interpreter.topFrame.head.node.location.start.line).toBe(1);

    result = await interpreter.stepToNextStatement();

    expect(expectPaused(result).kind).toBe('step');
    expect(interpreter.topFrame.head.node.location.start.line).toBe(2);
    expect(interpreter.topFrame.head.node.isStatement).toBe(true);
    expect(interpreter.getVariable('value')).toBe(1);

    result = await interpreter.stepToNextStatement();

    expect(expectPaused(result).kind).toBe('step');
    expect(interpreter.topFrame.head.node.location.start.line).toBe(3);
    expect(interpreter.topFrame.head.node.isStatement).toBe(true);
    expect(interpreter.getVariable('value')).toBe(9);

    result = await interpreter.stepToNextStatement();

    expect(result.status).toBe('completed');
    expect(interpreter.getVariable('value')).toBe(10);
  });

  it('starts a program by stepping to its first statement', async () => {
    const source = ['value = abs(-1)', 'value = value + 1', ''].join('\n');
    const program = parse(source);
    const interpreter = new Interpreter();

    const result = await interpreter.runToNextStatement(program);

    expect(expectPaused(result).kind).toBe('step');
    expect(interpreter.topFrame.head.node.location.start.line).toBe(1);
    expect(interpreter.topFrame.head.node.isStatement).toBe(true);
    expect(interpreter.getVariable('value')).toBeUndefined();
  });

  it('steps from a false if condition to its else-if statement', async () => {
    const source = [
      'value = 0',
      'if false then',
      '  value = 1',
      'else if true then',
      '  value = 2',
      'end',
      '',
    ].join('\n');
    const markers: MarkerType[] = [];
    const program = parse(source);
    const interpreter = new Interpreter();

    markers[2] = 'breakpoint';
    interpreter.setMarkerMap(mapMarkers(program, markers));

    let result = await interpreter.run(program);

    expect(expectPaused(result).kind).toBe('breakpoint');
    expect(interpreter.topFrame.head.node.location.start.line).toBe(2);

    result = await interpreter.stepToNextStatement();

    expect(expectPaused(result).kind).toBe('step');
    expect(interpreter.topFrame.head.node.location.start.line).toBe(4);

    result = await interpreter.stepToNextStatement();

    expect(expectPaused(result).kind).toBe('step');
    expect(interpreter.topFrame.head.node.location.start.line).toBe(5);
  });

  it('reads marker values from the live marker array', async () => {
    const source = `
      let x = 0
      repeat 3 do
        let x = x + 1
      end
      `;
    const markers: MarkerType[] = [];
    const program = parse(`${source}\n`);
    const interpreter = new Interpreter();

    markers[2] = 'breakpoint';
    interpreter.setMarkerMap(mapMarkers(program, markers));

    let result = await interpreter.run(program);

    expect(expectPaused(result).kind).toBe('breakpoint');
    expect(interpreter.topFrame.head.node.location.start.line).toBe(2);

    delete markers[2];
    markers[3] = 'breakpoint';

    result = await interpreter.continue();

    expect(expectPaused(result).kind).toBe('breakpoint');
    expect(interpreter.topFrame.head.node.location.start.line).toBe(3);
    expect(interpreter.getVariable('x')).toBe(0);

    delete markers[3];

    result = await interpreter.continue();

    expect(result.status).toBe('completed');
    expect(interpreter.getVariable('x')).toBe(3);
  });
});
