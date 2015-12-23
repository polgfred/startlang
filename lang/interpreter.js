'use strict';

import immutable from 'immutable';

let hasOwnProperty = Object.prototype.hasOwnProperty; // cache this for performance

export const Frame = immutable.Record({
  node: null,
  state: 0,
  ws: immutable.OrderedMap()
});

export class SInterpreter {
  constructor(root, ctx) {
    this.root = root; // root of the program ast
    this.ctx = ctx; // the Runtime instance
  }

  run() {
    // push on the root node and kick off the run loop
    this.fst = immutable.Stack();
    this.frame = new Frame({ node: this.root });
    return this.loop();
  }

  loop() {
    // return a promise for the eventual termination of the loop - if any node
    // function returns a promise, chain on a new promise to reenter the loop
    // when it settles
    return Promise.resolve().then(() => {
      while (this.frame) {
        let { node, state, ws } = this.frame;
        let result = this[`${node.type}Node`](node, state, ws);
        if (result instanceof Promise) {
          // bail out and re-enter the loop when the promise settles
          return result.then(() => {
            return this.loop();
          });
        }
      }
    });
  }

  push(node) {
    // optimize literals and vars by setting the result register directly
    if (node.type == 'literal') {
      this.result = { rv: node.value };
    } else if (node.type == 'var') {
      this.result = { rv: this.ctx.get(node.name), lv: { name: node.name } };
    } else {
      // push a new frame onto the stack for this node
      this.fst = this.fst.push(this.frame);
      this.frame = new Frame({ node });
    }
  }

  pop(result) {
    if (result !== undefined) {
      // if the node returns a plain value, convert it to an rvalue
      if (result == null || !hasOwnProperty.call(result, 'rv')) {
        result = { rv: result };
      }
      // put the return value into the result register
      this.result = result;
    }
    // pop this frame off the stack
    this.frame = this.fst.first();
    this.fst = this.fst.pop();
  }

  goto(state, mut) {
    // atomically update the current frame's state and workspace
    this.frame = this.frame.withMutations((frame) => {
      if (state != null) {
        frame.set('state', state);
      }
      if (mut) {
        frame.set('ws', frame.ws.withMutations(mut));
      }
    });
  }

  // ** implementations of AST nodes **

  blockNode(node, state, ws) {
    switch (state) {
      case 0:
        this.goto(1, (ws) => {
          ws.set('count', 0);
        });
        break;
      case 1:
        let count = ws.get('count');
        if (count < node.elems.length) {
          this.goto(2, (ws) => {
            ws.set('count', count + 1);
          });
          this.push(node.elems[count]);
        } else {
          this.pop();
        }
        break;
      case 2:
        if (this.result.flow) {
          this.pop();
        } else {
          this.goto(1);
        }
        break;
    }
  }

  repeatNode(node, state, ws) {
    switch (state) {
      case 0:
        this.goto(1);
        this.push(node.times);
        break;
      case 1:
        this.goto(2, (ws) => {
          ws.set('times', this.result.rv);
          ws.set('count', 0);
        });
        break;
      case 2:
        let count = ws.get('count');
        if (count < ws.get('times')) {
          this.goto(3, (ws) => {
            ws.set('count', count + 1);
          });
          this.push(node.body);
        } else {
          this.pop();
        }
        break;
      case 3:
        let flow = this.result.flow;
        if (!flow || flow == 'next') {
          this.goto(2);
        } else if (flow == 'break') {
          this.pop({ rv: this.result.rv });
        } else {
          this.pop();
        }
        break;
    }
  }

