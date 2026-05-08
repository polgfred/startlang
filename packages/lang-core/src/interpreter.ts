import { castDraft, produce, type Producer } from 'immer';

import { emptyMarkerMap, type MarkerMap } from './editor-markers.js';
import { DataHandler, installHandlers } from './handlers/index.js';
import { NullPresentationHost, type SupportsSnapshots } from './host.js';
import { Namespace } from './namespace.js';
import {
  Frame,
  Node,
  BeginNode,
  LiteralNode,
  VarNode,
  rootFrame,
} from './nodes/index.js';
import {
  breakpointSuspension,
  isRuntimeSuspension,
  type RuntimeSuspension,
} from './suspension.js';
import type { IndexType, NamespaceType, RuntimeFunctions } from './types.js';
import { Cons } from './utils/cons.js';

type GlobalFunctions = Record<string, BeginNode>;

const emptyObject = Object.freeze(Object.create(null));

export type { SupportsSnapshots } from './host.js';

export interface RuntimeState<THostSnapshot = unknown> {
  globalFunctions: GlobalFunctions;
  globalNamespace: NamespaceType;
  localNamespaces: Cons<NamespaceType> | null;
  topFrame: Cons<Frame>;
  lastResult: unknown;
  suspension: RuntimeSuspension | null;
  hostSnapshot: THostSnapshot;
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

export type RunResult =
  | { status: 'completed' }
  | { status: 'suspended'; suspension: RuntimeSuspension };

export class Interpreter<THostSnapshot = unknown> {
  dataHandlers: DataHandler[] = [];
  namespace = new Namespace((value) => this.getHandler(value));
  runtimeFunctions: RuntimeFunctions = emptyObject;
  globalFunctions: GlobalFunctions = emptyObject;
  topFrame = rootFrame;
  lastResult: unknown = null;
  isRunning: boolean = false;
  suspension: RuntimeSuspension | null = null;
  pendingEffects: RuntimeEffect[] = [];
  effectHandler: RuntimeEffectHandler | null = null;
  markersMap: MarkerMap = emptyMarkerMap;

  constructor(
    public readonly host: SupportsSnapshots<THostSnapshot> = new NullPresentationHost() as SupportsSnapshots<THostSnapshot>
  ) {
    installHandlers(this);
    this.registerGlobals({
      pause() {
        return breakpointSuspension;
      },
      snapshot(interpreter) {
        interpreter.setEffect(snapshotEffect);
      },
    });
  }

  get isSuspended() {
    return this.suspension !== null;
  }

  get isComplete() {
    return this.topFrame === rootFrame;
  }

  get globalNamespace() {
    return this.namespace.globalNamespace;
  }

  get localNamespace() {
    return this.namespace.localNamespace;
  }

  get localNamespaces() {
    return this.namespace.localNamespaces;
  }

  run(node: Node) {
    this.globalFunctions = emptyObject;
    this.namespace.reset();
    this.topFrame = rootFrame.push(node.makeFrame());
    this.lastResult = null;
    this.suspension = null;
    this.pendingEffects = [];
    return this.runLoop();
  }

  runIncremental(node: Node) {
    this.topFrame = rootFrame.push(node.makeFrame());
    this.lastResult = null;
    this.suspension = null;
    this.pendingEffects = [];
    return this.runLoop();
  }

  async runLoop(): Promise<RunResult> {
    this.isRunning = true;
    try {
      while (true) {
        if (this.suspension) {
          this.isRunning = false;
          return { status: 'suspended', suspension: this.suspension };
        }
        if (this.topFrame === rootFrame) {
          this.isRunning = false;
          return { status: 'completed' };
        }

        const result = this.topFrame.head.visit(this);
        if (result instanceof Promise) {
          await result;
        } else if (isRuntimeSuspension(result)) {
          this.suspension = result;
        }

        const effects = this.pendingEffects;
        if (effects.length > 0) {
          this.pendingEffects = [];
          for (const effect of effects) {
            const result = this.effectHandler?.(effect);
            if (result instanceof Promise) {
              await result;
            }
          }
        }
      }
    } catch (err) {
      this.isRunning = false;
      throw err;
    }
  }

