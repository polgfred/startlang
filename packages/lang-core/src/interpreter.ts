import { produce, type Producer } from 'immer';

import { installBuiltins } from './builtins/index.js';
import { emptyMarkerMap, type MarkerMap } from './editor-markers.js';
import { DataHandler, installHandlers } from './handlers/index.js';
import { Namespace, RuntimeNamespace } from './namespace.js';
import {
  Frame,
  Node,
  BeginNode,
  LiteralNode,
  UnwindSignal,
  VarNode,
} from './nodes/index.js';
import { Program } from './program.js';
import type { IndexType, RuntimeFunction, RuntimeFunctions } from './types.js';
import { Cons } from './utils/cons.js';

type GlobalFunctions = Record<string, BeginNode>;

const emptyObject = Object.freeze(Object.create(null));

export interface SnapshotHandler {
  takeSnapshot: () => unknown;
  restoreSnapshot: (snapshot: unknown) => void;
}

export interface RuntimeState {
  globalNamespace: Namespace;
  localNamespaces: Cons<Namespace> | null;
  topFrame: Cons<Frame> | null;
  lastResult: unknown;
  hostSnapshot: unknown;
}

export type RuntimeEffect =
  | { readonly kind: 'repaint' }
  | { readonly kind: 'snapshot' }
  | { readonly kind: 'delay'; readonly ms: number };

export type RuntimeEffectKind = RuntimeEffect['kind'];

export const repaintEffect: RuntimeEffect = Object.freeze({
  kind: 'repaint',
});

export const snapshotEffect: RuntimeEffect = Object.freeze({
  kind: 'snapshot',
});

export function delayEffect(ms: number): RuntimeEffect {
  return { kind: 'delay', ms };
}

export type RuntimeEffectHandler = (
  effect: RuntimeEffect
) => void | Promise<void>;

export type RuntimePause =
  | { kind: 'breakpoint' }
  | { kind: 'input'; prompt: string; initial: string }
  | { kind: 'pause' }
  | { kind: 'step' };

export type RunResult =
  | { status: 'completed' }
  | { status: 'paused'; pause: RuntimePause };

export class RuntimeError extends Error {
  constructor(
    err: unknown,
    public readonly node: Node
  ) {
    super(err instanceof Error ? err.message : String(err), {
      cause: err,
    });
    this.name = 'RuntimeError';
  }
}

// Thrown by runLoop when its epoch advances mid-await (stop / restart took
// over). It is *not* a runtime error — it is a structural signal that the
// stale call never produced a result. Callers that wrap runLoop must
// re-throw it past any finalizers; the top-level traffic cop drops it.
export class AbortedError extends Error {
  constructor() {
    super('interpreter run aborted');
    this.name = 'AbortedError';
  }
}

export type ConfigurationHandler = (option: string, value: unknown) => void;

export class Interpreter {
  topFrame: Cons<Frame> | null = null;
  lastResult: unknown = null;
  isRunning: boolean = false;
  pauseReason: RuntimePause | null = null;
  private namespace = new RuntimeNamespace((value) => this.getHandler(value));
  private runtimeFunctions: RuntimeFunctions = emptyObject;
  private globalFunctions: GlobalFunctions = emptyObject;
  private dataHandlers: DataHandler[] = [];
  private markersMap: MarkerMap = emptyMarkerMap;
  private pendingEffects: RuntimeEffect[] = [];
  private effectHandler: RuntimeEffectHandler | null = null;
  private configurationHandler: ConfigurationHandler | null = null;
  private snapshotHandler: SnapshotHandler | null = null;
  private shouldStepToNextStatement = false;
  private pendingInput: string | null = null;
  // Bumped on prepareToRun / stop so any in-flight runLoop awaiting an
  // async effect can detect that its state is stale and bail out cleanly.
  private epoch = 0;

  constructor() {
    installHandlers(this);
    installBuiltins(this);
  }

  get isPaused() {
    return this.pauseReason !== null;
  }

  get isComplete() {
    return this.topFrame === null;
  }

  get globalNamespace() {
    return this.namespace.globalValues;
  }

  get localNamespace() {
    return this.namespace.localValues;
  }

  get localNamespaces() {
    return this.namespace.localNamespaces;
  }

  // Starts a fresh run from `program.main`.
  //   incremental: merge program.functions into the existing table instead
  //                of resetting the namespace (each call is its own
  //                compilation unit). Used by the REPL.
  //   step:        pause at the next statement push.
  run(
    program: Program,
    { incremental = false, step = false }: { incremental?: boolean; step?: boolean } = {}
  ): Promise<RunResult> {
    if (incremental) {
      this.globalFunctions = Object.freeze({
        ...this.globalFunctions,
        ...program.functions,
      });
    } else {
      this.globalFunctions = Object.freeze({ ...program.functions });
      this.namespace.reset();
    }
    this.topFrame = new Cons(program.main.makeFrame());
    this.lastResult = null;
    this.pauseReason = null;
    this.pendingInput = null;
    this.pendingEffects = [];
    this.shouldStepToNextStatement = step;
    this.epoch++;
    return this.runLoop();
  }

