import { original, produce } from 'immer';

import { DataHandler, installHandlers } from './handlers';
import { Frame, Node } from './nodes';

class NullFrame extends Frame {
  visit() {
    throw new Error('no program running');
  }
}

export class Interpreter {
  dataHandlers: DataHandler[] = [];
  systemFunctions: Record<string, any> = {};
  globalFunctions: Record<string, any> = {};
  globalNamespace: Record<string, any> = {};
  namespaceStack: any[] = [];
  topNamespace: Record<string, any> = {};
  nullFrame: Frame = new NullFrame(this);
  frameStack: Frame[] = [];
  topFrame: Frame = this.nullFrame;
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
    this.topNamespace = {};
    this.namespaceStack = [];
    this.topFrame = node.makeFrame(this);
    this.frameStack = [];
    this.setResult();

    return this.runLoop();
  }

  async runLoop() {
    while (this.topFrame !== this.nullFrame) {
      const result = this.topFrame.visit();
      if (result instanceof Promise) {
        await result;
      }
    }
  }

  pushNode(node: Node) {
    this.frameStack = produce(this.frameStack, (draft) => {
      draft.push(this.topFrame);
    });
    this.topFrame = node.makeFrame(this);
  }

  popNode() {
    if (this.frameStack.length === 0) {
      this.topFrame = this.nullFrame;
    } else {
      this.frameStack = produce(this.frameStack, (draft) => {
        // @ts-expect-error type of original() is wrong
        this.topFrame = original(draft.pop());
      });
    }
  }

  public snapshot() {
    return {
      gfn: this.globalFunctions,
      gns: this.globalNamespace,
      lns: this.topNamespace,
      lst: this.namespaceStack,
      fra: this.topFrame,
      fst: this.frameStack,
      res: this.lastResult,
    };
  }

  public reset(snap: any) {
    this.globalFunctions = snap.gfn;
    this.globalNamespace = snap.gns;
    this.topNamespace = snap.lns;
    this.namespaceStack = snap.lst;
    this.topFrame = snap.fra;
    this.frameStack = snap.fst;
    this.lastResult = snap.res;
  }

  private flow(ctrl: any) {
    if (ctrl.type) {
      this.push(ctrl);
    } else if (ctrl.pop) {
      if (ctrl.pop === 'out') {
        this.pop();
      } else if (ctrl.pop === 'over') {
        this.popOver(ctrl.flow);
      } else if (ctrl.pop === 'until') {
        this.popUntil(ctrl.flow);
      } else if (ctrl.pop === 'exit') {
        this.topFrame = this.nullFrame;
        this.frameStack = [];
      }
    }
  }

  private push(node: any) {
    if (node.type === 'literal') {
      this.setResult(node.value);
    } else if (node.type === 'var') {
      this.setResult({
        rhs: this.get(node.name),
        lhs: { name: node.name },
      });
    } else {
      this.frameStack = produce(this.frameStack, (dfst) => {
        dfst.push(this.topFrame);
      });
      this.topFrame = makeFrame(node);
    }
  }

  private pushns() {
    this.namespaceStack = produce(this.namespaceStack, (dlst) => {
      dlst.push(this.topNamespace);
    });
    this.topNamespace = {};
  }

  private pop() {
    if (this.topFrame.ns) {
      this.namespaceStack = produce(this.namespaceStack, (dlst) => {
        this.topNamespace = original(dlst.pop());
      });
    }
    if (this.frameStack.length === 0) {
      this.topFrame = this.nullFrame;
    } else {
      this.frameStack = produce(this.frameStack, (dfst) => {
        this.topFrame = original(dfst.pop());
      });
    }
  }

  private popOver(flow: string) {
    while (this.topFrame) {
      const { node } = this.topFrame;
      this.pop();
      if (node.flow === flow) {
        break;
      }
    }
  }

  private popUntil(flow: string) {
    while (this.topFrame) {
      if (this.topFrame.node.flow === flow) {
        break;
      }
      this.pop();
    }
  }

  setResult(result?: any) {
    if (!result || !('rhs' in result)) {
      this.lastResult = { rhs: result };
    } else {
      this.lastResult = result;
    }
  }

  private get(name: string) {
    if (name in this.topNamespace) {
      return this.topNamespace[name];
    } else {
      return this.globalNamespace[name];
    }
  }

  private set(name: string, value: any, local = false) {
    if (local || name in this.topNamespace) {
      this.topNamespace = produce(this.topNamespace, (dns) => {
        dns[name] = value;
      });
    } else {
      this.globalNamespace = produce(this.globalNamespace, (dgns) => {
        dgns[name] = value;
      });
    }
  }

  private getIndex(name: string, indexes: any[]) {
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

  private setIndex(name: string, indexes: any[], value: any) {
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
}