  resume(response: unknown) {
    if (!this.suspension) {
      throw new Error('interpreter is not suspended');
    }

    const suspension = this.suspension;
    this.suspension = null;
    suspension.resume(this, response);
    return this.runLoop();
  }

  setEffect(effect: RuntimeEffect) {
    this.pendingEffects.push(effect);
  }

  stop() {
    this.suspension = null;
    this.pendingEffects = [];
    this.isRunning = false;
    this.popOut();
  }

  registerHandler(handler: DataHandler) {
    this.dataHandlers.push(handler);
    this.registerGlobals(handler.globals);
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

  defineGlobalFunction(node: BeginNode) {
    this.globalFunctions = produce(this.globalFunctions, (draft) => {
      draft[node.name] = castDraft(node);
    });
  }

  pushFrame(frame: Frame) {
    this.topFrame = this.topFrame.push(frame);
  }

  swapFrame<T extends Frame>(
    frame: T,
    state: number | null = null,
    producer?: Producer<T>
  ) {
    this.topFrame = this.topFrame.swap(
      produce(frame, (draft) => {
        if (state !== null) {
          draft.state = state;
        }
        if (producer) {
          producer(draft);
        }
      })
    );
  }

  popFrame() {
    this.topFrame.head.dispose(this);
    this.topFrame = this.topFrame.pop();
  }

  pushNode(node: Node) {
    if (node instanceof LiteralNode) {
      this.lastResult = node.value;
    } else if (node instanceof VarNode) {
      this.lastResult = this.getVariable(node.name);
    } else {
      this.pushFrame(node.makeFrame());
      const marker = this.markersMap(node);
      if (marker) {
        this.setEffect(snapshotEffect);
        if (marker === 'breakpoint') {
          this.suspension = breakpointSuspension;
        }
      }
    }
  }

  popOut() {
    this.topFrame = rootFrame;
    this.namespace.popOut();
  }

  popOver(flow: 'loop' | 'call') {
    while (this.topFrame !== rootFrame) {
      const isBoundary = this.topFrame.head.isFlowBoundary(flow);
      this.popFrame();
      if (isBoundary) {
        break;
      }
    }
  }

  popUntil(flow: 'loop' | 'call') {
    while (this.topFrame !== rootFrame) {
      if (this.topFrame.head.isFlowBoundary(flow)) {
        break;
      }
      this.popFrame();
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

  getRuntimeFunction(name: string, args: unknown[]) {
    if (args.length > 0) {
      const handler = this.getHandler(args[0]);
      if (name in handler.methods) {
        return handler.methods[name];
      }
    }
    if (name in this.runtimeFunctions) {
      return this.runtimeFunctions[name];
    }
    throw new Error(`function ${name} not found`);
  }

  setResult(value: unknown) {
    this.lastResult = value;
  }

  captureState(): RuntimeState<THostSnapshot> {
    return {
      globalFunctions: this.globalFunctions,
      globalNamespace: this.globalNamespace,
      localNamespaces: this.localNamespaces,
      topFrame: this.topFrame,
      lastResult: this.lastResult,
      suspension: this.suspension,
      hostSnapshot: this.host.takeSnapshot(),
    };
  }

  restoreState(state: RuntimeState<THostSnapshot>) {
    this.globalFunctions = state.globalFunctions;
    this.namespace.restore(state.globalNamespace, state.localNamespaces);
    this.topFrame = state.topFrame;
    this.lastResult = state.lastResult;
    this.suspension = state.suspension;
    this.host.restoreSnapshot(state.hostSnapshot);
  }

  clearMarkers() {
    this.markersMap = emptyMarkerMap;
  }

  setMarkerMap(markersMap: MarkerMap) {
    this.markersMap = markersMap;
  }
}
