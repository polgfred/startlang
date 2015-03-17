var events = require('events'),
    // cache this for performance
    hasOwnProperty = Object.prototype.hasOwnProperty,
    // shared control object for the enter event
    control = {};

export class ScriptExit extends Error {}

export class SInterpreter extends events.EventEmitter {
  constructor(root, ctx) {
    this.root = root;
    this.ctx = ctx;
    this.frames = [];
  }

  run() {
    return this.visit(this.root).then(() => {
      this.emit('end');
    }).catch((err) => {
      if (err instanceof ScriptExit) {
        this.emit('end');
      } else {
        this.emit('error', err);
      }
    });
  }

  // main node visitor
  visit(node) {
    // optimize literals: skip conversion, frames, events, and error handling,
    // and extract the value directly from the node without a function call
    if (node.type == 'literal') {
      return Promise.resolve({ rv: node.value });
    }
    // push a frame onto the stack
    //this.frames.push({ node: node, ns: this.ctx.ns, stack: this.ctx.stack });
    // give the caller a chance to exit or pause
    this.emit('enter', node, control);
    if (control.exit) {
      control = {};
      // return a special error to exit the program
      return Promise.reject(new ScriptExit());
    } else if (control.pause) {
      control = {};
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

  // safely get and normalize the node's result, and handle errors
  nodeResult(node) {
    var method = node.type + 'Node';
    return new Promise((resolve) => {
      resolve(this[method](node));
    }).then((result) => {
      // if the node returns a plain value, convert it to an rvalue
      if (result == null || !hasOwnProperty.call(result, 'rv')) {
        result = { rv: result };
      }
      // notify caller that we're exiting
      this.emit('exit', node, result);
      return result;
    }).catch((err) => {
      // attach the node where the error occured
      if (!err.node) {
        err.node = node;
      }
      throw err;
    });
  }

  // ** implementations of AST nodes **

  blockNode(node) {
    var len = node.elems.length;
    // recursive loop over block statements
    var loop = (count) => {
      if (count < len) {
        return this.visit(node.elems[count]).then((eres) => {
          // propagate break/next/return
          return eres.flow ? eres : loop(count + 1);
        });
      }
    }
    return loop(0);
  }

  forNode(node) {
    return this.visit(node.range).then((rres) => {
      // recursive loop over range
      var loop = (iter) => {
        if (iter.more) {
          this.ctx.set(node.name, iter.value);
          return this.visit(node.body).then((bres) => {
            var flow = bres.flow;
            if (flow == 'return') {
              return bres; // propagate
            } else if (!flow || flow == 'next') {
              return loop(iter.next());
            }
          });
        }
      }
      // convert the range to an enumeration
      return loop(this.ctx.enumerate(rres.rv));
    });
  }

  whileNode(node) {
    // recursive loop while condition is true
    var loop = () => {
      return this.visit(node.cond).then((cres) => {
        if (cres.rv) {
          return this.visit(node.body).then((bres) => {
            var flow = bres.flow;
            if (flow == 'return') {
              return bres; // propagate
            } else if (!flow || flow == 'next') {
              return loop();
            }
          });
        }
      });
    }
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
    var len = node.params ? node.params.length : 0;
    // implement function body (invoked from call node)
    var fn = (args) => {
      // push a new stack and set parameter values
      this.ctx.push();
      for (var i = 0; i < len; ++i) {
        this.ctx.set(node.params[i], args[i]);
      }
      // capture a possible return value and then clean up
      return this.visit(node.body).then((bres) => {
        this.ctx.pop();
        if (bres.flow == 'return') {
          return bres.rv;
        }
      }, (err) => {
        this.ctx.pop();
        throw err;
      });
    }
    return this.ctx.setfn(node.name, fn);
  }

  callNode(node) {
    var len = node.args ? node.args.length : 0, args = [], assn = [], fn;
    // loop to collect arguments and call the function
    var loop = (count) => {
      if (count == len) {
        fn = this.ctx.getfn(node.name);
        return fn ? fn(args) : this.ctx.syscall(node.name, args, assn);
      } else {
        return this.visit(node.args[count]).then((ares) => {
          args[count] = ares.rv;
          assn[count] = ares.lv;
          return loop(count + 1);
        });
      }
    }
    return loop(0);
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
      return this.ctx.set(node.name, vres.rv);
    });
  }

  deleteNode(node) {
    return this.ctx.del(node.name);
  }

  indexNode(node) {
    var len = node.indexes.length, indexes = [];
    // collect indexes and lookup value
    var loop = (count) => {
      if (count == len) {
        return {
          rv: this.ctx.getindex(node.name, indexes),
          lv: { name: node.name, indexes: indexes }
        };
      } else {
        return this.visit(node.indexes[count]).then((ires) => {
          indexes[count] = ires.rv;
          return loop(count + 1);
        });
      }
    }
    return loop(0);
  }

  letIndexNode(node) {
    var len = node.indexes.length, indexes = [];
    // collect indexes and set value
    var loop = (count) => {
      if (count == len) {
        return this.visit(node.value).then((vres) => {
          return this.ctx.setindex(node.name, indexes, vres.rv);
        });
      } else {
        return this.visit(node.indexes[count]).then((ires) => {
          indexes[count] = ires.rv;
          return loop(count + 1);
        });
      }
    }
    return loop(0);
  }

  deleteIndexNode(node) {
    var len = node.indexes.length, indexes = [];
    // collect indexes and delete value
    var loop = (count) => {
      if (count == len) {
        return this.ctx.delindex(node.name, indexes);
      } else {
        return this.visit(node.indexes[count]).then((ires) => {
          indexes[count] = ires.rv;
          return loop(count + 1);
        });
      }
    }
    return loop(0);
  }

  logicalOpNode(node) {
    var method = 'logicalOpNode_' + node.op;
    return this[method](node);
  }

  logicalOpNode_and(node) {
    return this.visit(node.left).then((lres) => {
      if (!lres.rv) {
        return false;
      } else {
        return this.visit(node.right).then((rres) => {
          return !!rres.rv;
        });
      }
    });
  }

  logicalOpNode_or(node) {
    return this.visit(node.left).then((lres) => {
      if (lres.rv) {
        return true;
      } else {
        return this.visit(node.right).then((rres) => {
          return !!rres.rv;
        });
      }
    });
  }

  logicalOpNode_not(node) {
    return this.visit(node.right).then((rres) => {
      return !rres.rv;
    });
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

export function create(root, ctx) {
  return new SInterpreter(root, ctx);
}
