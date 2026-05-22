import { describe, expect, it } from 'vitest';

import { mapMarkers } from '../src/editor-markers.js';

import {
  AbortedError,
  Interpreter,
  type RunResult,
} from '@startlang/lang-core/interpreter';
import type { RuntimePause } from '@startlang/lang-core/interpreter';
import { parse } from '@startlang/lang-core/parser.peggy';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import { RuntimeHistory } from '@startlang/lang-core/runtime-history';
import type { MarkerType } from '@startlang/lang-core/types';

function parseSnippet(source: string) {
  return parse(`${source}\n`);
}

function recordSnapshots(interpreter: Interpreter, history: RuntimeHistory) {
  interpreter.registerEffectHandler((effect) => {
    if (effect.kind === 'snapshot') {
      history.push(interpreter.captureState());
    }
  });
}

function expectPaused(result: RunResult): RuntimePause {
  expect(result.status).toBe('paused');
  if (result.status !== 'paused') {
    throw new Error('expected pause');
  }
  return result.pause;
}

function expectInputPause(pause: RuntimePause) {
  expect(pause.kind).toBe('input');
  if (pause.kind !== 'input') {
    throw new Error('expected input pause');
  }
  return pause;
}

function expectPauseKind(result: RunResult, kind: RuntimePause['kind']) {
  expect(expectPaused(result).kind).toBe(kind);
}

