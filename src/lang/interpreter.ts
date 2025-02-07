import { produce } from 'immer';
import {
  BaseHandler,
  BooleanHandler,
  ListHandler,
  NoneHandler,
  NumberHandler,
  StringHandler,
  TableHandler,
} from './builtins';

const hop = Object.prototype.hasOwnProperty;

export class Interpreter {
  private globals: Record<string, any> = {};
  private handlers: BaseHandler[] = [];
  private gfn: Record<string, any> = {};
  private gns: Record<string, any> = {};
  private lns: Record<string, any> = {};
  private lst: any[] = [];
  private fra: any = null;
  private fst: any[] = [];
  private res: any = null;

  constructor() {
    // this.registerGlobals(builtinGlobals);
    this.registerHandler(new NoneHandler(this));
    this.registerHandler(new BooleanHandler(this));
    this.registerHandler(new NumberHandler(this));
    this.registerHandler(new StringHandler(this));
    this.registerHandler(new ListHandler(this));
    this.registerHandler(new TableHandler(this));
  }

  private registerGlobals(fns: Record<string, any>) {
    for (const name in fns) {
      this.globals[name] = fns[name];
    }
  }

  private registerHandler(handler: BaseHandler) {
    this.handlers.push(handler);
    // this.registerGlobals(handler.globals);
  }

  getHandler(value: any) {
    for (const handler of this.handlers) {
      if (handler.shouldHandle(value)) {
        return handler;
      }
    }

    throw new Error(`could not determine type for ${value}`);
  }

  private syscall(name: string, args: any[]) {
    const fn =
      (args.length > 0 && handle(args[0]).methods[name]) || this.globals[name];
    if (!fn) {
      throw new Error(`object not found or not a function: ${name}`);
    }
    return fn(...args);
  }

  private async loop() {
    while (this.fra) {
      const { node, state } = this.fra;
      const method = nodes[node.type];
      let ctrl;
      if (method.length === 3) {
        this.fra = produce(this.fra, (dfra) => {
          ctrl = method(node, state, dfra);
        });
      } else {
        ctrl = method(node, state);
      }
      if (ctrl) {
        if (ctrl.then) {
          const rctrl = await ctrl;
          if (rctrl) {
            this.flow(rctrl);
          }
        } else {
          this.flow(ctrl);
        }
      }
    }
  }

  public run(node: any) {
    this.gfn = {};
    this.gns = {};
    this.lns = {};
    this.lst = [];
    this.fra = makeFrame(node);
    this.fst = [];
    this.setResult();
    return this.loop();
  }

  public snapshot() {
    return {
      gfn: this.gfn,
      gns: this.gns,
      lns: this.lns,
      lst: this.lst,
      fra: this.fra,
      fst: this.fst,
      res: this.res,
    };
  }

  public reset(snap: any) {
    this.gfn = snap.gfn;
    this.gns = snap.gns;
    this.lns = snap.lns;
    this.lst = snap.lst;
    this.fra = snap.fra;
    this.fst = snap.fst;
    this.res = snap.res;
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
        this.fra = null;
        this.fst = [];
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
      this.fst = produce(this.fst, (dfst) => {
        dfst.push(this.fra);
      });
      this.fra = makeFrame(node);
    }
  }

  private pushns() {
    this.lst = produce(this.lst, (dlst) => {
      dlst.push(this.lns);
    });
    this.lns = {};
  }

  private pop() {
    if (this.fra.ns) {
      this.lst = produce(this.lst, (dlst) => {
        this.lns = original(dlst.pop());
      });
    }
    if (this.fst.length === 0) {
      this.fra = null;
    } else {
      this.fst = produce(this.fst, (dfst) => {
        this.fra = original(dfst.pop());
      });
    }
  }

  private popOver(flow: string) {
    while (this.fra) {
      const { node } = this.fra;
      this.pop();
      if (node.flow === flow) {
        break;
      }
    }
  }

  private popUntil(flow: string) {
    while (this.fra) {
      if (this.fra.node.flow === flow) {
        break;
      }
      this.pop();
    }
  }

  setResult(result?: any) {
    if (!result || !hop.call(result, 'rhs')) {
      this.res = { rhs: result };
    } else {
      this.res = result;
    }
  }

  private get(name: string) {
    if (hop.call(this.lns, name)) {
      return this.lns[name];
    } else {
      return this.gns[name];
    }
  }

  private set(name: string, value: any, local = false) {
    if (local || hop.call(this.lns, name)) {
      this.lns = produce(this.lns, (dns) => {
        dns[name] = value;
      });
    } else {
      this.gns = produce(this.gns, (dgns) => {
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