  // Continues from the current state (paused, rewound, or just-restored).
  //   step:  pause at the next statement push.
  //   input: supply the value an `input` pause is waiting on.
  resume(
    options: { step?: boolean; input?: string } = {}
  ): Promise<RunResult> {
    if (this.pauseReason?.kind === 'input') {
      if (options.step) {
        throw new Error('cannot step while waiting for input');
      }
      if (options.input !== undefined) {
        this.pendingInput = options.input;
      }
      if (this.pendingInput === null) {
        throw new Error('interpreter is waiting for input');
      }
    } else if (options.input !== undefined) {
      throw new Error('interpreter is not waiting for input');
    }

    this.shouldStepToNextStatement = options.step ?? false;
    this.pauseReason = null;
    return this.runLoop();
  }

  private async runLoop(): Promise<RunResult> {
    this.isRunning = true;
    const myEpoch = this.epoch;
    try {
      while (true) {
        if (this.pauseReason) {
          this.isRunning = false;
          return { status: 'paused', pause: this.pauseReason };
        }
        if (this.topFrame === null) {
          this.isRunning = false;
          return { status: 'completed' };
        }

        const frame = this.topFrame.head;
        try {
          frame.visit(this);
        } catch (err) {
          throw err instanceof RuntimeError
            ? err
            : new RuntimeError(err, frame.node);
        }

        const effects = this.pendingEffects;
        if (effects.length > 0) {
          this.pendingEffects = [];
          if (this.effectHandler) {
            for (const effect of effects) {
              const result = this.effectHandler(effect);
              if (result instanceof Promise) {
                await result;
                if (this.epoch !== myEpoch) {
                  throw new AbortedError();
                }
              }
            }
          }
        }
      }
    } catch (err) {
      // Don't clear the flag for an aborted result
      if (!(err instanceof AbortedError)) {
        this.isRunning = false;
      }
      throw err;
    }
  }

  consumeInput() {
    if (this.pendingInput === null) {
      throw new Error('input value was not provided');
    }

    const value = this.pendingInput;
    this.pendingInput = null;
    return value;
  }

  setEffect(effect: RuntimeEffect) {
    this.pendingEffects.push(effect);
  }

  stop() {
    this.pauseReason = null;
    this.pendingInput = null;
    this.pendingEffects = [];
    this.isRunning = false;
    this.epoch++;
    this.exit();
  }

  registerHandler(handler: DataHandler) {
    this.dataHandlers.push(handler);
  }

  getHandler(value: unknown) {
    for (const handler of this.dataHandlers) {
      if (handler.shouldHandle(value)) {
        return handler;
      }
    }
    throw new Error(`could not determine type for ${value}`);
  }

  registerGlobals(funcs: RuntimeFunctions) {
    this.runtimeFunctions = produce(this.runtimeFunctions, (draft) => {
      Object.assign(draft, funcs);
    });
  }

  registerConfigurationHandler(handler: ConfigurationHandler) {
    this.configurationHandler = handler;
  }

  applyConfiguration(option: string, value: unknown) {
    if (!this.configurationHandler) {
      throw new Error(`no host handler registered for 'set ${option}'`);
    }
    this.configurationHandler(option, value);
  }

  registerEffectHandler(handler: RuntimeEffectHandler | null) {
    this.effectHandler = handler;
  }

  registerSnapshotHandler(handler: SnapshotHandler) {
    this.snapshotHandler = handler;
  }

  pushFrame(frame: Frame) {
    this.topFrame = new Cons(frame, this.topFrame);
    if (frame.node.isStatement) {
      this.onStatementPush(frame.node);
    }
    frame.onEnter(this);
  }

  swapFrame<T extends Frame = Frame>(
    state: number | null,
    producer?: Producer<T>
  ) {
    if (!this.topFrame) {
      throw new Error('no top frame to swap');
    }
    this.topFrame = this.topFrame.swap(
      produce(this.topFrame.head as T, (draft) => {
        if (state !== null) {
          draft.state = state;
        }
        if (producer) {
          producer(draft);
        }
      })
    );
  }

  replaceFrame(frame: Frame) {
    if (!this.topFrame) {
      throw new Error('no top frame to replace');
    }
    this.topFrame.head.onExit(this);
    this.topFrame = this.topFrame.swap(frame);
    frame.onEnter(this);
  }

  popFrame() {
    if (!this.topFrame) {
      throw new Error('no top frame to pop');
    }
    this.topFrame.head.onExit(this);
    this.topFrame = this.topFrame.popOrNull();
  }

