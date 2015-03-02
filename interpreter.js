var util = require('util'),
    events = require('events'),
    Promise = require('bluebird'),
    hasOwnProperty = Object.prototype.hasOwnProperty;

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
    return _this.visit(_this.root).tap(function(result) {
      _this.emit('end', result);
    }).catch(function(err) {
      _this.emit('error', err);
    });
  },

  visit: function(node) {
    var _this = this;
    return Promise.try(function() {
      _this.emit('enter', node);
      return _this[node.type + 'Node'](node).then(function(result) {
        if (result == null || !hasOwnProperty.call(result, 'rv')) {
          result = { rv: result };
        }
        _this.emit('exit', node, result);
        return result;
      });
    });
  },

  // ** implementations of AST nodes **

  blockNode: function(node) {
    var _this = this, len = node.elems.length;
    return Promise.try(function() {
      return (function loop(count) {
        if (count < len) {
          return _this.visit(node.elems[count]).then(function(eres) {
            // propagate break/next/return
            return eres.flow ? eres : loop(count + 1);
          });
        }
      })(0);
    });
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

  forNode: function(node) {
    var _this = this;
    return Promise.try(function() {
      return _this.visit(node.range).then(function(rres) {
        var range = _this.ctx.enumerate(rres.rv);
        return (function loop(iter) {
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
        })(range);
      });
    });
  },

  whileNode: function(node) {
    var _this = this;
    return Promise.try(function() {
      return (function loop() {
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
      })();
    });
  },

  beginNode: function(node) {
    var _this = this, len = node.params ? node.params.length : 0;
    return Promise.try(function() {
      return _this.ctx.setfn(node.name, fn);
    });

    function fn(args) {
      return Promise.try(function() {
        _this.ctx.push();
        for (var i = 0; i < len; ++i) {
          _this.ctx.set(node.params[i], args[i]);
        }
        return _this.visit(node.body).then(function(bres) {
          _this.ctx.pop();
          if (bres.flow == 'return') {
            return bres.rv;
          }
        });
      });
    }
  },

  callNode: function(node) {
    var _this = this, len = node.args ? node.args.length : 0, args = [], assn = [], fn;
    return Promise.try(function() {
      return (function loop(count) {
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
      })(0);
    });
  },

  breakNode: function() {
    return Promise.resolve({ rv: undefined, flow: 'break' });
  },

  nextNode: function() {
    return Promise.resolve({ rv: undefined, flow: 'next' });
  },

  returnNode: function(node) {
    var _this = this;
    if (node.result) {
      return _this.visit(node.result).then(function(rres) {
        return { rv: rres.rv, flow: 'return' };
      });
    } else {
      return Promise.resolve({ rv: undefined, flow: 'return' });
    }
  },

  varNode: function(node) {
    return Promise.resolve({
      rv: this.ctx.get(node.name),
      lv: { name: node.name }
    });
  },

  letNode: function(node) {
    var _this = this;
    return _this.visit(node.value).then(function(vres) {
      return _this.ctx.set(node.name, vres.rv);
    });
  },

  deleteNode: function(node) {
    var _this = this;
    return Promise.try(function() {
      return _this.ctx.del(node.name);
    });
  },

  indexNode: function(node) {
    var _this = this, len = node.indexes.length, indexes = [];
    return Promise.try(function() {
      return (function loop(count) {
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
      })(0);
    });
  },

  letIndexNode: function(node) {
    var _this = this, len = node.indexes.length, indexes = [];
    return Promise.try(function() {
      return (function loop(count) {
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
      })(0);
    });
  },

  deleteIndexNode: function(node) {
    var _this = this, len = node.indexes.length, indexes = [];
    return Promise.try(function() {
      return (function loop(count) {
        if (count == len) {
          return _this.ctx.delindex(node.name, indexes);
        } else {
          return _this.visit(node.indexes[count]).then(function(ires) {
            indexes[count] = ires.rv;
            return loop(count + 1);
          });
        }
      })(0);
    });
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
  },

  literalNode: function(node) {
    return Promise.resolve(node.value);
  },

  commentNode: function(node) {
    return Promise.resolve();
  }
});

exports.create = function(root, ctx) {
  return new SInterpreter(root, ctx);
};
