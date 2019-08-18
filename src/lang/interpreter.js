/* eslint-disable no-case-declarations */

import immutable from 'immutable';

import { handle, assignKey, resultKey } from './runtime';

let hop = Object.prototype.hasOwnProperty; // cache this for performance
let pop = { pop: true }; // cache generic pop instruction for performance

export const SFrame = immutable.Record({
  node: null, // node for this evaluation frame
  state: 0, // evaluation state machine state
  ns: false, // whether to pop a ns off the stack for this frame
  // commonly used loop states
  count: 0,
  times: 0,
  from: 0,
  to: 0,
  by: 1,
  // commonly used for gathering indexes or params
  indexes: immutable.List(),
  args: immutable.List(),
  assn: immutable.List(),
  // less commonly used object references
  iter: null,
  left: null,
});

export class SInterpreter {
  constructor(app) {
    // the react component that we'll call methods on
    this.app = app;
    // setup the internal state
    this.fn = immutable.OrderedMap(); // function table
    this.ns = immutable.OrderedMap(); // top namespace
    this.st = immutable.Stack(); // namespace stack
    // set an empty result value
    this.replace();
  }

  root(node) {
    // push on the root node and global namespace
    this.frame = SFrame({ node });
    this.fst = immutable.Stack();
  }

  run() {
    // set up an entry point that loops until the stack is exhausted, or
    // until a node returns a promise
    let loop = () => {
      while (this.frame) {
        let { node, state } = this.frame,
          method = `${node.type}Node`,
          ctrl;
        // check arity to see if the handler expects a mutable frame
        if (this[method].length > 2) {
          this.frame = this.frame.withMutations(frame => {
            ctrl = this[method](node, state, frame);
          });
        } else {
          ctrl = this[method](node, state);
        }
        // deal with the result
        if (ctrl) {
          // check for a promise
          if (ctrl.then) {
            // handle flow and reenter the loop
            return ctrl.then(ctrl => {
              if (ctrl) {
                this.doFlow(ctrl);
              }
              return loop();
            });
          } else {
            // handle flow instruction
            this.doFlow(ctrl);
          }
        }
      }
      // take a final snapshot
      this.app.snapshot();
    };

    // return a promise for the eventual termination of the loop
    return new Promise(resolve => {
      resolve(loop());
    });
  }

  // ** manage stack frames **

  doFlow(ctrl) {
    // deal with any push or pop instruction returned from the node handler
    if (ctrl.type) {
      // it's a node, push it
      this.push(ctrl);
    } else if (ctrl.pop) {
      // it's a pop instruction
      if (ctrl.pop === true) {
        this.pop();
      } else if (ctrl.pop == 'over') {
        this.popOver(ctrl.flow);
      } else if (ctrl.pop == 'until') {
        this.popUntil(ctrl.flow);
      } else if (ctrl.pop == 'exit') {
        // clear the stack so the program exits
        this.frame = null;
        this.fst = this.fst.clear();
      }
    }
  }

  push(node) {
    // optimize literals and vars by setting the result register directly
    if (node.type == 'literal') {
      this.replace(node.value);
    } else if (node.type == 'var') {
      // return the rv/lv pair for this assignment
      this.replace({
        rv: this.get(node.name),
        lv: { name: node.name },
      });
    } else {
      // push a new frame onto the stack for this node
      this.fst = this.fst.push(this.frame);
      this.frame = SFrame({ node });
    }
  }

  pop() {
    if (this.frame.ns) {
      // pop off the corresponding namespace
      this.ns = this.st.first();
      this.st = this.st.pop();
    }
    // pop this frame off the stack
    this.frame = this.fst.first();
    this.fst = this.fst.pop();
  }

  popOver(flow) {
    // pop frames off including a loop or function call node
    while (this.frame) {
      let { node } = this.frame;
      // pop the target frame
      this.pop();
      // break here if we're popping the target frame
      if (node.flow == flow) {
        break;
      }
    }
  }

  popUntil(flow) {
    // pop frames off until hitting a loop or function call node
    while (this.frame) {
      // break here if we're popping the target frame
      if (this.frame.node.flow == flow) {
        break;
      }
      // pop the target frame
      this.pop();
    }
  }

  // ** return values **

  replace(result) {
    // normalize the result to rvalue/lvalue form if necessary
    if (result == null || !hop.call(result, 'rv')) {
      result = { rv: result };
    }
    this.result = result;
  }

  // ** namespace access **

  pushns() {
    // push on a new namespace
    this.st = this.st.push(this.ns);
    this.ns = immutable.OrderedMap();
  }

  get(name) {
    // look in the top frame
    if (this.st.size == 0 || (this.ns.size > 0 && this.ns.has(name))) {
      return this.ns.get(name);
    }
    // look up the namespace stack
    let ns = this.st.find(ns => ns.size > 0 && ns.has(name));
    if (ns) {
      return ns.get(name);
    }
  }

