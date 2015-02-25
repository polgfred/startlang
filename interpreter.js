var util = require('util'),
    rawAsap = require('asap/raw');

var SInterpreter = exports.SInterpreter = function(root, ctx) {
  this.root = root;
  this.ctx = ctx;
  this.frames = [];
};

util._extend(SInterpreter.prototype, {
  // main entry point
  run: function() {
    var _this = this;
    _this.visit(_this.root, function(err) {
      _this.end(err);
    });
  },

  // main node visitor, handles calling `enter', `exit',` and `error' traps,
  // exception handling, and dispatching to AST nodes
  visit: function(node, done) {
    var _this = this;
    rawAsap(function() {
      function enter() {
        try {
          _this[node.type + 'Node'](node, function(err, result) {
            rawAsap(function() {
              _this.frames.push({ stage: 'exit', err: err, result: result, node: node });
              _this.exit(node, err, result, function() {
                done(err, result);
              });
            });
          });
        } catch (err) {
          rawAsap(function() {
            _this.error(node, err, enter, function() {
              err.node = node;
              done(err);
            });
          });
        }
      }

      _this.frames.push({ stage: 'enter', enter: enter, node: node });
      _this.enter(node, enter);
    });
  },

  // ** OVERRIDE **
  // trap will be called upon entry to every node, do anything you want and call cont()
  enter: function(node, cont) {
    cont();
  },

  // ** OVERRIDE **
  // trap will be called upon exit of every node, do anything you want and call cont()
  exit: function(node, err, result, cont) {
    cont();
  },

  // ** OVERRIDE **
  // trap will be called for any exception while evaluating a node, do anything you
  // want and call retry() or fail()
  error: function(node, err, retry, fail) {
    fail();
  },

  // ** OVERRIDE **
  // trap will be called when program completes
  end: function(node, err) {
  },

  // ** implementations of AST nodes **

  blockNode: function(node, done) {
    var _this = this, len = node.elems.length;
    (function loop(count) {
      if (count < len) {
        _this.visit(node.elems[count], function(err) {
          if (err) {
            done(err);
          } else {
            loop(count + 1);
          }
        });
      } else {
        done();
      }
    })(0);
  },

  ifNode: function(node, done) {
    var _this = this;
    _this.visit(node.cond, function(err, cres) {
      if (err) {
        done(err);
      } else {
        if (cres) {
          _this.visit(node.tbody, done);
        } else if (node.fbody) {
          _this.visit(node.fbody, done);
        } else {
          done();
        }
      }
    });
  },

  forNode: function(node, done) {
    var _this = this;
    _this.visit(node.range, function(err, rres) {
      if (err) {
        done(err);
      } else {
        (function loop(iter) {
          if (iter.more) {
            _this.ctx.set(node.name, iter.value);
            _this.visit(node.body, function(err) {
              if (err) {
                if (err.flow && err.scope == 'loop') {
                  err.terminate ? done() : loop(iter.next());
                } else {
                  done(err);
                }
              } else {
                loop(iter.next());
              }
            });
          } else {
            done();
          }
        })(_this.ctx.enumerate(rres));
      }
    });
  },

  whileNode: function(node, done) {
    var _this = this;
    (function loop() {
      _this.visit(node.cond, function(err, cres) {
        if (err) {
          done(err);
        } else if (cres) {
          _this.visit(node.body, function(err) {
            if (err) {
              if (err.flow && err.scope == 'loop') {
                (err.terminate ? done : loop)();
              } else {
                done(err);
              }
            } else {
              loop();
            }
          });
        } else {
          done();
        }
      });
    })();
  },

  beginNode: function(node, done) {
    var _this = this, len = node.params ? node.params.length : 0;
    _this.ctx.define(node.name, function(args, done2) {
      _this.ctx.push();
      for (var i = 0; i < len; ++i) {
        _this.ctx.set(node.params[i], args[i]);
      }
      _this.visit(node.body, function(err) {
        _this.ctx.pop();
        if (err) {
          if (err.flow) {
            done2(null, err.result);
          } else {
            done2(err);
          }
        } else {
          done2();
        }
      });
    });
    done();
  },

  callNode: function(node, done) {
    var _this = this, len = node.args ? node.args.length : 0, args = [];
    (function loop(count) {
      if (count < len) {
        _this.visit(node.args[count], function(err, ares) {
          if (err) {
            done(err);
          } else {
            args[count] = ares;
            loop(count + 1);
          }
        });
      } else {
        _this.ctx.funcall(node.name, args, done);
      }
    })(0);
  },

  breakNode: function(node, done) {
    done({
      flow: true,
      terminate: true,
      scope: 'loop'
    });
  },

  nextNode: function(node, done) {
    done({
      flow: true,
      terminate: false,
      scope: 'loop'
    });
  },

  returnNode: function(node, done) {
    var _this = this;
    if (node.result) {
      _this.visit(node.result, function(err, rres) {
        if (err) {
          done(err);
        } else {
          done({
            flow: true,
            terminate: true,
            scope: 'function',
            result: rres
          });
        }
      });
    } else {
      done({
        flow: true,
        terminate: true,
        scope: 'function'
      });
    }
  },

  varNode: function(node, done) {
    done(null, this.ctx.get(node.name));
  },

  letNode: function(node, done) {
    var _this = this;
    _this.visit(node.value, function(err, vres) {
      if (err) {
        done(err);
      } else {
        _this.ctx.set(node.name, vres);
        done();
      }
    });
  },

  deleteNode: function(node, done) {
    this.ctx.del(node.name);
    done();
  },

  indexNode: function(node, done) {
    var _this = this, len = node.indexes.length, indexes = [];
    (function loop(count) {
      if (count < len) {
        _this.visit(node.indexes[count], function(err, ires) {
          if (err) {
            done(err);
          } else {
            indexes[count] = ires;
            loop(count + 1);
          }
        });
      } else {
        done(null, _this.ctx.getindex(node.name, indexes));
      }
    })(0);
  },

  letIndexNode: function(node, done) {
    var _this = this, len = node.indexes.length, indexes = [];
    (function loop(count) {
      if (count < len) {
        _this.visit(node.indexes[count], function(err, ires) {
          if (err) {
            done(err);
          } else {
            indexes[count] = ires;
            loop(count + 1);
          }
        });
      } else {
        _this.visit(node.value, function(err, vres) {
          if (err) {
            done(err);
          } else {
            _this.ctx.setindex(node.name, indexes, vres);
            done();
          }
        });
      }
    })(0);
  },

  deleteIndexNode: function(node, done) {
    var _this = this, len = node.indexes.length, indexes = [];
    (function loop(count) {
      if (count < len) {
        _this.visit(node.indexes[count], function(err, ires) {
          if (err) {
            done(err);
          } else {
            indexes[count] = ires;
            loop(count + 1);
          }
        });
      } else {
        _this.ctx.delindex(node.name, indexes);
        done();
      }
    })(0);
  },

  logicalOpNode: function(node, done) {
    var method = 'logicalOpNode_' + node.op;
    this[method](node, done);
  },

  logicalOpNode_and: function(node, done) {
    var _this = this;
    _this.visit(node.left, function(err, lres) {
      if (err) {
        done(err);
      } else if (!lres) {
        done(null, false);
      } else {
        _this.visit(node.right, function(err, rres) {
          if (err) {
            done(err);
          } else {
            done(null, !!rres);
          }
        });
      }
    });
  },

  logicalOpNode_or: function(node, done) {
    var _this = this;
    _this.visit(node.left, function(err, lres) {
      if (err) {
        done(err);
      } else if (lres) {
        done(null, true);
      } else {
        _this.visit(node.right, function(err, rres) {
          if (err) {
            done(err);
          } else {
            done(null, !!rres);
          }
        });
      }
    });
  },

  logicalOpNode_not: function(node, done) {
    var _this = this;
    _this.visit(node.right, function(err, rres) {
      if (err) {
        done(err);
      } else {
        done(null, !rres);
      }
    });
  },

  binaryOpNode: function(node, done) {
    var _this = this;
    _this.visit(node.left, function(err, lres) {
      if (err) {
        done(err);
      } else {
        _this.visit(node.right, function(err, rres) {
          if (err) {
            done(err);
          } else {
            done(null, _this.ctx.binaryop(node.op, lres, rres));
          }
        });
      }
    });
  },

  unaryOpNode: function(node, done) {
    var _this = this;
    _this.visit(node.right, function(err, rres) {
      if (err) {
        done(err);
      } else {
        done(null, _this.ctx.unaryop(node.op, rres));
      }
    });
  },

  literalNode: function(node, done) {
    done(null, node.value);
  },

  commentNode: function(node, done) {
    done();
  }
});

exports.create = function(root, ctx) {
  return new SInterpreter(root, ctx);
};
