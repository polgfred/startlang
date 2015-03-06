var util = require('util'),
    events = require('events'),
    // cache this for performance
    hasOwnProperty = Object.prototype.hasOwnProperty,
    // shared control object for the enter event
    control = {};

function ScriptExit() {}

util.inherits(ScriptExit, Error);

var SInterpreter = exports.SInterpreter = function(root, ctx) {
  this.root = root;
  this.ctx = ctx;
  this.frames = [];
};

util.inherits(SInterpreter, events.EventEmitter);

util._extend(SInterpreter.prototype, {
  // main entry point
  run: function() {
    var _this = this;
    return _this.visit(_this.root).then(function() {
      _this.emit('end');
    }).catch(function(err) {
      if (err instanceof ScriptExit) {
        _this.emit('end');
      } else {
        _this.emit('error', err);
      }
    });
  },

  // main node visitor
  visit: function(node) {
    // optimize literals: skip conversion, frames, events, and error handling,
    // and extract the value directly from the node without a function call
    if (node.type == 'literal') {
      return Promise.resolve({ rv: node.value });
    }
    var _this = this;
    // push a frame onto the stack
    _this.frames.push({ node: node, ns: _this.ctx.ns, stack: _this.ctx.stack });
    // give the caller a chance to exit or pause
    _this.emit('enter', node, control);
    if (control.exit) {
      control = {};
      // return a special error to exit the program
      return Promise.reject(new ScriptExit());
    } else if (control.pause) {
      control = {};
      // return a promise to resume execution when resume() is called
      return new Promise(function(resolve) {
        _this.resume = function() {
          _this.resume = null;
          return this.nodeResult(node);
        };
      });
    }
    // return the node's result immediately
    return this.nodeResult(node);
  },

  // safely get and normalize the node's result, and handle errors
  nodeResult: function(node) {
    var _this = this, method = node.type + 'Node';
    return new Promise(function(resolve) {
      resolve(_this[method](node));
    }).then(function(result) {
      // if the node returns a plain value, convert it to an rvalue
      if (result == null || !hasOwnProperty.call(result, 'rv')) {
        result = { rv: result };
      }
      // notify caller that we're exiting
      _this.emit('exit', node, result);
      return result;
    }).catch(function(err) {
      // attach the node where the error occured
      if (!err.node) {
        err.node = node;
      }
      throw err;
    });
  },

  // ** implementations of AST nodes **

  blockNode: function(node) {
    var _this = this, len = node.elems.length;
    return loop(0);
    // recursive loop over block statements
    function loop(count) {
      if (count < len) {
        return _this.visit(node.elems[count]).then(function(eres) {
          // propagate break/next/return
          return eres.flow ? eres : loop(count + 1);
        });
      }
    }
  },

  forNode: function(node) {
    var _this = this;
    return _this.visit(node.range).then(function(rres) {
      // convert the range to an enumeration
      return loop(_this.ctx.enumerate(rres.rv));
      // recursive loop over range
      function loop(iter) {
        if (iter.more) {
          _this.ctx.set(node.name, iter.value);
          return _this.visit(node.body).then(function(bres) {
            var flow = bres.flow;
            if (flow == 'return') {
              return bres; // propagate
            } else if (!flow || flow == 'next') {
              return loop(iter.next());
            }
          });
        }
      }
    });
  },

  whileNode: function(node) {
    var _this = this;
    return loop();
    // recursive loop while condition is true
    function loop() {
      return _this.visit(node.cond).then(function(cres) {
        if (cres.rv) {
          return _this.visit(node.body).then(function(bres) {
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
  },

  ifNode: function(node) {
    var _this = this;
    return _this.visit(node.cond).then(function(cres) {
      if (cres.rv) {
        return _this.visit(node.tbody);
      } else if (node.fbody) {
        return _this.visit(node.fbody);
      }
    });
  },

  beginNode: function(node) {
    var _this = this, len = node.params ? node.params.length : 0;
    return _this.ctx.setfn(node.name, fn);
    // implement function body (invoked from call node)
    function fn(args) {
      // push a new stack and set parameter values
      _this.ctx.push();
      for (var i = 0; i < len; ++i) {
        _this.ctx.set(node.params[i], args[i]);
      }
      // capture a possible return value and then clean up
      return _this.visit(node.body).then(function(bres) {
        _this.ctx.pop();
        if (bres.flow == 'return') {
          return bres.rv;
        }
      }, function(err) {
        _this.ctx.pop();
        throw err;
      });
    }
  },

  callNode: function(node) {
    var _this = this, len = node.args ? node.args.length : 0, args = [], assn = [], fn;
    return loop(0);
    // loop to collect arguments and call the function
    function loop(count) {
      if (count == len) {
        fn = _this.ctx.getfn(node.name);
        return fn ? fn(args) : _this.ctx.syscall(node.name, args, assn);
      } else {
        return _this.visit(node.args[count]).then(function(ares) {
          args[count] = ares.rv;
          assn[count] = ares.lv;
          return loop(count + 1);
        });
      }
    }
  },

  breakNode: function() {
    return { rv: undefined, flow: 'break' };
  },

  nextNode: function() {
    return { rv: undefined, flow: 'next' };
  },

  returnNode: function(node) {
    var _this = this;
    if (node.result) {
      return _this.visit(node.result).then(function(rres) {
        return { rv: rres.rv, flow: 'return' };
      });
    } else {
      return { rv: undefined, flow: 'return' };
    }
  },

  varNode: function(node) {
    var _this = this;
    return { rv: _this.ctx.get(node.name), lv: { name: node.name } };
  },

  letNode: function(node) {
    var _this = this;
    return _this.visit(node.value).then(function(vres) {
      return _this.ctx.set(node.name, vres.rv);
    });
  },

  deleteNode: function(node) {
    var _this = this;
    return _this.ctx.del(node.name);
  },

  indexNode: function(node) {
    var _this = this, len = node.indexes.length, indexes = [];
    return loop(0);
    // collect indexes and lookup value
    function loop(count) {
      if (count == len) {
        return {
          rv: _this.ctx.getindex(node.name, indexes),
          lv: { name: node.name, indexes: indexes }
        };
      } else {
        return _this.visit(node.indexes[count]).then(function(ires) {
          indexes[count] = ires.rv;
          return loop(count + 1);
        });
      }
    }
  },

  letIndexNode: function(node) {
    var _this = this, len = node.indexes.length, indexes = [];
    return loop(0);
    // collect indexes and set value
    function loop(count) {
      if (count == len) {
        return _this.visit(node.value).then(function(vres) {
          return _this.ctx.setindex(node.name, indexes, vres.rv);
        });
      } else {
        return _this.visit(node.indexes[count]).then(function(ires) {
          indexes[count] = ires.rv;
          return loop(count + 1);
        });
      }
    }
  },

  deleteIndexNode: function(node) {
    var _this = this, len = node.indexes.length, indexes = [];
    return loop(0);
    // collect indexes and delete value
    function loop(count) {
      if (count == len) {
        return _this.ctx.delindex(node.name, indexes);
      } else {
        return _this.visit(node.indexes[count]).then(function(ires) {
          indexes[count] = ires.rv;
          return loop(count + 1);
        });
      }
    }
  },

  logicalOpNode: function(node) {
    var method = 'logicalOpNode_' + node.op;
    return this[method](node);
  },

  logicalOpNode_and: function(node) {
    var _this = this;
    return _this.visit(node.left).then(function(lres) {
      if (!lres.rv) {
        return false;
      } else {
        return _this.visit(node.right).then(function(rres) {
          return !!rres.rv;
        });
      }
    });
  },

  logicalOpNode_or: function(node) {
    var _this = this;
    return _this.visit(node.left).then(function(lres) {
      if (lres.rv) {
        return true;
      } else {
        return _this.visit(node.right).then(function(rres) {
          return !!rres.rv;
        });
      }
    });
  },

  logicalOpNode_not: function(node) {
    var _this = this;
    return _this.visit(node.right).then(function(rres) {
      return !rres.rv;
    });
  },

  binaryOpNode: function(node) {
    var _this = this;
    return _this.visit(node.left).then(function(lres) {
      return _this.visit(node.right).then(function(rres) {
        return _this.ctx.binaryop(node.op, lres.rv, rres.rv);
      });
    });
  },

  unaryOpNode: function(node) {
    var _this = this;
    return _this.visit(node.right).then(function(rres) {
      return _this.ctx.unaryop(node.op, rres.rv);
    });
  }
});

exports.create = function(root, ctx) {
  return new SInterpreter(root, ctx);
};