  set(name, value, top = false) {
    // look in the top frame
    if (top || this.st.size == 0 || (this.ns.size > 0 && this.ns.has(name))) {
      this.ns = this.ns.set(name, value);
      return;
    }
    // look up the namespace stack
    this.st = this.st.withMutations(st => {
      let saved = new Array(st.size),
        i = 0,
        ns;
      // loop until we hit the root ns
      for (;;) {
        ns = st.first();
        if (st.size == 1 || (ns.size > 0 && ns.has(name))) {
          break;
        }
        // keep track of the intermediate ns
        saved[i++] = ns;
        st.pop();
      }
      // set the value in the target namespace
      st.pop();
      st.push(ns.set(name, value));
      // push the intermediate namespaces back on in reverse order
      for (--i; i >= 0; --i) {
        st.push(saved[i]);
      }
    });
  }

  getIndex(name, indexes) {
    let max = indexes.size - 1;
    // recurse into nested containers
    let next = (b, i) => {
      let h = handle(b),
        idx = indexes.get(i);
      return i == max
        ? h.getindex.call(this.ctx, b, idx)
        : next(h.getindex.call(this.ctx, b, idx), i + 1);
    };

    return next(this.get(name), 0);
  }

  setIndex(name, indexes, value) {
    let max = indexes.size - 1;
    // recurse into nested containers
    let next = (b, i) => {
      let h = handle(b),
        idx = indexes.get(i);
      return i == max
        ? h.setindex.call(this.ctx, b, idx, value)
        : h.setindex.call(
            this.ctx,
            b,
            idx,
            next(h.getindex.call(this.ctx, b, idx), i + 1)
          );
    };

    this.set(name, next(this.get(name), 0));
  }

  // ** implementations of AST nodes **

  blockNode(node, state, frame) {
    let { count } = frame;
    if (count < node.elems.length) {
      frame.count++;
      return node.elems[count];
    } else {
      return pop;
    }
  }

  repeatNode(node, state, frame) {
    switch (state) {
      case 0:
        if (node.times) {
          frame.state = 1;
          return node.times;
        } else {
          frame.state = 3;
          break;
        }
      case 1:
        frame.state = 2;
        frame.times = this.result.rv;
        break;
      case 2:
        let { count } = frame;
        if (count < frame.times) {
          frame.count++;
          return node.body;
        } else {
          return pop;
        }
      case 3:
        // repeat forever
        return node.body;
    }
  }

  forNode(node, state, frame) {
    switch (state) {
      case 0:
        frame.state = 1;
        return node.from;
      case 1:
        let res = this.result.rv;
        frame.state = 2;
        frame.from = res;
        frame.count = res;
        return node.to;
      case 2:
        if (node.by) {
          frame.state = 3;
          frame.to = this.result.rv;
          return node.by;
        } else {
          frame.state = 4;
          frame.to = this.result.rv;
          break;
        }
      case 3:
        frame.state = 4;
        frame.by = this.result.rv;
        break;
      case 4:
        let { count, to, by } = frame;
        if ((by > 0 && count <= to) || (by < 0 && count >= to)) {
          this.set(node.name, count);
          frame.count += by;
          return node.body;
        } else {
          return pop;
        }
    }
  }

  forInNode(node, state, frame) {
    switch (state) {
      case 0:
        frame.state = 1;
        return node.range;
      case 1:
        frame.state = 2;
        frame.iter = this.ctx.enumerate(this.result.rv);
        break;
      case 2:
        let { iter } = frame;
        if (iter.more) {
          this.set(node.name, iter.value);
          // TODO: iteration should allow async
          frame.iter = iter.next();
          return node.body;
        } else {
          return pop;
        }
    }
  }

  whileNode(node, state, frame) {
    switch (state) {
      case 0:
        frame.state = 1;
        return node.cond;
      case 1:
        if (this.result.rv) {
          frame.state = 0;
          return node.body;
        } else {
          return pop;
        }
    }
  }

  ifNode(node, state, frame) {
    switch (state) {
      case 0:
        frame.state = 1;
        return node.cond;
      case 1:
        if (this.result.rv) {
          frame.state = 2;
          return node.tbody;
        } else if (node.fbody) {
          frame.state = 2;
          return node.fbody;
        } else {
          return pop;
        }
      case 2:
        return pop;
    }
  }

  beginNode(node) {
    // save the begin node in the function table
    this.fn = this.fn.set(node.name, node);
    return pop;
  }

  callNode(node, state, frame) {
    switch (state) {
      case 0:
        let { count } = frame;
        if (node.args && count < node.args.length) {
          frame.state = 1;
          return node.args[count];
        } else if (this.fn.has(node.name)) {
          frame.state = 2;
          break;
        } else {
          frame.state = 4;
          break;
        }
      case 1:
        let res = this.result;
        frame.state = 0;
        frame.args = frame.args.push(res.rv);
        frame.assn = frame.assn.push(res.lv);
        frame.count++;
        break;
      case 2:
        // handle a user-defined function
        let fn = this.fn.get(node.name);
        // push on a new namespace
        this.pushns();
        // set the arguments in the local ns
        if (fn.params) {
          for (let i = 0; i < fn.params.length; ++i) {
            this.set(fn.params[i], frame.args.get(i), true);
          }
        }
        frame.state = 3;
        frame.ns = true;
        return fn.body;
      case 3:
        return pop;
      case 4:
        // handle a runtime API function
        let result = this.ctx.syscall(node.name, frame.args.toArray());
        if (result && result.then) {
          // if we got a promise, handle the result when fulfilled
          return result.then(result => {
            this.handleResult(result, frame.assn);
            return pop;
          });
        } else {
          this.handleResult(result, frame.assn);
          return pop;
        }
    }
  }

