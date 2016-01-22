'use strict';

import immutable from 'immutable';
import { handle, assignKey, resultKey } from './runtime';

let hop = Object.prototype.hasOwnProperty; // cache this for performance

export const SFrame = immutable.Record({
  node: null,         // node for this evaluation frame
  ns: false,          // whether to pop a ns off the stack for this frame
  state: 0,           // evaluation state machine state
  ws: immutable.Map() // evalutaion workspace
});

export class SInterpreter {
  constructor() {
    // setup the internal state
    this.fn = immutable.OrderedMap(); // function table
    this.ns = immutable.OrderedMap(); // top namespace
    this.st = immutable.Stack();      // namespace stack
    // set an empty result value
    this.replace();
  }

  set root(node) {
    // push on the root node and global namespace
    this.frame = SFrame({ node });
    this.fst = immutable.Stack();
  }

  set runtime(ctx) {
    // set a reference to the runtime context
    this.ctx = ctx;
  }

  run() {
    // set up an entry point that loops until the stack is exhausted, or
    // until a node returns a promise
    let loop = () => {
      while (this.frame) {
        let { node, state, ws } = this.frame;
        let result = this[`${node.type}Node`](node, state, ws);
        if (result instanceof Promise) {
          return result.then(loop);
        }
      }
    };

    // return a promise for the eventual termination of the loop
    return new Promise((resolve) => {
      resolve(loop());
    });
  }

  // ** manage stack frames **