describe('interpreter lifecycle', () => {
  it('pauses for input and continues with the provided value', async () => {
    const interpreter = new Interpreter();
    interpreter.registerGlobals(runtimeGlobals);

    const result = await interpreter.run(
      parseSnippet(`
      input name "Name?" "Ada"
      greeting = "Hello, {name}"
      `)
    );

    const pause = expectInputPause(expectPaused(result));
    expect(pause.prompt).toBe('Name?');
    expect(pause.initial).toBe('Ada');

    const resumed = await interpreter.resume({ input: 'Grace' });

    expect(resumed.status).toBe('completed');
    expect(interpreter.getVariable('name')).toBe('Grace');
    expect(interpreter.getVariable('greeting')).toBe('Hello, Grace');
  });

  it('can provide input before continuing', async () => {
    const interpreter = new Interpreter();

    const result = await interpreter.run(
      parseSnippet(`
      input name "Name?"
      `)
    );

    expectInputPause(expectPaused(result));

    const resumed = await interpreter.resume({ input: 'Grace' });

    expect(resumed.status).toBe('completed');
    expect(interpreter.getVariable('name')).toBe('Grace');
  });

  it('does not stop twice when an input statement has a breakpoint', async () => {
    const markers: MarkerType[] = [];
    const source = [
      'value = 1',
      'input name "Name?" "Ada"',
      'value = 2',
      '',
    ].join('\n');
    const rootNode = parse(source);
    const interpreter = new Interpreter();

    markers[2] = 'breakpoint';
    interpreter.setMarkerMap(mapMarkers(rootNode, markers));

    const result = await interpreter.run(rootNode);

    const pause = expectInputPause(expectPaused(result));
    expect(pause.prompt).toBe('Name?');
    expect(interpreter.topFrame!.head.node.location.start.line).toBe(2);

    const resumed = await interpreter.resume({ input: 'Grace' });

    expect(resumed.status).toBe('completed');
    expect(interpreter.getVariable('name')).toBe('Grace');
    expect(interpreter.getVariable('value')).toBe(2);
  });

  it('restores intrinsic input pauses from the current node', async () => {
    const markers: MarkerType[] = [];
    const source = ['input name "Name?" "Ada"', 'value = 1', ''].join('\n');
    const rootNode = parse(source);
    const interpreter = new Interpreter();
    const history = new RuntimeHistory();
    recordSnapshots(interpreter, history);

    markers[1] = 'snapshot';
    interpreter.setMarkerMap(mapMarkers(rootNode, markers));

    const result = await interpreter.run(rootNode);

    expectInputPause(expectPaused(result));
    expect(history.entries).toHaveLength(1);

    interpreter.stop();
    interpreter.restoreState(history.moveTo(0));

    const pause = expectInputPause(interpreter.pauseReason!);
    expect(pause.initial).toBe('Ada');

    const resumed = await interpreter.resume({ input: 'Grace' });

    expect(resumed.status).toBe('completed');
    expect(interpreter.getVariable('name')).toBe('Grace');
    expect(interpreter.getVariable('value')).toBe(1);
  });

  it('takes explicit snapshots and restores interpreter and host state', async () => {
    const restored: unknown[] = [];
    const interpreter = new Interpreter();
    interpreter.registerSnapshotHandler({
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

    expectPauseKind(result, 'pause');
    expect(interpreter.getVariable('value')).toBe(1);

    const resumed = await interpreter.resume();

    expect(resumed.status).toBe('completed');
    expect(interpreter.getVariable('value')).toBe(2);
  });

  it('stops a paused program and starts cleanly on the next run', async () => {
    const interpreter = new Interpreter();

    const result = await interpreter.run(
      parseSnippet(`
      value = 1
      pause
      value = 2
      `)
    );

    expectPauseKind(result, 'pause');
    expect(interpreter.getVariable('value')).toBe(1);

    interpreter.stop();

    expect(interpreter.isComplete).toBe(true);
    expect(interpreter.pauseReason).toBeNull();

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

    let result = await interpreter.run(rootNode, { step: true });

    expectPauseKind(result, 'step');
    expect(interpreter.topFrame!.head.node.location.start.line).toBe(2);
    expect(history.entries).toHaveLength(1);
    expect(history.current?.globalNamespace.values.value).toBeUndefined();

    result = await interpreter.resume({ step: true });

    expectPauseKind(result, 'step');
    expect(interpreter.topFrame!.head.node.location.start.line).toBe(3);
    expect(history.entries).toHaveLength(2);
    expect(history.current?.globalNamespace.values.value).toBe(1);

    result = await interpreter.resume({ step: true });

    expectPauseKind(result, 'step');
    expect(interpreter.topFrame!.head.node.location.start.line).toBe(4);
    expect(history.entries).toHaveLength(3);
    expect(history.current?.globalNamespace.values.value).toBe(2);

    interpreter.restoreState(history.moveTo(1));

    expect(interpreter.topFrame!.head.node.location.start.line).toBe(3);
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
    const resumed = await interpreter.resume();

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

  it('takes marker snapshots and breakpoint pauses at node entry', async () => {
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

    expectPauseKind(result, 'breakpoint');
    expect(history.entries).toHaveLength(2);
    expect(interpreter.getVariable('value')).toBe(1);

    const resumed = await interpreter.resume();

    expect(resumed.status).toBe('completed');
    expect(interpreter.getVariable('value')).toBe(2);
  });

  it('emits a delay effect for sleep without actually waiting', async () => {
    const interpreter = new Interpreter();
    const delays: number[] = [];
    interpreter.registerEffectHandler((effect) => {
      if (effect.kind === 'delay') {
        delays.push(effect.ms);
      }
    });

    const result = await interpreter.run(
      parseSnippet(`
      sleep 100
      sleep 250
      value = "done"
      `)
    );

    expect(result.status).toBe('completed');
    expect(delays).toEqual([100, 250]);
    expect(interpreter.getVariable('value')).toBe('done');
  });

  it('throws AbortedError from a stale runLoop when stop is called during an awaited effect', async () => {
    const interpreter = new Interpreter();
    let release: (() => void) | null = null;
    interpreter.registerEffectHandler((effect) => {
      if (effect.kind === 'delay') {
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      }
    });

    const runPromise = interpreter.run(
      parseSnippet(`
      sleep 1000
      value = "should not run"
      `)
    );

    await new Promise((r) => setImmediate(r));
    expect(release).not.toBeNull();

    interpreter.stop();
    release!();

    await expect(runPromise).rejects.toBeInstanceOf(AbortedError);
    expect(interpreter.getVariable('value')).toBeUndefined();
  });

  it('throws AbortedError from the previous runLoop when a new run starts mid-effect', async () => {
    const interpreter = new Interpreter();
    let release: (() => void) | null = null;
    interpreter.registerEffectHandler((effect) => {
      if (effect.kind === 'delay') {
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      }
    });

    const firstRun = interpreter.run(
      parseSnippet(`
      sleep 1000
      value = "first"
      `)
    );

    await new Promise((r) => setImmediate(r));
    expect(release).not.toBeNull();
    const staleRelease = release!;

    const secondRun = await interpreter.run(
      parseSnippet(`
      value = "second"
      `)
    );
    expect(secondRun.status).toBe('completed');
    expect(interpreter.getVariable('value')).toBe('second');

    staleRelease();
    await expect(firstRun).rejects.toBeInstanceOf(AbortedError);
    expect(interpreter.getVariable('value')).toBe('second');
  });

  it('does not clobber the stepping flag when a stale stepping runLoop is aborted', async () => {
    const interpreter = new Interpreter();
    const pendingDelays: Array<() => void> = [];
    interpreter.registerEffectHandler((effect) => {
      if (effect.kind === 'delay') {
        return new Promise<void>((resolve) => {
          pendingDelays.push(resolve);
        });
      }
    });

    const firstPause = await interpreter.run(
      parseSnippet(`
      sleep 1000
      value = "first"
      `),
      { step: true }
    );
    expectPauseKind(firstPause, 'step');
    const stalePending = interpreter.resume({ step: true });
    await new Promise((r) => setImmediate(r));
    expect(pendingDelays).toHaveLength(1);
    const releaseStale = pendingDelays.shift()!;

    const newPause = await interpreter.run(
      parseSnippet(`
      sleep 500
      value = "new"
      `),
      { step: true }
    );
    expectPauseKind(newPause, 'step');
    const newPending = interpreter.resume({ step: true });
    await new Promise((r) => setImmediate(r));
    expect(pendingDelays).toHaveLength(1);
    const releaseNew = pendingDelays.shift()!;

    // Stale releases first; the new run already set its own step flag via
    // prepareToRun, so the stale loop's abort must not clobber it.
    releaseStale();
    await expect(stalePending).rejects.toBeInstanceOf(AbortedError);

    releaseNew();
    expectPauseKind(await newPending, 'step');
    expect(interpreter.getVariable('value')).toBeUndefined();
  });
});
