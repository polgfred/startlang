'use strict';

import immutable from 'immutable';

let hasOwnProperty = Object.prototype.hasOwnProperty; // cache this for performance

export class Frame extends immutable.Record({
  node: null,
  state: 0,
  ws: immutable.OrderedMap()
}) {}

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
    if (this.frame) {
      // console.log('--------------');
      // console.log(this.fst);
      // console.log(this.frame.node);
      // console.log(this.frame.state);
      // console.log(this.frame.ws);
      return new Promise((resolve) => {
        resolve(this[`${this.frame.node.type}Node`]());
      }).then(() => {
        // continue
        return this.loop();
      }).catch((err) => {
        // attach the node where the error occured
        if (!err.node) {
          err.node = this.frame.node;
        }
        throw err;
      });
    } else {
      return Promise.resolve();
    }
  }

  push(node) {
    this.fst = this.fst.push(this.frame);
    this.frame = new Frame({ node });
  }

  pop(result) {
    // if the node returns a plain value, convert it to an rvalue
    if (result == null || !hasOwnProperty.call(result, 'rv')) {
      result = { rv: result };
    }
    this.result = result;
    this.frame = this.fst.first();
    this.fst = this.fst.pop();
  }

  // main node visitor
  xxvisit(node) {
    // optimize literals: extract the value directly without a function call
    if (node.type == 'literal') {
      return Promise.resolve({ rv: node.value });
    }
    if (node.pause) {
      // return a promise to resume execution when resume() is called
      return new Promise((resolve) => {
        this.resume = () => {
          this.resume = null;
          return this.nodeResult(node);
        };
      });
    }
    // return the node's result immediately
    return this.nodeResult(node);
  }

  // safely get and normalize the node's result, or attach the node to
  // the error object on failure
  xxnodeResult(node) {
    let method = node.type + 'Node';
    return new Promise((resolve) => {
      resolve(this[method](node));
    }).then((result) => {
      // if the node returns a plain value, convert it to an rvalue
      if (result == null || !hasOwnProperty.call(result, 'rv')) {
        result = { rv: result };
      }
      return result;
    }, (err) => {
      // attach the node where the error occured
      if (!err.node) {
        err.node = node;
      }
      throw err;
    });
  }

  // ** implementations of AST nodes **

  blockNode() {
    switch (this.frame.state) {
      case 0:
        this.frame = this.frame.set('state', 1)
                      .setIn([ 'ws', 'count' ], 0);
        break;
      case 1:
        if (this.frame.getIn([ 'ws', 'count' ]) < this.frame.node.elems.length) {
          let count = this.frame.getIn([ 'ws', 'count' ]);
          this.frame = this.frame.setIn([ 'ws', 'count' ], count + 1);
          this.push(this.frame.node.elems[count]);
        } else {
          this.pop();
        }
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

  repeatNode() {
    switch (this.frame.state) {
      case 0:
        this.frame = this.frame.set('state', 1);
        this.push(this.frame.node.times);
        break;
      case 1:
        this.frame = this.frame.set('state', 2)
                      .setIn([ 'ws', 'times' ], this.result.rv)
                      .setIn([ 'ws', 'count' ], 0);
        break;
      case 2:
        let count = this.frame.getIn([ 'ws', 'count' ]);
        if (count < this.frame.getIn([ 'ws', 'times' ])) {
          this.frame = this.frame.setIn([ 'ws', 'count' ], count + 1);
          this.push(this.frame.node.body);
        } else {
          this.pop();
        }
    }
  }

  xxcountNode(node) {
    return this.visit(node.from).then((fres) => {
      return this.visit(node.to).then((tres) => {
        let bp = node.by ? this.visit(node.by) : Promise.resolve({ rv: 1 });
        return bp.then((bres) => {
          // recursive loop over range
          let loop = (count) => {
            if (count <= tres.rv) {
              this.ctx.set(node.name, count);
              return this.loopBody(node.body, loop, count + bres.rv);
            }
          };
          return loop(fres.rv);
        });
      });
    });
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

  ifNode() {
    switch (this.frame.state) {
      case 0:
        this.frame = this.frame.set('state', 1);
        this.push(this.frame.node.cond);
        break;
      case 1:
        this.frame = this.frame.set('state', 2)
                      .setIn([ 'ws', 'cond' ], this.result.rv);
        break;
      case 2:
        this.frame = this.frame.set('state', 3);
        if (this.frame.getIn([ 'ws', 'cond' ])) {
          this.push(this.frame.node.tbody);
        } else if (this.frame.node.fbody) {
          this.push(this.frame.node.fbody);
        }
        break;
      case 3:
        this.pop();
    }
  }

  xxbeginNode(node) {
    // save the begin node in the function table
    return this.ctx.setfn(node.name, node);
  }

  callNode() {
    switch (this.frame.state) {
      case 0:
        this.frame = this.frame.set('state', 1)
                      .setIn([ 'ws', 'args' ], immutable.List())
                      .setIn([ 'ws', 'assn' ], immutable.List())
                      .setIn([ 'ws', 'count' ], 0);
        break;
      case 1:
        let count = this.frame.getIn([ 'ws', 'count' ]);
        if (count < this.frame.node.args.length) {
          this.frame = this.frame.set('state', 2)
          this.push(this.frame.node.args[count]);
        } else {
          this.frame = this.frame.set('state', 3)
        }
        break;
      case 2:
        this.frame = this.frame.set('state', 1)
                      .updateIn([ 'ws', 'args' ], (args) => args.push(this.result.rv))
                      .updateIn([ 'ws', 'assn' ], (assn) => assn.push(this.result.lv))
                      .updateIn([ 'ws', 'count' ], (count) => count + 1);
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
                      this.frame.node.name,
                      this.frame.getIn([ 'ws', 'args' ]).toJS(),
                      this.frame.getIn([ 'ws', 'assn' ]).toJS()));
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

  xxexitNode() {
    return { rv: undefined, flow: 'exit' };
  }

  xxbreakNode() {
    return { rv: undefined, flow: 'break' };
  }

  xxnextNode() {
    return { rv: undefined, flow: 'next' };
  }

  xxreturnNode(node) {
    if (node.result) {
      return this.visit(node.result).then((rres) => {
        return { rv: rres.rv, flow: 'return' };
      });
    } else {
      return { rv: undefined, flow: 'return' };
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
