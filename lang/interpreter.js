'use strict';

import immutable from 'immutable';

let hasOwnProperty = Object.prototype.hasOwnProperty; // cache this for performance

export class Frame extends immutable.Record({
  node: null,
  state: 0,
  ws: immutable.OrderedMap()
}) {
  debug() {
    return `[Frame node=${this.node.name} state=${this.state} ws=${JSON.stringify(this.ws.toJS())}]`;
  }
}

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
    // loop until the stack is empty
    if (this.frame) {
      let { node, state, ws } = this.frame;
      return new Promise((resolve) => {
        resolve(this[`${node.type}Node`](node, state, ws));
      }).then(() => {
        // continue
        return this.loop();
      }).catch((err) => {
        // attach the node where the error occured
        if (!err.node) {
          err.node = node;
        }
        throw err;
      });
    } else {
      return Promise.resolve();
    }
  }

  push(node) {
    // push a new frame onto the stack for this node
    this.fst = this.fst.push(this.frame);
    this.frame = new Frame({ node });
  }

  pop(result) {
    // if the node returns a plain value, convert it to an rvalue
    if (result == null || !hasOwnProperty.call(result, 'rv')) {
      result = { rv: result };
    }
    // put the result into the result register
    this.result = result;
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
          this.goto(null, (ws) => {
            ws.set('count', count + 1);
          });
          this.push(node.elems[count]);
        } else {
          this.pop();
        }
        break;
    }
  }

  xxloopBody(body, loop, next) {
    return this.visit(body).then((bres) => {
      let flow = bres.flow;
      if (!flow || flow == 'next') {
        return loop(next);
      } else if (flow == 'break') {
        return; // just terminate the surrounding block
      } else {
        return bres; // propagate up the stack
      }
    });
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
          this.goto(null, (ws) => {
            ws.set('count', count + 1);
          });
          this.push(node.body);
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
        this.goto(4, (ws) => {
          ws.update('count', (count) => count + ws.get('by'));
        });
        break;
    }
  }

  xxforNode(node) {
    return this.visit(node.range).then((rres) => {
      // recursive loop over range
      let loop = (iter) => {
        if (iter.more) {
          this.ctx.set(node.name, iter.value);
          return this.loopBody(node.body, loop, iter.next());
        }
      };
      // convert the range to an enumeration
      return loop(this.ctx.enumerate(rres.rv));
    });
  }

  xxwhileNode(node) {
    // recursive loop while condition is true
    let loop = () => {
      return this.visit(node.cond).then((cres) => {
        if (cres.rv) {
          return this.loopBody(node.body, loop);
        }
      });
    };
    return loop();
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

  xxbeginNode(node) {
    // save the begin node in the function table
    return this.ctx.setfn(node.name, node);
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
        if (count < node.args.length) {
          this.goto(2);
          this.push(node.args[count]);
        } else {
          this.goto(3);
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
        // look for a user-defined function first
        // let fn = this.ctx.getfn(this.frame.node.name);
        // if (fn) {
        //   return this.userCall(fn, args);
        // } else {
          // try to call a runtime API function
          return new Promise((resolve) => {
            resolve(this.ctx.syscall(
                      node.name,
                      ws.get('args').toJS(),
                      ws.get('assn').toJS()));
          }).then((result) => {
            this.pop(result);
          });
        //}

    }
  }

  xxuserCall(node, args) {
    let len = node.params ? node.params.length : 0;
    // push a new stack and set parameter values
    this.ctx.push();
    for (let i = 0; i < len; ++i) {
      this.ctx.set(node.params[i], args[i]);
    }
    // capture a possible return value and then clean up
    return this.visit(node.body).then((bres) => {
      this.ctx.pop();
      if (bres.flow == 'return') {
        return bres.rv; // terminate and return the result
      } else if (bres.flow == 'exit') {
        return bres; // propagate up the stack
      }
    }, (err) => {
      this.ctx.pop();
      throw err;
    });
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

  literalNode() {
    this.pop({ rv: this.frame.node.value });
  }

  varNode() {
    this.pop({
      rv: this.ctx.get(this.frame.node.name),
      lv: { name: this.frame.node.name }
    });
  }

  xxletNode(node) {
    return this.visit(node.value).then((vres) => {
      this.ctx.set(node.name, vres.rv);
      // return the rv/lv pair for this assignment
      return { rv: vres.rv, lv: { name: node.name } };
    });
  }

  xxvisitIndexes(indexes) {
    let len = indexes.length, res = [];
    // collect indexes
    let loop = (count) => {
      if (count < len) {
        return this.visit(indexes[count]).then((ires) => {
          res[count] = ires.rv;
          return loop(count + 1);
        });
      } else {
        return res;
      }
    };
    return loop(0);
  }

  xxindexNode(node) {
    return this.visitIndexes(node.indexes).then((rres) => {
      return {
        rv: this.ctx.getindex(node.name, rres),
        lv: { name: node.name, indexes: rres }
      };
    });
  }

  xxletIndexNode(node) {
    return this.visitIndexes(node.indexes).then((rres) => {
      return this.visit(node.value).then((vres) => {
        this.ctx.setindex(node.name, rres, vres.rv);
        // return the rv/lv pair for this assignment
        return {
          rv: vres.rv,
          lv: { name: node.name, indexes: rres }
        };
      });
    });
  }

  xxwithNode(node) {
    let v = node.name ?
      // treat this as a let/letIndex and let it do its thing
      (node.indexes ? this.letIndexNode(node) : this.letNode(node)) :
      // value will have an lv if it's a var/index
      this.visit(node.value);
    return v.then((vres) => {
      this.ctx.pushw(vres);
      return this.visit(node.body).then((bres) => {
        this.ctx.popw();
        if (bres.flow == 'return' || bres.flow == 'exit') {
          return bres; // propagate up the stack
        }
      });
    }, (err) => {
      this.ctx.popw();
      throw err;
    });
  }

  xxlogicalOpNode(node) {
    switch (node.op) {
      case 'and':
        return this.visit(node.left).then((lres) => {
          if (!lres.rv) {
            return false;
          } else {
            return this.visit(node.right).then((rres) => {
              return !!rres.rv;
            });
          }
        });
      case 'or':
        return this.visit(node.left).then((lres) => {
          if (lres.rv) {
            return true;
          } else {
            return this.visit(node.right).then((rres) => {
              return !!rres.rv;
            });
          }
        });
      case 'not':
        return this.visit(node.right).then((rres) => {
          return !rres.rv;
        });
    }
  }

  binaryOpNode() {
    switch (this.frame.state) {
      case 0:
        this.frame = this.frame.set('state', 1);
        this.push(this.frame.node.left);
        break;
      case 1:
        this.frame = this.frame.set('state', 2)
                      .setIn([ 'ws', 'left' ], this.result.rv);
        this.push(this.frame.node.right);
        break;
      case 2:
        this.frame = this.frame.set('state', 3)
                      .setIn([ 'ws', 'right' ], this.result.rv);
        break;
      case 3:
        this.pop(this.ctx.binaryop(
                  this.frame.node.op,
                  this.frame.getIn([ 'ws', 'left' ]),
                  this.frame.getIn([ 'ws', 'right' ])));
    }
  }

  unaryOpNode() {
    switch (this.frame.state) {
      case 0:
        this.frame = this.frame.set('state', 1);
        this.push(this.frame.node.right);
        break;
      case 1:
        this.frame = this.frame.set('state', 2)
                      .setIn([ 'ws', 'right' ], this.result.rv);
        break;
      case 2:
        this.pop(this.ctx.unaryop(
                  this.frame.node.op,
                  this.frame.getIn([ 'ws', 'right' ])));
    }
  }
}

export function createInterpreter(root, ctx) {
  return new SInterpreter(root, ctx);
}