  push(node) {
    // optimize literals and vars by setting the result register directly
    if (node.type == 'literal') {
      this.replace(node.value);
    } else if (node.type == 'var') {
      // return the rv/lv pair for this assignment
      this.replace({
        rv: this.get(node.name),
        lv: { name: node.name }
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

  replace(result) {
    // normalize the result to rvalue/lvalue form if necessary
    if (result == null || !hop.call(result, 'rv')) {
      result = { rv: result };
    }
    // put the return value into the result register
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
    let ns = this.st.find((ns) => ns.size > 0 && ns.has(name));
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
    this.st = this.st.withMutations((st) => {
      let saved = new Array(st.size), i = 0, ns;
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
    let max = indexes.size - 1,
        // recurse into nested containers
        next = (b, i) => {
          let h = handle(b), idx = indexes.get(i);
          return (i == max) ?
                    h.getindex(b, idx) :
                    next(h.getindex(b, idx), i + 1);
        };

    return next(this.get(name), 0);
  }

  setIndex(name, indexes, value) {
    let max = indexes.size - 1,
        // recurse into nested containers
        next = (b, i) => {
          let h = handle(b), idx = indexes.get(i);
          return (i == max) ?
                    h.setindex(b, idx, value) :
                    h.setindex(b, idx, next(h.getindex(b, idx), i + 1));
        };

    this.set(name, next(this.get(name), 0));
  }

  // ** implementations of AST nodes **

  blockNode(node, state, ws) {
    let count = ws.get('count', 0);
    if (count < node.elems.length) {
      this.frame = this.frame
        .set('ws', ws
          .set('count', count + 1));
      this.push(node.elems[count]);
    } else {
      this.pop();
    }
  }

  repeatNode(node, state, ws) {
    switch (state) {
      case 0:
        if (node.times) {
          this.frame = this.frame.set('state', 1);
          this.push(node.times);
        } else {
          this.frame = this.frame.set('state', 3);
        }
        break;
      case 1:
        this.frame = this.frame
          .set('state', 2)
          .set('ws', ws
            .set('times', this.result.rv)
            .set('count', 0));
        break;
      case 2:
        let count = ws.get('count');
        if (count < ws.get('times')) {
          this.frame = this.frame
            .set('ws', ws
              .set('count', count + 1));
          this.push(node.body);
        } else {
          this.pop();
        }
        break;
      case 3:
        // repeat forever
        this.push(node.body);
        break;
    }
  }

  forNode(node, state, ws) {
    switch (state) {
      case 0:
        this.frame = this.frame.set('state', 1);
        this.push(node.from);
        break;
      case 1:
        let res = this.result.rv;
        this.frame = this.frame
          .set('state', 2)
          .set('ws', ws
            .set('from', res).set('count', res));
        this.push(node.to);
        break;
      case 2:
        if (node.by) {
          this.frame = this.frame
            .set('state', 3)
            .set('ws', ws
              .set('to', this.result.rv));
          this.push(node.by);
        } else {
          this.frame = this.frame
            .set('state', 4)
            .set('ws', ws
              .set('to', this.result.rv)
              .set('by', 1));
        }
        break;
      case 3:
        this.frame = this.frame
          .set('state', 4)
          .set('ws', ws
            .set('by', this.result.rv));
        break;
      case 4:
        let count = ws.get('count');
        if (count <= ws.get('to')) {
          this.set(node.name, count);
          this.frame = this.frame
            .set('ws', ws
              .set('count', count + ws.get('by')));
          this.push(node.body);
        } else {
          this.pop();
        }
        break;
    }
  }

  forInNode(node, state, ws) {
    switch (state) {
      case 0:
        this.frame = this.frame.set('state', 1);
        this.push(node.range);
        break;
      case 1:
        this.frame = this.frame
          .set('state', 2)
          .set('ws', ws
            .set('iter', this.ctx.enumerate(this.result.rv)));
        break;
      case 2:
        let iter = ws.get('iter');
        if (iter.more) {
          this.set(node.name, iter.value);
          // TODO: iteration should allow async
          this.frame = this.frame
            .set('ws', ws
              .set('iter', iter.next()));
          this.push(node.body);
        } else {
          this.pop();
        }
        break;
    }
  }

  whileNode(node, state, ws) {
    switch (state) {
      case 0:
        this.frame = this.frame.set('state', 1);
        this.push(node.cond);
        break;
      case 1:
        if (this.result.rv) {
          this.frame = this.frame.set('state', 0);
          this.push(node.body);
        } else {
          this.pop();
        }
        break;
    }
  }

  ifNode(node, state, ws) {
    switch (state) {
      case 0:
        this.frame = this.frame.set('state', 1);
        this.push(node.cond);
        break;
      case 1:
        if (this.result.rv) {
          this.frame = this.frame.set('state', 2);
          this.push(node.tbody);
        } else if (node.fbody) {
          this.frame = this.frame.set('state', 2);
          this.push(node.fbody);
        } else {
          this.pop();
        }
        break;
      case 2:
        this.pop();
        break;
    }
  }

  beginNode(node) {
    // save the begin node in the function table
    this.fn = this.fn.set(node.name, node);
    this.pop();
  }

  callNode(node, state, ws) {
    switch (state) {
      case 0:
        this.frame = this.frame
          .set('state', 1)
          .set('ws', ws
            .set('args', immutable.List())
            .set('assn', immutable.List())
            .set('count', 0));
        break;
      case 1:
        let count = ws.get('count');
        if (node.args && count < node.args.length) {
          this.frame = this.frame.set('state', 2);
          this.push(node.args[count]);
        } else if (this.fn.has(node.name)) {
          this.frame = this.frame.set('state', 3);
        } else {
          this.frame = this.frame.set('state', 5);
        }
        break;
      case 2:
        let res = this.result;
        this.frame = this.frame
          .set('state', 1)
          .set('ws', ws
            .update('args', (args) => args.push(res.rv))
            .update('assn', (assn) => assn.push(res.lv))
            .update('count', (count) => count + 1));
        break;
      case 3:
        // handle a user-defined function
        let fn = this.fn.get(node.name),
            args = ws.get('args');
        // push on a new namespace
        this.pushns();
        // set the arguments in the local ns
        if (fn.params) {
          for (let i = 0; i < fn.params.length; ++i) {
            this.set(fn.params[i], args.get(i), true);
          }
        }
        this.frame = this.frame
          .set('state', 4)
          .set('ns', true);
        this.push(fn.body);
        break;
      case 4:
        this.pop();
        break;
      case 5:
        // handle a runtime API function
        let args5 = ws.get('args'),
            assn5 = ws.get('assn'),
            result = this.ctx.syscall(node.name, args5.toArray());
        if (result instanceof Promise) {
          // if we got a promise, handle the result when fulfilled
          return result.then((result) => {
            this.handleResult(result, assn5);
            this.pop();
          });
        } else {
          this.handleResult(result, assn5);
          this.pop();
        }
        break;
    }
  }

  handleResult(res, assn) {
    // handle the result of a runtime function
    if (res) {
      let repl = res[assignKey], i, r, a;
      if (repl) {
        // if this result contains replacement args, assign them
        if (!Array.isArray(repl)) {
          repl = [ repl ];
        }
        // loop over replacement args
        for (i = 0; i < repl.length; ++i) {
          r = repl[i];
          if (r !== undefined) {
            // we have a replacement for this slot
            if (a = assn.get(i)) {
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
    // clear the stack so the program exits
    this.frame = null;
    this.fst = this.fst.clear();
  }

  breakNode() {
    this.popOver('loop');
  }

  nextNode() {
    this.popUntil('loop');
  }

  returnNode(node, state, ws) {
    switch (state) {
      case 0:
        if (node.result) {
          this.frame = this.frame.set('state', 1);
          this.push(node.result);
        } else {
          this.replace();
          this.popOver('call');
        }
        break;
      case 1:
        this.replace(this.result.rv);
        this.popOver('call');
        break;
    }
  }

  literalNode(node, state, ws) {
    this.replace(node.value);
    this.pop();
  }

  varNode(node, state, ws) {
    // return the rv/lv pair for this var
    this.replace({
      rv: this.get(node.name),
      lv: { name: node.name }
    });
    this.pop();
  }

  letNode(node, state, ws) {
    switch (state) {
      case 0:
        this.frame = this.frame.set('state', 1);
        this.push(node.value);
        break;
      case 1:
        this.set(node.name, this.result.rv);
        this.pop();
        break;
    }
  }

  indexNode(node, state, ws) {
    switch (state) {
      case 0:
        this.frame = this.frame
          .set('state', 1)
          .set('ws', ws
            .set('indexes', immutable.List())
            .set('count', 0));
        break;
      case 1:
        let count = ws.get('count');
        if (count < node.indexes.length) {
          this.frame = this.frame.set('state', 2);
          this.push(node.indexes[count]);
        } else {
          this.frame = this.frame.set('state', 3);
        }
        break;
      case 2:
        this.frame = this.frame
          .set('state', 1)
          .set('ws', ws
            .update('indexes', (indexes) => indexes.push(this.result.rv))
            .update('count', (count) => count + 1));
        break;
      case 3:
        let indexes = ws.get('indexes');
        // return the rv/lv pair for this slot
        this.replace({
          rv: this.getIndex(node.name, indexes),
          lv: { name: node.name, indexes: indexes }
        });
        this.pop();
        break;
    }
  }

  letIndexNode(node, state, ws) {
    switch (state) {
      case 0:
        this.frame = this.frame
          .set('state', 1)
          .set('ws', ws
            .set('indexes', immutable.List())
            .set('count', 0));
        break;
      case 1:
        let count = ws.get('count');
        if (count < node.indexes.length) {
          this.frame = this.frame.set('state', 2);
          this.push(node.indexes[count]);
        } else {
          this.frame = this.frame.set('state', 3);
        }
        break;
      case 2:
        this.frame = this.frame
          .set('state', 1)
          .set('ws', ws
            .update('indexes', (indexes) => indexes.push(this.result.rv))
            .update('count', (count) => count + 1));
        break;
      case 3:
        this.frame = this.frame.set('state', 4);
        this.push(node.value);
        break;
      case 4:
        let indexes = ws.get('indexes');
        this.setIndex(node.name, indexes, this.result.rv);
        this.pop();
        break;
    }
  }

  logicalOpNode(node, state, ws) {
    switch (node.op) {
      case 'and':
        switch (state) {
          case 0:
            this.frame = this.frame.set('state', 1);
            this.push(node.left);
            break;
          case 1:
            if (!this.result.rv) {
              this.replace(false);
              this.pop();
            } else {
              this.frame = this.frame.set('state', 2);
              this.push(node.right);
            }
            break;
          case 2:
            this.replace(!!this.result.rv);
            this.pop();
            break;
        }
        break;

      case 'or':
        switch (state) {
          case 0:
            this.frame = this.frame.set('state', 1);
            this.push(node.left);
            break;
          case 1:
            if (this.result.rv) {
              this.replace(true);
              this.pop();
            } else {
              this.frame = this.frame.set('state', 2);
              this.push(node.right);
            }
            break;
          case 2:
            this.replace(!!this.result.rv);
            this.pop();
            break;
        }
        break;

      case 'not':
        switch (state) {
          case 0:
            this.frame = this.frame.set('state', 1);
            this.push(node.right);
            break;
          case 1:
            this.replace(!this.result.rv);
            this.pop();
            break;
        }
        break;
    }
  }

  binaryOpNode(node, state, ws) {
    switch (state) {
      case 0:
        this.frame = this.frame.set('state', 1);
        this.push(node.left);
        break;
      case 1:
        this.frame = this.frame
          .set('state', 2)
          .set('ws', ws
            .set('left', this.result.rv));
        this.push(node.right);
        break;
      case 2:
        this.replace(this.ctx.binaryop(
          node.op,
          ws.get('left'),
          this.result.rv));
        this.pop();
        break;
    }
  }

  unaryOpNode(node, state, ws) {
    switch (state) {
      case 0:
        this.frame = this.frame.set('state', 1);
        this.push(node.right);
        break;
      case 1:
        this.replace(this.ctx.unaryop(
          node.op,
          this.result.rv));
        this.pop();
        break;
    }
  }
}

export function createInterpreter(root, ctx) {
  return new SInterpreter(root, ctx);
}
