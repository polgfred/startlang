import { Draft, produce } from 'immer';

import { DataHandler, installHandlers } from './handlers';
import { Frame, Node, rootFrame, rootNamespace } from './nodes';
import { LiteralNode } from './nodes/literal';
import { VarNode } from './nodes/var';

const emptyObject: object = Object.create(null);

export class Interpreter {
  dataHandlers: DataHandler[] = [];
  systemFunctions = emptyObject;
  globalFunctions = emptyObject;
  globalNamespace = emptyObject;
  topFrame = rootFrame;
  topNamespace = rootNamespace;
  lastResult: any = null;

  constructor() {
    // this.registerGlobals(builtinGlobals);
    installHandlers.call(this);
  }

  private registerGlobals(fns: Record<string, any>) {
    for (const name in fns) {
      this.systemFunctions[name] = fns[name];
    }
  }

  registerHandler(handler: DataHandler) {
    this.dataHandlers.push(handler);
    // this.registerGlobals(handler.globals);
  }

  getHandler(value: any) {
    for (const handler of this.dataHandlers) {
      if (handler.shouldHandle(value)) {
        return handler;
      }
    }

    throw new Error(`could not determine type for ${value}`);
  }

  private syscall(name: string, args: any[]) {
    const fn =
      (args.length > 0 && this.getHandler(args[0]).getMethod(name)) ||
      this.systemFunctions[name];
    if (!fn) {
      throw new Error(`object not found or not a function: ${name}`);
    }
    return fn(...args);
  }

  run(node: Node) {
    this.globalFunctions = {};
    this.globalNamespace = {};
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
    this.topNamespace = this.topNamespace.push(emptyObject);
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
    return indexes.reduce((currentValue, currentIndex) => {
      const handler = this.getHandler(currentValue);
      return handler.getIndex(currentValue, currentIndex);
    }, this.getVariable(name));
  }

  setVariableIndex(name: string, indexes: any[], value: any) {
    const setNextResult = (currentValue: any, i: number) => {
      const handler = this.getHandler(currentValue);
      const currentIndex = indexes[i];
      if (i === indexes.length - 1) {
        return handler.setIndex(currentValue, currentIndex, value);
      } else {
        const nextValue = handler.getIndex(currentValue, currentIndex);
        return handler.setIndex(
          currentValue,
          currentIndex,
          setNextResult(nextValue, i + 1)
        );
      }
    };

    this.setVariable(name, setNextResult(this.getVariable(name), 0));
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
