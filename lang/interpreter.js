'use strict';

import immutable from 'immutable';
import { createRuntime } from './runtime';

let hop = Object.prototype.hasOwnProperty; // cache this for performance

export const SFrame = immutable.Record({
  node: null,         // node for this evaluation frame
  ns: false,          // whether to pop a ns off the stack for this frame
  state: 0,           // evaluation state machine state
  ws: immutable.Map() // evalutaion workspace
});

export class SInterpreter {
  constructor() {
    this.ctx = createRuntime();       // runtime
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

  replace(result) {
    // normalize the result to rvalue/lvalue form if necessary
    if (result == null || !hop.call(result, 'rv')) {
      result = { rv: result };
    }
    // put the return value into the result register
    this.result = result;
  }

  pop() {
    // pop this frame off the stack
    this.frame = this.fst.first();
    this.fst = this.fst.pop();
  }

  popUntil(flow, includeSelf) {
    if (includeSelf) {
      // pop frames off until hitting a loop or function call node
      while (this.frame) {
        let { node } = this.frame;
        // pop the frame itself
        this.frame = this.fst.first();
        this.fst = this.fst.pop();
        // break here if we're popping the target frame
        if (node.flow == flow) {
          break;
        }
      }
    } else {
      // pop frames off until hitting a loop or function call node
      while (this.frame) {
        let { node } = this.frame;
        // break here if we're not popping the target frame
        if (node.flow == flow) {
          break;
        }
        // pop the frame itself
        this.frame = this.fst.first();
        this.fst = this.fst.pop();
      }
    }
  }

  goto(state, xform) {
    // update the current frame's state and workspace
    if (state != null) {
      this.frame = this.frame.set('state', state);
    }
    if (xform) {
      this.frame = this.frame.set('ws', xform(this.frame.ws));
    }
  }

  // ** namespace access **

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

  set(name, value) {
    // look in the top frame
    if (this.st.size == 0 || (this.ns.size > 0 && this.ns.has(name))) {
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

  getindex(name, indexes) {
    let max = indexes.length - 1,
        // recurse into nested containers
        next = (b, i) => {
          let h = this.ctx.handle(b), idx = indexes[i];
          return (i == max) ?
                    h.getindex(b, idx) :
                    next(h.getindex(b, idx), i + 1);
        };

    return next(this.get(name), 0);
  }

  setindex(name, indexes, value) {
    let max = indexes.length - 1,
        // recurse into nested containers
        next = (b, i) => {
          let h = this.ctx.handle(b), idx = indexes[i];
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
      this.goto(null, (ws) => ws.set('count', count + 1));
      this.push(node.elems[count]);
    } else {
      this.pop();
    }
  }

  repeatNode(node, state, ws) {
    switch (state) {
      case 0:
        if (node.times) {
          this.goto(1);
          this.push(node.times);
        } else {
          this.goto(3);
        }
        break;
      case 1:
        this.goto(2, (ws) => ws.set('times', this.result.rv).set('count', 0));
        break;
      case 2:
        let count = ws.get('count');
        if (count < ws.get('times')) {
          this.goto(null, (ws) => ws.set('count', count + 1));
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
        this.goto(1);
        this.push(node.from);
        break;
      case 1:
        let res = this.result.rv;
        this.goto(2, (ws) => ws.set('from', res).set('count', res));
        this.push(node.to);
        break;
      case 2:
        if (node.by) {
          this.goto(3, (ws) => ws.set('to', this.result.rv));
          this.push(node.by);
        } else {
          this.goto(4, (ws) => ws.set('to', this.result.rv).set('by', 1));
        }
        break;
      case 3:
        this.goto(4, (ws) => ws.set('by', this.result.rv));
        break;
      case 4:
        let count = ws.get('count');
        if (count <= ws.get('to')) {
          this.set(node.name, count);
          this.goto(null, (ws) => ws.set('count', count + ws.get('by')));
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
        this.goto(1);
        this.push(node.range);
        break;
      case 1:
        this.goto(2, (ws) => ws.set('iter', this.ctx.enumerate(this.result.rv)));
        break;
      case 2:
        let iter = ws.get('iter');
        if (iter.more) {
          this.set(node.name, iter.value);
          // TODO: iteration should allow async
          this.goto(null, (ws) => ws.set('iter', iter.next()));
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
        this.goto(1);
        this.push(node.cond);
        break;
      case 1:
        if (this.result.rv) {
          this.goto(0);
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
        this.goto(1);
        this.push(node.cond);
        break;
      case 1:
        if (this.result.rv) {
          this.goto(2);
          this.push(node.tbody);
        } else if (node.fbody) {
          this.goto(2);
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
        let l = immutable.List();
        this.goto(1, (ws) =>
          ws.set('args', l)
            .set('assn', l)
            .set('count', 0));
        break;
      case 1:
        let count = ws.get('count');
        if (node.args && count < node.args.length) {
          this.goto(2);
          this.push(node.args[count]);
        } else if (this.fn.has(node.name)) {
          this.goto(3);
        } else {
          this.goto(5);
        }
        break;
      case 2:
        let res = this.result;
        this.goto(1, (ws) =>
          ws.update('args', (args) => args.push(res.rv))
            .update('assn', (assn) => assn.push(res.lv))
            .update('count', (count) => count + 1));
        break;
      case 3:
        // handle a user-defined function
        let fn = this.fn.get(node.name);
        let args = ws.get('args');
        if (fn.params) {
          for (let i = 0; i < fn.params.length; ++i) {
            this.set(fn.params[i], args.get(i));
          }
        }
        this.goto(4);
        this.push(fn.body);
        break;
      case 4:
        this.pop();
        break;
      case 5:
        // handle a runtime API function
        let result = this.ctx.syscall(
                        node.name,
                        ws.get('args').toArray(),
                        ws.get('assn').toArray());
        if (result instanceof Promise) {
          // if we got a promise, handle the result when fulfilled
          return result.then((result) => {
            this.replace(result);
            this.pop();
          });
        } else {
          this.replace(result);
          this.pop();
        }
        break;
    }
  }

  exitNode() {
    // clear the stack so the program exits
    this.frame = null;
    this.fst = this.fst.clear();
  }

  breakNode() {
    this.popUntil('loop', true);
  }

  nextNode() {
    this.popUntil('loop', false);
  }

  returnNode(node, state, ws) {
    switch (state) {
      case 0:
        if (node.result) {
          this.goto(1);
          this.push(node.result);
        } else {
          this.replace();
          this.popUntil('call', true);
        }
        break;
      case 1:
        this.replace(this.result.rv);
        this.popUntil('call', true);
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
        this.goto(1);
        this.push(node.value);
        break;
      case 1:
        this.set(node.name, this.result.rv);
        // return the rv/lv pair for this assignment
        this.replace({
          rv: this.result.rv,
          lv: { name: node.name }
        });
        this.pop();
        break;
    }
  }

  indexNode(node, state, ws) {
    switch (state) {
      case 0:
        this.goto(1, (ws) =>
          ws.set('indexes', immutable.List())
            .set('count', 0));
        break;
      case 1:
        let count = ws.get('count');
        if (count < node.indexes.length) {
          this.goto(2);
          this.push(node.indexes[count]);
        } else {
          this.goto(3);
        }
        break;
      case 2:
        this.goto(1, (ws) =>
          ws.update('indexes', (indexes) => indexes.push(this.result.rv))
            .update('count', (count) => count + 1));
        break;
      case 3:
        let indexes = ws.get('indexes').toArray();
        // return the rv/lv pair for this slot
        this.replace({
          rv: this.getindex(node.name, indexes),
          lv: { name: node.name, indexes: indexes }
        });
        this.pop();
        break;
    }
  }

  letIndexNode(node, state, ws) {
    switch (state) {
      case 0:
        this.goto(1, (ws) =>
          ws.set('indexes', immutable.List())
            .set('count', 0));
        break;
      case 1:
        let count = ws.get('count');
        if (count < node.indexes.length) {
          this.goto(2);
          this.push(node.indexes[count]);
        } else {
          this.goto(3);
        }
        break;
      case 2:
        this.goto(1, (ws) =>
          ws.update('indexes', (indexes) => indexes.push(this.result.rv))
            .update('count', (count) => count + 1));
        break;
      case 3:
        this.goto(4);
        this.push(node.value);
        break;
      case 4:
        let indexes = ws.get('indexes').toArray();
        this.setindex(node.name, indexes, this.result.rv);
        // return the rv/lv pair for this assignment
        this.replace({
          rv: this.result.rv,
          lv: { name: node.name, indexes: indexes }
        });
        this.pop();
        break;
    }
  }

  logicalOpNode(node, state, ws) {
    switch (node.op) {
      case 'and':
        switch (state) {
          case 0:
            this.goto(1);
            this.push(node.left);
            break;
          case 1:
            if (!this.result.rv) {
              this.replace(false);
              this.pop();
            } else {
              this.goto(2);
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
            this.goto(1);
            this.push(node.left);
            break;
          case 1:
            if (this.result.rv) {
              this.replace(true);
              this.pop();
            } else {
              this.goto(2);
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
            this.goto(1);
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
        this.goto(1);
        this.push(node.left);
        break;
      case 1:
        this.goto(2, (ws) => ws.set('left', this.result.rv));
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
        this.goto(1);
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