  handleResult(res, assn) {
    // handle the result of a runtime function
    if (res) {
      let repl = res[assignKey],
        i,
        r,
        a;
      if (repl) {
        // if this result contains replacement args, assign them
        if (!Array.isArray(repl)) {
          repl = [repl];
        }
        // loop over replacement args
        for (i = 0; i < repl.length; ++i) {
          r = repl[i];
          if (r !== undefined) {
            // we have a replacement for this slot
            if ((a = assn.get(i))) {
              // this slot can be assigned to
              if (a.indexes) {
                this.setIndex(a.name, a.indexes, r);
              } else {
                this.set(a.name, r);
              }
            }
          }
        }
        // grab an explicit result, or the first replacement
        res = res[resultKey] || repl[0];
      }
    }
    // put it in the result register
    this.replace(res);
  }

  exitNode() {
    return { pop: 'exit' };
  }

  breakNode() {
    return { pop: 'over', flow: 'loop' };
  }

  nextNode() {
    return { pop: 'until', flow: 'loop' };
  }

  returnNode(node, state, frame) {
    switch (state) {
      case 0:
        if (node.result) {
          frame.state = 1;
          return node.result;
        } else {
          this.replace();
          return { pop: 'over', flow: 'call' };
        }
      case 1:
        this.replace(this.result.rv);
        return { pop: 'over', flow: 'call' };
    }
  }

  literalNode(node) {
    this.replace(node.value);
    return pop;
  }

  varNode(node) {
    // return the rv/lv pair for this var
    this.replace({
      rv: this.get(node.name),
      lv: { name: node.name },
    });
    return pop;
  }

  letNode(node, state, frame) {
    switch (state) {
      case 0:
        frame.state = 1;
        return node.value;
      case 1:
        this.set(node.name, this.result.rv, node.top);
        return pop;
    }
  }

  indexNode(node, state, frame) {
    switch (state) {
      case 0:
        let { count } = frame;
        if (count < node.indexes.length) {
          frame.state = 1;
          return node.indexes[count];
        } else {
          frame.state = 2;
          break;
        }
      case 1:
        frame.state = 0;
        frame.indexes = frame.indexes.push(this.result.rv);
        frame.count++;
        break;
      case 2:
        let { indexes } = frame;
        // return the rv/lv pair for this slot
        this.replace({
          rv: this.getIndex(node.name, indexes),
          lv: { name: node.name, indexes },
        });
        return pop;
    }
  }

  letIndexNode(node, state, frame) {
    switch (state) {
      case 0:
        let { count } = frame;
        if (count < node.indexes.length) {
          frame.state = 1;
          return node.indexes[count];
        } else {
          frame.state = 2;
          break;
        }
      case 1:
        frame.state = 0;
        frame.indexes = frame.indexes.push(this.result.rv);
        frame.count++;
        break;
      case 2:
        frame.state = 3;
        return node.value;
      case 3:
        this.setIndex(node.name, frame.indexes, this.result.rv);
        return pop;
    }
  }

  logicalOpNode(node, state, frame) {
    switch (node.op) {
      case 'and':
        switch (state) {
          case 0:
            frame.state = 1;
            return node.left;
          case 1:
            if (!this.result.rv) {
              this.replace(false);
              return pop;
            } else {
              frame.state = 2;
              return node.right;
            }
          case 2:
            this.replace(!!this.result.rv);
            return pop;
        }
        break;

      case 'or':
        switch (state) {
          case 0:
            frame.state = 1;
            return node.left;
          case 1:
            if (this.result.rv) {
              this.replace(true);
              return pop;
            } else {
              frame.state = 2;
              return node.right;
            }
          case 2:
            this.replace(!!this.result.rv);
            return pop;
        }
        break;

      case 'not':
        switch (state) {
          case 0:
            frame.state = 1;
            return node.right;
          case 1:
            this.replace(!this.result.rv);
            return pop;
        }
        break;
    }
  }

  binaryOpNode(node, state, frame) {
    switch (state) {
      case 0:
        frame.state = 1;
        return node.left;
      case 1:
        frame.state = 2;
        frame.left = this.result.rv;
        return node.right;
      case 2:
        this.replace(this.ctx.binaryop(node.op, frame.left, this.result.rv));
        return pop;
    }
  }

  unaryOpNode(node, state, frame) {
    switch (state) {
      case 0:
        frame.state = 1;
        return node.right;
      case 1:
        this.replace(this.ctx.unaryop(node.op, this.result.rv));
        return pop;
    }
  }
}
