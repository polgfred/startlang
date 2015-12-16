'use strict';

let hasOwnProperty = Object.prototype.hasOwnProperty; // cache this for performance

export class SInterpreter {
  constructor(root, ctx) {
    this.root = root; // root of the program ast
    this.ctx = ctx; // the Runtime instance
  }

  run() {
    // just visit the root node
    return this.visit(this.root);
  }

  // main node visitor
  visit(node) {
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
  nodeResult(node) {
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

  blockNode(node) {
    let len = node.elems.length;
    // recursive loop over block statements
    let loop = (count) => {
      if (count < len) {
        return this.visit(node.elems[count]).then((eres) => {
          // propagate a flow result
          return eres.flow ? eres : loop(count + 1);
        });
      }
    };
    return loop(0);
  }

  loopBody(body, loop, next) {
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

  repeatNode(node) {
    return this.visit(node.times).then((tres) => {
      // recursive loop over range
      let loop = (count) => {
        if (count < tres.rv) {
          return this.loopBody(node.body, loop, count + 1);
        }
      };
      return loop(0);
    });
  }

  countNode(node) {
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

  forNode(node) {
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

  whileNode(node) {
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

  ifNode(node) {
    return this.visit(node.cond).then((cres) => {
      if (cres.rv) {
        return this.visit(node.tbody);
      } else if (node.fbody) {
        return this.visit(node.fbody);
      }
    });
  }

  beginNode(node) {
    // save the begin node in the function table
    return this.ctx.setfn(node.name, node);
  }

  callNode(node) {
    let len = node.args ? node.args.length : 0, args = [], assn = [];
    // loop to collect arguments and call the function
    let loop = (count) => {
      if (count < len) {
        return this.visit(node.args[count]).then((ares) => {
          args[count] = ares.rv;
          assn[count] = ares.lv;
          return loop(count + 1);
        });
      } else {
        // look for a user-defined function first
        let fn = this.ctx.getfn(node.name);
        if (fn) {
          return this.userCall(fn, args);
        } else {
          // try to call a runtime API function
          return this.ctx.syscall(node.name, args, assn);
        }
      }
    };
    return loop(0);
  }

  userCall(node, args) {
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
    return { rv: undefined, flow: 'exit' };
  }

  breakNode() {
    return { rv: undefined, flow: 'break' };
  }

  nextNode() {
    return { rv: undefined, flow: 'next' };
  }

  returnNode(node) {
    if (node.result) {
      return this.visit(node.result).then((rres) => {
        return { rv: rres.rv, flow: 'return' };
      });
    } else {
      return { rv: undefined, flow: 'return' };
    }
  }

  varNode(node) {
    return { rv: this.ctx.get(node.name), lv: { name: node.name } };
  }

  letNode(node) {
    return this.visit(node.value).then((vres) => {
      this.ctx.set(node.name, vres.rv);
      // return the rv/lv pair for this assignment
      return { rv: vres.rv, lv: { name: node.name } };
    });
  }

  visitIndexes(indexes) {
    let len = indexes.length, res = [];
    // collect indexes
    let loop = (count) => {
      if (count == len) {
        return res;
      } else {
        return this.visit(indexes[count]).then((ires) => {
          res[count] = ires.rv;
          return loop(count + 1);
        });
      }
    };
    return loop(0);
  }

  indexNode(node) {
    return this.visitIndexes(node.indexes).then((rres) => {
      return {
        rv: this.ctx.getindex(node.name, rres),
        lv: { name: node.name, indexes: rres }
      };
    });
  }

  letIndexNode(node) {
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

  withNode(node) {
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

  logicalOpNode(node) {
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

  binaryOpNode(node) {
    return this.visit(node.left).then((lres) => {
      return this.visit(node.right).then((rres) => {
        return this.ctx.binaryop(node.op, lres.rv, rres.rv);
      });
    });
  }

  unaryOpNode(node) {
    return this.visit(node.right).then((rres) => {
      return this.ctx.unaryop(node.op, rres.rv);
    });
  }
}

export function createInterpreter(root, ctx) {
  return new SInterpreter(root, ctx);
}
