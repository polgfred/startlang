import { Interpreter, type RunResult } from '@startlang/lang-core/interpreter';
import { parse } from '@startlang/lang-core/parser.peggy';
import { RuntimeHistory } from '@startlang/lang-core/runtime-history';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import {
  InputSuspension,
  isBreakpointSuspension,
} from '@startlang/lang-core/suspension';
import type { RuntimeSuspension } from '@startlang/lang-core/suspension';
import type { MarkerType } from '@startlang/lang-core/types';
import { describe, expect, it } from 'vitest';

import { mapMarkers } from '../src/editor-markers.js';

function parseSnippet(source: string) {
  return parse(`${source}\n`);
}

function recordSnapshots(interpreter: Interpreter, history: RuntimeHistory) {
  interpreter.effectHandler = (effect) => {
    if (effect.kind === 'snapshot') {
      history.push(interpreter.captureState());
    }
  };
}

function expectSuspended(result: RunResult): RuntimeSuspension {
  expect(result.status).toBe('suspended');
  if (result.status !== 'suspended') {
    throw new Error('expected suspension');
  }
  return result.suspension;
}

function expectInputSuspension(suspension: RuntimeSuspension): InputSuspension {
  expect(suspension).toBeInstanceOf(InputSuspension);
  if (!(suspension instanceof InputSuspension)) {
    throw new Error('expected input suspension');
  }
  return suspension;
}

