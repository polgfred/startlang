import { Draft, original, produce } from 'immer';

import { DataHandler, installHandlers } from './handlers/index.js';
import {
  Frame,
  Node,
  BeginNode,
  LiteralNode,
  VarNode,
  rootFrame,
  rootNamespace,
} from './nodes/index.js';

export interface RuntimeFunction {
  (interpreter: Interpreter, ...args: any[]): any;
}

const emptyObject = Object.freeze(Object.create(null));

export class Interpreter {
  dataHandlers: DataHandler[] = [];
  systemFunctions: Record<string, RuntimeFunction> = emptyObject;
  globalFunctions: Record<string, BeginNode> = emptyObject;
  globalNamespace: Record<string, any> = emptyObject;
  topFrame = rootFrame;
  topNamespace = rootNamespace;
  lastResult: any = null;

  constructor(public readonly host: unknown) {
    installHandlers(this);
  }

  registerGlobals(funcs: Record<string, RuntimeFunction>) {
    this.systemFunctions = produce(this.systemFunctions, (draft) => {
      Object.assign(draft, funcs);
    });
  }

  registerHandler(handler: DataHandler) {
    this.dataHandlers.push(handler);
    this.registerGlobals(handler.globals);
  }

  getHandler(value: any) {
    for (const handler of this.dataHandlers) {
      if (handler.shouldHandle(value)) {
        return handler;
      }
    }

    throw new Error(`could not determine type for ${value}`);
  }

  run(node: Node) {
    this.topNamespace = rootNamespace;
    this.topFrame = rootFrame.push(node.makeFrame());
    this.lastResult = null;

    return this.runLoop();
  }

  async runLoop() {
    while (this.topFrame !== rootFrame) {
      const result = this.topFrame.head.visit(this);
      if (result instanceof Promise) {
        await result;
      }
    }
  }

  swapFrame<T extends Frame>(
    frame: T,
    state: number | null,
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

  setVariable(name: string, value: any, local = false) {
    if (local || name in this.topNamespace.head) {
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

  getVariableIndex(name: string, indexes: readonly any[]) {
    return indexes.reduce((value, index) => {
      const handler = this.getHandler(value);
      return handler.getIndex(value, index);
    }, this.getVariable(name));
  }

  setVariableIndex(name: string, indexes: readonly any[], value: any) {
    const currentValue = this.getVariable(name);
    this.setVariable(
      name,
      produce(currentValue, (draft: any) => {
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

  evalUnaryOp(op: string, right: any) {
    const handler = this.getHandler(right);
    return handler.evalUnaryOp(op, right);
  }

  evalBinaryOp(op: string, left: any, right: any) {
    const leftHandler = this.getHandler(left);
    const rightHandler = this.getHandler(right);
    if (leftHandler !== rightHandler) {
      throw new Error('operands must be of the same type');
    }
    return leftHandler.evalBinaryOp(op, left, right);
  }

  installGlobalFunction(node: BeginNode) {
    this.globalFunctions = produce(this.globalFunctions, (draft) => {
      draft[node.name] = node;
    });
  }

  invokeRuntimeFunction(name: string, args: any[]) {
    if (args.length > 0) {
      const handler = this.getHandler(args[0]);
      if (name in handler.methods) {
        return handler.methods[name](this, args);
      }
    }
    if (name in this.systemFunctions) {
      return this.systemFunctions[name](this, args);
    }
    throw new Error(`object not found or not a function: ${name}`);
  }

  setResult(value: any) {
    this.lastResult = value;
  }

  takeSnapshot() {
    return {
      globalFunctions: this.globalFunctions,
      globalNamespace: this.globalNamespace,
      topFrame: this.topFrame,
      topNamespace: this.topNamespace,
      lastResult: this.lastResult,
    };
  }

  restoreSnapshot(snapshot: any) {
    this.globalFunctions = snapshot.globalFunctions;
    this.globalNamespace = snapshot.globalNamespace;
    this.topFrame = snapshot.topFrame;
    this.topNamespace = snapshot.topNamespace;
    this.lastResult = snapshot.lastResult;
  }
}
