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
      this.lastResult = this.getVariableValue(node.name);
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

  getVariableValue(name: string) {
    if (name in this.topNamespace.value) {
      return this.topNamespace.value[name];
    } else {
      return this.globalNamespace[name];
    }
  }

  setVariableValue(name: string, value: any, local = false) {
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

  getIndex(name: string, indexes: any[]) {
    const max = indexes.length - 1;
    return this.next(this.get(name), 0);

    next = (b: any, i: number) => {
      const h = handle(b);
      const idx = indexes[i];
      return i === max
        ? h.getindex(b, idx)
        : this.next(h.getindex(b, idx), i + 1);
    };
  }

  setIndex(name: string, indexes: any[], value: any) {
    const max = indexes.length - 1;
    this.set(name, this.next(this.get(name), 0));

    next = (b: any, i: number) => {
      const h = handle(b);
      const idx = indexes[i];
      if (i === max) {
        return h.setindex(b, idx, value);
      } else {
        const nv = h.getindex(b, idx);
        return h.setindex(b, idx, this.next(nv, i + 1));
      }
    };
  }

  handleResult(ret: any, assn: any[]) {
    if (ret) {
      const repl = ret[assignKey];
      if (repl) {
        for (let i = 0; i < repl.length; ++i) {
          const r = repl[i];
          if (r !== undefined) {
            const a = assn[i];
            if (a !== undefined) {
              if (a.indexes) {
                this.setIndex(a.name, a.indexes, r);
              } else {
                this.set(a.name, r);
              }
            }
          }
        }
        ret = ret[resultKey] || repl[0];
      }
    }
    this.setResult(ret);
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
