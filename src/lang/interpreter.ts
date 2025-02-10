import { Draft, original, produce } from 'immer';

import { DataHandler, installHandlers } from './handlers';
import { Frame, Node, rootFrame, rootNamespace } from './nodes';
import { LiteralNode } from './nodes/literal';
import { VarNode } from './nodes/var';

export class Interpreter {
  dataHandlers: DataHandler[] = [];
  systemFunctions = Object.create(null);
  globalFunctions = Object.create(null);
  globalNamespace = Object.create(null);
  topFrame = rootFrame;
  topNamespace = rootNamespace;
  lastResult: any = null;

  constructor() {
    installHandlers(this);
  }

  registerGlobals(fns: object) {
    Object.assign(this.systemFunctions, fns);
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
    this.topFrame = this.topFrame.push(node.makeFrame());
    this.lastResult = null;

    return this.runLoop();
  }

  async runLoop() {
    while (this.topFrame !== rootFrame) {
      const result = this.topFrame.value.visit(this);
      if (result instanceof Promise) {
        await result;
      }
    }
  }

  updateFrame<T extends Frame>(
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
    this.topFrame = this.topFrame.pop();
  }

  popOut() {
    this.topFrame = rootFrame;
    this.topNamespace = rootNamespace;
  }

  popOver(flow: 'loop' | 'call') {
    while (this.topFrame !== rootFrame) {
      const { flowMarker } = this.topFrame.value;
      this.popFrame();
      if (flow === flowMarker) {
        break;
      }
    }
  }

  popUntil(flow: 'loop' | 'call') {
    while (this.topFrame !== rootFrame) {
      if (flow === this.topFrame.value.flowMarker) {
        break;
      }
      this.popFrame();
    }
  }

  pushNamespace() {
    this.topNamespace = this.topNamespace.push(Object.create(null));
  }

  popNamespace() {
    this.topNamespace = this.topNamespace.pop();
  }

  getVariable(name: string) {
    if (name in this.topNamespace.value) {
      return this.topNamespace.value[name];
    } else {
      return this.globalNamespace[name];
    }
  }

  setVariable(name: string, value: any, local = false) {
    if (local || name in this.topNamespace.value) {
      this.topNamespace = this.topNamespace.swap(
        produce(this.topNamespace, (draft) => {
          draft[name] = value;
        })
      );
    } else {
      this.globalNamespace = produce(this.globalNamespace, (draft) => {
        draft[name] = value;
      });
    }
  }

  getVariableIndex(name: string, indexes: any[]) {
    let value = this.getVariable(name);
    for (let i = 0; i < indexes.length; i++) {
      const handler = this.getHandler(value);
      value = handler.getIndex(value, indexes[i]);
    }
    return value;
  }

  setVariableIndex(name: string, indexes: any[], value: any) {
    this.setVariable(
      name,
      produce(this.getVariable(name), (draft: any) => {
        for (let i = 0; i < indexes.length; i++) {
          const handler = this.getHandler(original(draft));
          if (i < indexes.length - 1) {
            draft = handler.getIndex(draft, indexes[i]);
          } else {
            handler.setIndex(draft, indexes[i], value);
          }
        }
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

  runFunction(name: string, args: any[]) {
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

  snapshot() {
    return {
      gfn: this.globalFunctions,
      gns: this.globalNamespace,
      fra: this.topFrame,
      lns: this.topNamespace,
      res: this.lastResult,
    };
  }

  reset(snap: any) {
    this.globalFunctions = snap.gfn;
    this.globalNamespace = snap.gns;
    this.topFrame = snap.fra;
    this.topNamespace = snap.lns;
    this.lastResult = snap.res;
  }
}
