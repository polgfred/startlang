import { Draft, original, produce } from 'immer';

import { DataHandler, installHandlers } from './handlers';
import { Frame, Node, rootFrame } from './nodes';

export class Interpreter {
  dataHandlers: DataHandler[] = [];
  systemFunctions: Record<string, any> = {};
  globalFunctions: Record<string, any> = {};
  globalNamespace: Record<string, any> = {};
  namespaceStack: any[] = [];
  topNamespace: Record<string, any> = {};
  topFrame = rootFrame;
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
    this.topFrame = this.topFrame.push(node.makeFrame());
    this.setResult();

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
    this.topFrame = this.topFrame.push(node.makeFrame());
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

  public snapshot() {
    return {
      gfn: this.globalFunctions,
      gns: this.globalNamespace,
      lns: this.topNamespace,
      lst: this.namespaceStack,
      fra: this.topFrame,
      res: this.lastResult,
    };
  }

  public reset(snap: any) {
    this.globalFunctions = snap.gfn;
    this.globalNamespace = snap.gns;
    this.topNamespace = snap.lns;
    this.namespaceStack = snap.lst;
    this.topFrame = snap.fra;
    this.lastResult = snap.res;
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
      this.topFrame = produce(this.topFrame, (dfst) => {
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
    if (this.topFrame.length === 0) {
      this.topFrame = this.nullFrame;
    } else {
      this.topFrame = produce(this.topFrame, (dfst) => {
        this.topFrame = original(dfst.pop());
      });
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