  pushNode(node: Node) {
    if (node instanceof LiteralNode) {
      this.lastResult = node.value;
    } else if (node instanceof VarNode) {
      this.lastResult = this.getVariable(node.name);
    } else {
      this.pushFrame(node.makeFrame());
    }
  }

  onStatementPush(node: Node) {
    const marker = this.markersMap(node);
    // pushNode is the interpreter's node-entry point, so this catches the next
    // statement without re-pausing when expression frames return to their
    // enclosing statement.
    const shouldPauseForStep = this.shouldStepToNextStatement;
    if (marker || shouldPauseForStep) {
      this.setEffect(snapshotEffect);
    }

    if (shouldPauseForStep) {
      this.pauseReason = { kind: 'step' };
    } else if (marker === 'breakpoint') {
      this.pauseReason = { kind: 'breakpoint' };
    }
  }

  pauseAtNode(pause: RuntimePause) {
    this.pauseReason = pause;
  }

  exit() {
    while (this.topFrame !== null) {
      this.popFrame();
    }
  }

  unwind(signal: UnwindSignal) {
    while (this.topFrame !== null) {
      const action = this.topFrame.head.onUnwind(signal);
      if (action === 'stop') {
        return;
      }
      this.popFrame();
      if (action === 'stop-after') {
        return;
      }
    }
  }

  pushNamespace(producer?: Producer<Record<string, unknown>>) {
    this.namespace.push(producer);
  }

  popNamespace() {
    this.namespace.pop();
  }

  getVariable(name: string) {
    return this.namespace.getVariable(name);
  }

  setVariable(name: string, value: unknown) {
    this.namespace.setVariable(name, value);
  }

  deleteVariable(name: string) {
    this.namespace.deleteVariable(name);
  }

  setGlobalVariable(name: string, value: unknown) {
    this.namespace.setGlobalVariable(name, value);
  }

  deleteGlobalVariable(name: string) {
    this.namespace.deleteGlobalVariable(name);
  }

  setLocalVariable(name: string, value: unknown) {
    this.namespace.setLocalVariable(name, value);
  }

  deleteLocalVariable(name: string) {
    this.namespace.deleteLocalVariable(name);
  }

  getVariableIndex(name: string, indexes: readonly IndexType[]) {
    return this.namespace.getVariableIndex(name, indexes);
  }

  setVariableIndex(
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) {
    this.namespace.setVariableIndex(name, indexes, value);
  }

  deleteVariableIndex(name: string, indexes: readonly IndexType[]) {
    this.namespace.deleteVariableIndex(name, indexes);
  }

  setGlobalVariableIndex(
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) {
    this.namespace.setGlobalVariableIndex(name, indexes, value);
  }

  deleteGlobalVariableIndex(name: string, indexes: readonly IndexType[]) {
    this.namespace.deleteGlobalVariableIndex(name, indexes);
  }

  setLocalVariableIndex(
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) {
    this.namespace.setLocalVariableIndex(name, indexes, value);
  }

  deleteLocalVariableIndex(name: string, indexes: readonly IndexType[]) {
    this.namespace.deleteLocalVariableIndex(name, indexes);
  }

  evalUnaryOp(op: string, right: unknown) {
    const handler = this.getHandler(right);
    return handler.evalUnaryOp(op, right);
  }

  evalBinaryOp(op: string, left: unknown, right: unknown) {
    const leftHandler = this.getHandler(left);
    const rightHandler = this.getHandler(right);
    if (leftHandler !== rightHandler) {
      throw new Error('operands must be of the same type');
    }
    return leftHandler.evalBinaryOp(op, left, right);
  }

  getRuntimeFunction(name: string): RuntimeFunction | undefined {
    return this.runtimeFunctions[name];
  }

  getGlobalFunction(name: string): BeginNode | undefined {
    return this.globalFunctions[name];
  }

  getGlobalFunctionNames(): readonly string[] {
    return Object.keys(this.globalFunctions);
  }

  setResult(value: unknown) {
    this.lastResult = value;
  }

  captureState(): RuntimeState {
    return {
      globalNamespace: this.namespace.globalNamespace,
      localNamespaces: this.localNamespaces,
      topFrame: this.topFrame,
      lastResult: this.lastResult,
      hostSnapshot: this.snapshotHandler?.takeSnapshot(),
    };
  }

  restoreState(state: RuntimeState) {
    this.namespace.restore(state.globalNamespace, state.localNamespaces);
    this.topFrame = state.topFrame;
    this.lastResult = state.lastResult;
    this.pauseReason = null;
    this.pendingInput = null;
    this.topFrame?.head.onEnter(this);
    this.snapshotHandler?.restoreSnapshot(state.hostSnapshot);
  }

  clearMarkers() {
    this.markersMap = emptyMarkerMap;
  }

  setMarkerMap(markersMap: MarkerMap) {
    this.markersMap = markersMap;
  }
}
