import { castDraft, type Draft, original, produce } from 'immer';

import { DataHandler, installHandlers } from './handlers/index.js';
import { NullPresentationHost, type SupportsSnapshots } from './host.js';
import {
  Frame,
  Node,
  BeginNode,
  LiteralNode,
  VarNode,
  rootFrame,
} from './nodes/index.js';
import {
  emptyMarkerMap,
  mapMarkers,
  type MarkerMap,
} from './nodes/map-markers.js';
import {
  BreakpointSuspension,
  isRuntimeSuspension,
  type RuntimeSuspension,
} from './suspension.js';
import type {
  IndexType,
  MarkerType,
  NamespaceType,
  RuntimeFunctions,
} from './types.js';
import { Cons } from './utils/cons.js';

type GlobalFunctions = Record<string, BeginNode>;

const emptyObject = Object.freeze(Object.create(null));

const rootNamespace: Cons<NamespaceType> = new Cons(emptyObject);

export type { SupportsSnapshots } from './host.js';

export interface Snapshot {
  globalFunctions: GlobalFunctions;
  globalNamespace: NamespaceType;
  topNamespace: Cons<NamespaceType>;
  topFrame: Cons<Frame>;
  lastResult: unknown;
  hostSnapshot: unknown;
  suspension: RuntimeSuspension | null;
}

export type RunResult =
  | { status: 'completed' }
  | { status: 'suspended'; suspension: RuntimeSuspension };

export class Interpreter {
  dataHandlers: DataHandler[] = [];
  runtimeFunctions: RuntimeFunctions = emptyObject;
  globalFunctions: GlobalFunctions = emptyObject;
  globalNamespace: NamespaceType = emptyObject;
  topNamespace = rootNamespace;
  topFrame = rootFrame;
  lastResult: unknown = null;
  isRunning: boolean = false;
  suspension: RuntimeSuspension | null = null;
  history: Snapshot[] = [];
  snapshotIndex: number = 0;
  markersMap: MarkerMap = emptyMarkerMap;

  constructor(
    public readonly host: SupportsSnapshots = new NullPresentationHost()
  ) {
    installHandlers(this);
    this.registerGlobals({
      snapshot(interpreter) {
        interpreter.takeSnapshot();
      },
    });
  }

  get isSuspended() {
    return this.suspension !== null;
  }

  run(node: Node) {
    this.globalFunctions = emptyObject;
    this.globalNamespace = emptyObject;
    this.topNamespace = rootNamespace;
    this.topFrame = rootFrame.push(node.makeFrame());
    this.lastResult = null;
    this.suspension = null;
    return this.runLoop();
  }

  runIncremental(node: Node) {
    this.topFrame = rootFrame.push(node.makeFrame());
    this.lastResult = null;
    this.suspension = null;
    return this.runLoop();
  }

  async runLoop(): Promise<RunResult> {
    this.isRunning = true;
    try {
      while (true) {
        if (this.suspension) {
          return { status: 'suspended', suspension: this.suspension };
        }
        if (this.topFrame === rootFrame) {
          return { status: 'completed' };
        }

        const result = this.topFrame.head.visit(this);
        if (result instanceof Promise) {
          await result;
        } else if (isRuntimeSuspension(result)) {
          this.suspension = result;
        }
      }
    } finally {
      this.isRunning = false;
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

  stop() {
    this.suspension = null;
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

  swapFrame<T extends Frame>(
    frame: T,
    state: number | null = null,
    updater?: (draft: Draft<T>) => void
  ) {
    this.topFrame = this.topFrame.swap(
      produce(frame, (draft) => {
        if (state !== null) {
          draft.state = state;
        }
        if (updater) {
          updater(draft);
        }
      })
    );
  }

  pushFrame(node: Node) {
    if (node instanceof LiteralNode) {
      this.lastResult = node.value;
    } else if (node instanceof VarNode) {
      this.lastResult = this.getVariable(node.name);
    } else {
      this.topFrame = this.topFrame.push(node.makeFrame());
      const marker = this.markersMap.get(this.topFrame.head.node);
      if (marker) {
        this.takeSnapshot();
        if (marker === 'breakpoint') {
          this.suspension = new BreakpointSuspension();
        }
      }
    }
  }

  popFrame() {
    this.topFrame.head.dispose(this);
    this.topFrame = this.topFrame.pop();
  }

  popOut() {
    this.topFrame = rootFrame;
    this.topNamespace = rootNamespace;
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

  pushNamespace() {
    this.topNamespace = this.topNamespace.push(emptyObject);
  }

  popNamespace() {
    this.topNamespace = this.topNamespace.pop();
  }

  getVariable(name: string) {
    if (name in this.topNamespace.head) {
      return this.topNamespace.head[name];
    } else {
      return this.globalNamespace[name];
    }
  }

  setVariable(name: string, value: unknown) {
    if (this.topNamespace !== rootNamespace) {
      this.topNamespace = this.topNamespace.swap(
        produce(this.topNamespace.head, (draft) => {
          draft[name] = value;
        })
      );
    } else {
      this.globalNamespace = produce(this.globalNamespace, (draft) => {
        draft[name] = value;
      });
    }
  }

  getVariableIndex(name: string, indexes: readonly IndexType[]) {
    return indexes.reduce((value, index) => {
      const handler = this.getHandler(value);
      return handler.getIndex(value, index);
    }, this.getVariable(name));
  }

  setVariableIndex(
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) {
    const currentValue = this.getVariable(name);
    this.setVariable(
      name,
      produce(currentValue, (draft: unknown) => {
        indexes.reduce((draft, index, i) => {
          const handler = this.getHandler(original(draft));
          if (i === indexes.length - 1) {
            handler.setIndex(draft, index, value);
          } else {
            return handler.getIndex(draft, index);
          }
        }, draft);
      })
    );
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

  clearHistory() {
    this.history = [];
    this.snapshotIndex = 0;
  }

  takeSnapshot() {
    this.history.splice(this.snapshotIndex + 1);
    this.history.push({
      globalFunctions: this.globalFunctions,
      globalNamespace: this.globalNamespace,
      topNamespace: this.topNamespace,
      topFrame: this.topFrame,
      lastResult: this.lastResult,
      suspension: this.suspension,
      hostSnapshot: this.host.takeSnapshot(),
    });
    this.snapshotIndex = this.history.length - 1;
  }

  moveToSnapshot(index: number) {
    const snapshot = this.history[index];
    this.globalFunctions = snapshot.globalFunctions;
    this.globalNamespace = snapshot.globalNamespace;
    this.topNamespace = snapshot.topNamespace;
    this.topFrame = snapshot.topFrame;
    this.lastResult = snapshot.lastResult;
    this.suspension = snapshot.suspension;
    this.host.restoreSnapshot(snapshot.hostSnapshot);
    this.snapshotIndex = index;
  }

  clearMarkers() {
    this.markersMap = emptyMarkerMap;
  }

  setMarkers(node: Node, markers: readonly MarkerType[]) {
    this.markersMap = mapMarkers(node, markers);
  }
}