describe('interpreter lifecycle', () => {
  it('suspends for input and resumes into the awaiting expression', async () => {
    const interpreter = new Interpreter();
    interpreter.registerGlobals(runtimeGlobals);

    const result = await interpreter.run(
      parseSnippet(`
      name = input("Name?", "Ada")
      greeting = "Hello, {name}"
      `)
    );

    const suspension = expectInputSuspension(expectSuspended(result));
    expect(suspension.prompt).toBe('Name?');
    expect(suspension.initial).toBe('Ada');

    const resumed = await interpreter.resume('Grace');

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
    const history = new RuntimeHistory();
    recordSnapshots(interpreter, history);

    const result = await interpreter.run(
      parseSnippet(`
      value = 1
      snapshot
      value = 2
      `)
    );

    expect(result.status).toBe('completed');
    expect(interpreter.getVariable('value')).toBe(2);
    expect(history.entries).toHaveLength(1);

    interpreter.restoreState(history.moveTo(0));

    expect(interpreter.getVariable('value')).toBe(1);
    expect(restored).toEqual([{ saved: true }]);
  });

  it('pauses execution until resumed', async () => {
    const interpreter = new Interpreter();

    const result = await interpreter.run(
      parseSnippet(`
      value = 1
      pause
      value = 2
      `)
    );

    expect(isBreakpointSuspension(expectSuspended(result))).toBe(true);
    expect(interpreter.getVariable('value')).toBe(1);

    const resumed = await interpreter.resume(undefined);

    expect(resumed.status).toBe('completed');
    expect(interpreter.getVariable('value')).toBe(2);
  });

  it('stops a suspended program and starts cleanly on the next run', async () => {
    const interpreter = new Interpreter();

    const result = await interpreter.run(
      parseSnippet(`
      value = 1
      pause
      value = 2
      `)
    );

    expect(isBreakpointSuspension(expectSuspended(result))).toBe(true);
    expect(interpreter.getVariable('value')).toBe(1);

    interpreter.stop();

    expect(interpreter.isComplete).toBe(true);
    expect(interpreter.suspension).toBeNull();
    expect(() => interpreter.resume(undefined)).toThrow(
      'interpreter is not suspended'
    );

    const rerun = await interpreter.run(
      parseSnippet(`
      value = 3
      `)
    );

    expect(rerun.status).toBe('completed');
    expect(interpreter.getVariable('value')).toBe(3);
  });

  it('records restorable snapshots while stepping through statements', async () => {
    const interpreter = new Interpreter();
    const history = new RuntimeHistory();
    recordSnapshots(interpreter, history);

    const rootNode = parseSnippet(`
      value = 1
      value = value + 1
      value = value + 1
      `);

    let result = await interpreter.runToNextStatement(rootNode);

    expect(isBreakpointSuspension(expectSuspended(result))).toBe(true);
    expect(interpreter.topFrame.head.node.location.start.line).toBe(2);
    expect(history.entries).toHaveLength(1);
    expect(history.current?.globalNamespace.values.value).toBeUndefined();

    result = await interpreter.stepToNextStatement();

    expect(isBreakpointSuspension(expectSuspended(result))).toBe(true);
    expect(interpreter.topFrame.head.node.location.start.line).toBe(3);
    expect(history.entries).toHaveLength(2);
    expect(history.current?.globalNamespace.values.value).toBe(1);

    result = await interpreter.stepToNextStatement();

    expect(isBreakpointSuspension(expectSuspended(result))).toBe(true);
    expect(interpreter.topFrame.head.node.location.start.line).toBe(4);
    expect(history.entries).toHaveLength(3);
    expect(history.current?.globalNamespace.values.value).toBe(2);

    interpreter.restoreState(history.moveTo(1));

    expect(interpreter.topFrame.head.node.location.start.line).toBe(3);
    expect(interpreter.getVariable('value')).toBe(1);
    expect(history.isRewound).toBe(true);
  });

  it('continues from a restored marker snapshot and discards future history', async () => {
    const markers: MarkerType[] = [];
    const source = [
      'value = 0',
      'value = value + 1',
      'value = value + 1',
      'value = value + 1',
      '',
    ].join('\n');
    const rootNode = parse(source);
    const interpreter = new Interpreter();
    const history = new RuntimeHistory();
    recordSnapshots(interpreter, history);

    markers[2] = 'snapshot';
    markers[3] = 'snapshot';
    interpreter.setMarkerMap(mapMarkers(rootNode, markers));

    const result = await interpreter.run(rootNode);

    expect(result.status).toBe('completed');
    expect(interpreter.getVariable('value')).toBe(3);
    expect(history.entries).toHaveLength(2);
    expect(history.isRewound).toBe(false);

    interpreter.restoreState(history.moveTo(0));
    expect(interpreter.getVariable('value')).toBe(0);
    expect(history.isRewound).toBe(true);

    history.truncateAfterCurrent();
    const resumed = await interpreter.runLoop();

    expect(resumed.status).toBe('completed');
    expect(interpreter.getVariable('value')).toBe(3);
    expect(history.entries).toHaveLength(2);
    expect(history.index).toBe(1);
    expect(history.isRewound).toBe(false);
  });

  it('replaces a restored snapshot and discards future history', async () => {
    const interpreter = new Interpreter();
    const history = new RuntimeHistory();
    recordSnapshots(interpreter, history);

    const result = await interpreter.run(
      parseSnippet(`
      value = 0
      snapshot
      value = 1
      snapshot
      value = 2
      `)
    );

    expect(result.status).toBe('completed');
    expect(history.entries).toHaveLength(2);

    interpreter.restoreState(history.moveTo(0));
    interpreter.setGlobalVariable('value', 99);
    history.replaceCurrent(interpreter.captureState());

    expect(history.entries).toHaveLength(1);
    expect(history.index).toBe(0);
    expect(history.isRewound).toBe(false);
    expect(history.current?.globalNamespace.values.value).toBe(99);
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
    const history = new RuntimeHistory();
    recordSnapshots(interpreter, history);

    markers[2] = 'snapshot';
    markers[3] = 'breakpoint';
    interpreter.setMarkerMap(mapMarkers(rootNode, markers));

    const result = await interpreter.run(rootNode);

    expect(isBreakpointSuspension(expectSuspended(result))).toBe(true);
    expect(history.entries).toHaveLength(2);
    expect(interpreter.getVariable('value')).toBe(1);

    const resumed = await interpreter.resume(undefined);

    expect(resumed.status).toBe('completed');
    expect(interpreter.getVariable('value')).toBe(2);
  });
});
