import { castDraft, produce, type Producer } from 'immer';

import { installBuiltins } from './builtins/index.js';
import { emptyMarkerMap, type MarkerMap } from './editor-markers.js';
import { DataHandler, installHandlers } from './handlers/index.js';
import { NullHost, type SupportsSnapshots } from './host.js';
import { Namespace, RuntimeNamespace } from './namespace.js';
import {
  Frame,
  Node,
  BeginNode,
  LiteralNode,
  UnwindSignal,
  VarNode,
  rootFrame,
} from './nodes/index.js';
import type { IndexType, RuntimeFunctions } from './types.js';
import { Cons } from './utils/cons.js';

type GlobalFunctions = Record<string, BeginNode>;

const emptyObject = Object.freeze(Object.create(null));

export type { SupportsSnapshots } from './host.js';

export interface RuntimeState {
  globalFunctions: GlobalFunctions;
  globalNamespace: Namespace;
  localNamespaces: Cons<Namespace> | null;
  topFrame: Cons<Frame>;
  lastResult: unknown;
  hostSnapshot: unknown;
}

export type RuntimeEffectKind = 'repaint' | 'snapshot';

export interface RuntimeEffect {
  readonly kind: RuntimeEffectKind;
}

export const repaintEffect: RuntimeEffect = Object.freeze({
  kind: 'repaint',
});

export const snapshotEffect: RuntimeEffect = Object.freeze({
  kind: 'snapshot',
});

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

export type ConfigurationHandler = (option: string, value: unknown) => void;

export class Interpreter {
  dataHandlers: DataHandler[] = [];
  namespace = new RuntimeNamespace((value) => this.getHandler(value));
  runtimeFunctions: RuntimeFunctions = emptyObject;
  globalFunctions: GlobalFunctions = emptyObject;
  topFrame = rootFrame;
  lastResult: unknown = null;
  isRunning: boolean = false;
  pauseReason: RuntimePause | null = null;
  pendingEffects: RuntimeEffect[] = [];
  effectHandler: RuntimeEffectHandler | null = null;
  markersMap: MarkerMap = emptyMarkerMap;
  private configurationHandler: ConfigurationHandler | null = null;
  private shouldStepToNextStatement = false;
  private pendingInput: string | null = null;

  constructor(
    public readonly host: SupportsSnapshots = new NullHost()
  ) {
    installHandlers(this);
    installBuiltins(this);
    this.registerGlobals({
      snapshot(interpreter) {
        interpreter.setEffect(snapshotEffect);
      },
    });
  }

  get isPaused() {
    return this.pauseReason !== null;
  }

  get isComplete() {
    return this.topFrame === rootFrame;
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

  run(node: Node) {
    this.globalFunctions = emptyObject;
    this.namespace.reset();
    this.topFrame = rootFrame.push(node.makeFrame());
    this.lastResult = null;
    this.pauseReason = null;
    this.pendingInput = null;
    this.pendingEffects = [];
    return this.runLoop();
  }

  async runToNextStatement(node: Node) {
    this.globalFunctions = emptyObject;
    this.namespace.reset();
    this.topFrame = rootFrame.push(node.makeFrame());
    this.lastResult = null;
    this.pauseReason = null;
    this.pendingInput = null;
    this.pendingEffects = [];
    this.shouldStepToNextStatement = true;
    try {
      return await this.runLoop();
    } finally {
      this.shouldStepToNextStatement = false;
    }
  }

  runIncremental(node: Node) {
    this.topFrame = rootFrame.push(node.makeFrame());
    this.lastResult = null;
    this.pauseReason = null;
    this.pendingInput = null;
    this.pendingEffects = [];
    return this.runLoop();
  }

  async runLoop(): Promise<RunResult> {
    this.isRunning = true;
    try {
      while (true) {
        if (this.pauseReason) {
          this.isRunning = false;
          return { status: 'paused', pause: this.pauseReason };
        }
        if (this.topFrame === rootFrame) {
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
              }
            }
          }
        }
      }
    } catch (err) {
      this.isRunning = false;
      throw err;
    }
  }

  continue() {
    if (!this.pauseReason) {
      return this.runLoop();
    }
    if (this.pauseReason.kind === 'input' && this.pendingInput === null) {
      throw new Error('interpreter is waiting for input');
    }

    this.pauseReason = null;
    return this.runLoop();
  }

  continueWithInput(value: string) {
    this.provideInput(value);
    return this.continue();
  }

  provideInput(value: string) {
    if (this.pauseReason?.kind !== 'input') {
      throw new Error('interpreter is not waiting for input');
    }

    this.pendingInput = value;
  }

  consumeInput() {
    if (this.pendingInput === null) {
      throw new Error('input value was not provided');
    }

    const value = this.pendingInput;
    this.pendingInput = null;
    return value;
  }

  async stepToNextStatement() {
    if (!this.pauseReason || this.pauseReason.kind === 'input') {
      throw new Error('interpreter is not paused at a continuable statement');
    }

    this.pauseReason = null;
    this.shouldStepToNextStatement = true;
    try {
      return await this.runLoop();
    } finally {
      this.shouldStepToNextStatement = false;
    }
  }

  setEffect(effect: RuntimeEffect) {
    this.pendingEffects.push(effect);
  }

  stop() {
    this.pauseReason = null;
    this.pendingInput = null;
    this.pendingEffects = [];
    this.isRunning = false;
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

  defineGlobalFunction(node: BeginNode) {
    this.globalFunctions = produce(this.globalFunctions, (draft) => {
      draft[node.name] = castDraft(node);
    });
  }

  pushFrame(frame: Frame) {
    this.topFrame = this.topFrame.push(frame);
    if (frame.node.isStatement) {
      this.onStatementPush(frame.node);
    }
    frame.onEnter(this);
  }

  swapFrame<T extends Frame = Frame>(
    state: number | null,
    producer?: Producer<T>
  ) {
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
    this.topFrame.head.onExit(this);
    this.topFrame = this.topFrame.swap(frame);
    frame.onEnter(this);
  }

  popFrame() {
    this.topFrame.head.onExit(this);
    this.topFrame = this.topFrame.pop();
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
    while (this.topFrame !== rootFrame) {
      this.popFrame();
    }
  }

  unwind(signal: UnwindSignal) {
    while (this.topFrame !== rootFrame) {
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

  getRuntimeFunction(name: string) {
    if (!(name in this.runtimeFunctions)) {
      throw new Error(`function ${name} not found`);
    }
    return this.runtimeFunctions[name];
  }

  setResult(value: unknown) {
    this.lastResult = value;
  }

  captureState(): RuntimeState {
    return {
      globalFunctions: this.globalFunctions,
      globalNamespace: this.namespace.globalNamespace,
      localNamespaces: this.localNamespaces,
      topFrame: this.topFrame,
      lastResult: this.lastResult,
      hostSnapshot: this.host.takeSnapshot(),
    };
  }

  restoreState(state: RuntimeState) {
    this.globalFunctions = state.globalFunctions;
    this.namespace.restore(state.globalNamespace, state.localNamespaces);
    this.topFrame = state.topFrame;
    this.lastResult = state.lastResult;
    this.pauseReason = null;
    this.pendingInput = null;
    this.topFrame.head.onEnter(this);
    this.host.restoreSnapshot(state.hostSnapshot);
  }

  clearMarkers() {
    this.markersMap = emptyMarkerMap;
  }

  setMarkerMap(markersMap: MarkerMap) {
    this.markersMap = markersMap;
  }
}