  countNode(node, state, ws) {
    switch (state) {
      case 0:
        this.goto(1);
        this.push(node.from);
        break;
      case 1:
        this.goto(2, (ws) => {
          ws.set('from', this.result.rv);
          ws.set('count', this.result.rv);
        });
        this.push(node.to);
        break;
      case 2:
        if (node.by) {
          this.goto(3, (ws) => {
            ws.set('to', this.result.rv);
          });
          this.push(node.by);
        } else {
          this.goto(4, (ws) => {
            ws.set('to', this.result.rv);
            ws.set('by', 1);
          });
        }
        break;
      case 3:
        this.goto(4, (ws) => {
          ws.set('by', this.result.rv);
        });
        break;
      case 4:
        let count = ws.get('count');
        if (count <= ws.get('to')) {
          this.ctx.set(node.name, count);
          this.goto(5);
          this.push(node.body);
        } else {
          this.pop();
        }
        break;
      case 5:
        let flow = this.result.flow;
        if (!flow || flow == 'next') {
          this.goto(4, (ws) => {
            ws.update('count', (count) => count + ws.get('by'));
          });
        } else if (flow == 'break') {
          this.pop({ rv: this.result.rv });
        } else {
          this.pop();
        }
        break;
    }
  }

  forNode(node, state, ws) {
    switch (state) {
      case 0:
        this.goto(1);
        this.push(node.range);
        break;
      case 1:
        this.goto(2, (ws) => {
          ws.set('iter', this.ctx.enumerate(this.result.rv));
        });
        break;
      case 2:
        let iter = ws.get('iter');
        if (iter.more) {
          this.ctx.set(node.name, iter.value);
          this.goto(3);
          this.push(node.body);
        } else {
          this.pop();
        }
        break;
      case 3:
        let flow = this.result.flow;
        if (!flow || flow == 'next') {
          this.goto(2, (ws) => {
            // TODO: iteration should allow async
            ws.update('iter', (iter) => iter.next());
          });
        } else if (flow == 'break') {
          this.pop({ rv: this.result.rv });
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
          this.goto(2);
          this.push(node.body);
        } else {
          this.pop();
        }
        break;
      case 2:
        let flow = this.result.flow;
        if (!flow || flow == 'next') {
          this.goto(0);
        } else if (flow == 'break') {
          this.pop({ rv: this.result.rv });
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
        this.goto(2, (ws) => {
          ws.set('cond', this.result.rv);
        });
        break;
      case 2:
        this.goto(3);
        if (ws.get('cond')) {
          this.push(node.tbody);
        } else if (node.fbody) {
          this.push(node.fbody);
        }
        break;
      case 3:
        this.pop();
        break;
    }
  }

  beginNode(node) {
    // save the begin node in the function table
    this.ctx.setfn(node.name, node);
    this.pop();
  }

  callNode(node, state, ws) {
    switch (state) {
      case 0:
        this.goto(1, (ws) => {
          ws.set('args', immutable.List());
          ws.set('assn', immutable.List());
          ws.set('count', 0);
        });
        break;
      case 1:
        let count = ws.get('count');
        if (node.args && count < node.args.length) {
          this.goto(2);
          this.push(node.args[count]);
        } else if (this.ctx.getfn(node.name)) {
          this.goto(3);
        } else {
          this.goto(5);
        }
        break;
      case 2:
        this.goto(1, (ws) => {
          ws.update('args', (args) => args.push(this.result.rv));
          ws.update('assn', (assn) => assn.push(this.result.lv));
          ws.update('count', (count) => count + 1);
        });
        break;
      case 3:
        // handle a user-defined function
        let fn = this.ctx.getfn(node.name);
        let args = ws.get('args');
        this.ctx.push();
        if (fn.params) {
          for (let i = 0; i < fn.params.length; ++i) {
            this.ctx.set(fn.params[i], args.get(i));
          }
        }
        this.goto(4);
        this.push(fn.body);
        break;
      case 4:
        this.ctx.pop();
        this.pop();
        break;
      case 5:
        // handle a runtime API function
        let result = this.ctx.syscall(
                        node.name,
                        ws.get('args').toArray(),
                        ws.get('assn').toArray());
        if (result instanceof Promise) {
          // if we got a promise, pop the result when it gets resolved
          return result.then((result) => {
            this.pop(result);
          });
        } else {
          this.pop(result);
        }
        break;
    }
  }

  exitNode() {
    this.pop({ rv: undefined, flow: 'exit' });
  }

  breakNode() {
    this.pop({ rv: undefined, flow: 'break' });
  }

  nextNode() {
    this.pop({ rv: undefined, flow: 'next' });
  }

  returnNode(node, state, ws) {
    switch (state) {
      case 0:
        if (node.result) {
          this.goto(1);
          this.push(node.result);
        } else {
          this.pop({ rv: undefined, flow: 'return' });
        }
        break;
      case 1:
        this.pop({ rv: this.result.rv, flow: 'return' });
        break;
    }
  }

  literalNode(node, state, ws) {
    this.pop(node.value);
  }

  varNode(node, state, ws) {
    this.pop({ rv: this.ctx.get(node.name), lv: { name: node.name } });
  }

  letNode(node, state, ws) {
    switch (state) {
      case 0:
        this.goto(1);
        this.push(node.value);
        break;
      case 1:
        this.ctx.set(node.name, this.result.rv);
        this.pop({ rv: this.result.rv, lv: { name: node.name } });
        break;
    }
  }

  indexNode(node, state, ws) {
    switch (state) {
      case 0:
        this.goto(1, (ws) => {
          ws.set('indexes', immutable.List());
          ws.set('count', 0);
        });
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
        this.goto(1, (ws) => {
          ws.update('indexes', (indexes) => indexes.push(this.result.rv));
          ws.update('count', (count) => count + 1);
        });
        break;
      case 3:
        let indexes = ws.get('indexes').toArray();
        this.pop({
          rv: this.ctx.getindex(node.name, indexes),
          lv: { name: node.name, indexes: indexes }
        });
        break;
    }
  }

  letIndexNode(node, state, ws) {
    switch (state) {
      case 0:
        this.goto(1, (ws) => {
          ws.set('indexes', immutable.List());
          ws.set('count', 0);
        });
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
        this.goto(1, (ws) => {
          ws.update('indexes', (indexes) => indexes.push(this.result.rv));
          ws.update('count', (count) => count + 1);
        });
        break;
      case 3:
        this.goto(4);
        this.push(node.value);
        break;
      case 4:
        let indexes = ws.get('indexes').toArray();
        this.ctx.setindex(node.name, indexes, this.result.rv);
        // return the rv/lv pair for this assignment
        this.pop({
          rv: this.result.rv,
          lv: { name: node.name, indexes: indexes }
        });
        break;
    }
  }

  withNode(node, state, ws) {
    switch (state) {
      case 0:
        this.goto(1);
        if (node.name) {
          if (node.indexes) {
            this.push({
              type: 'letIndex',
              name: node.name,
              indexes: node.indexes,
              value: node.value
            });
          } else {
            this.push({
              type: 'let',
              name: node.name,
              value: node.value
            });
          }
        } else {
          this.push(node.value);
        }
        break;
      case 1:
        this.ctx.pushw(this.result);
        this.goto(2);
        this.push(node.body);
        break;
      case 2:
        this.ctx.popw();
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
              this.pop(false);
            } else {
              this.goto(2);
              this.push(node.right);
            }
            break;
          case 2:
            this.pop(!!this.result.rv);
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
              this.pop(true);
            } else {
              this.goto(2);
              this.push(node.right);
            }
            break;
          case 2:
            this.pop(!!this.result.rv);
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
            this.pop(!this.result.rv);
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
        this.goto(2, (ws) => {
          ws.set('left', this.result.rv);
        });
        this.push(node.right);
        break;
      case 2:
        this.goto(3, (ws) => {
          ws.set('right', this.result.rv);
        });
        break;
      case 3:
        this.pop(this.ctx.binaryop(
                  node.op,
                  ws.get('left'),
                  ws.get('right')));
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
        this.goto(2, (ws) => {
          ws.set('right', this.result.rv);
        });
        break;
      case 2:
        this.pop(this.ctx.unaryop(
                  node.op,
                  ws.get('right')));
        break;
    }
  }
}

export function createInterpreter(root, ctx) {
  return new SInterpreter(root, ctx);
}
