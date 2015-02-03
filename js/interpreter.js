define([ 'start-lang', 'start-lib' ], function(startlang, startlib) {
  var rawAsap = require('raw'),
      handle = startlib.handle;

  function mixin(object, properties) {
    Object.keys(properties).forEach(function(prop) {
      object[prop] = properties[prop];
    });
  }

  function Interpreter(node, ctx) {
    this.root = node;
    this.ctx  = ctx || startlib.createEnv();
  }

  mixin(Interpreter.prototype, {
    // main entry point, visit the root node, report errors, and return the
    // program's final result, along with a reference to the final state of the
    // runtime
    run: function(done) {
      var _this = this;
      _this.visit(_this.root, function(err, result) {
        if (err) {
          done(err, _this.ctx);
        } else {
          done(null, result, _this.ctx);
        }
      });
    },

    // main node visitor, handles calling `enter' and `handleError' traps,
    // exception handling, and dispatching to AST nodes
    visit: function(node, done) {
      var _this = this;
      rawAsap(function() {
        _this.enter(node, function retry() {
          try {
            _this[node.node](node, done);
          } catch (err) {
            _this.handleError(node, err, retry, function() {
              err.node = node;
              done(err);
            });
          }
        });
      });
    },

    // ** OVERRIDE **
    // trap will be called upon entry to every node, do anything you want and call cont()
    enter: function(node, cont) {
      cont();
    },

    // ** OVERRIDE **
    // trap will be called for any exception while evaluating a node, do anything you
    // want and call retry() or fail()
    handleError: function(node, err, retry, fail) {
      console.log('failing', node, err);
      fail();
    },

    // ** implementations of AST nodes **

    BlockNode: function(node, done) {
      var _this = this, len = node.elems.length, count = -1;
      (function loop() {
        if (++count < len) {
          _this.visit(node.elems[count], function(err) {
            if (err) {
              done(err);
            } else {
              loop();
            }
          });
        } else {
          done();
        }
      })();
    },

    IfNode: function(node, done) {
      var _this = this;
      _this.visit(node.cond, function(err, cres) {
        if (err) {
          done(err);
        } else if (cres) {
          _this.visit(node.tblock, done);
        } else if (node.fblock) {
          _this.visit(node.fblock, done);
        } else {
          done();
        }
      });
    },

    ForNode: function(node, done) {
      var _this = this, items, len, count;
      _this.visit(node.range, function(err, rres) {
        if (err) {
          done(err);
        } else {
          items = handle(rres).enumerate(rres);
          len = items.length;
          count = -1;
          (function loop() {
            if (++count < len) {
              _this.ctx.set(node.name, items[count]);
              _this.visit(node.block, function(err) {
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
          })();
        }
      });
    },

    WhileNode: function(node, done) {
      var _this = this;
      (function loop() {
        _this.visit(node.cond, function(err, cres) {
          if (err) {
            done(err);
          } else if (cres) {
            _this.visit(node.block, function(err) {
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

    BeginNode: function(node, done) {
      var _this = this;
      _this.ctx.set(node.name, function(args, done2) {
        _this.ctx.push();
        _this.visit(node.block, function(err) {
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

    FuncallNode: function(node, done) {
      var _this = this, len = node.args.length, args = [], count = -1;
      _this.visit(node.target, function(err, tres) {
        if (err) {
          done(err);
        } else {
          (function loop() {
            if (++count < len) {
              _this.visit(node.args[count], function(err, ares) {
                if (err) {
                  done(err);
                } else {
                  args[count] = ares;
                  loop();
                }
              });
            } else if (tres) {
              tres(args, done); //=> see beginBlock callback target
            } else {
              done(null, _this.ctx.syscall(node.target.name, args));
            }
          })();
        }
      });
    },

    BreakNode: function(node, done) {
      done({
        flow: true,
        terminate: true,
        scope: 'loop'
      });
    },

    NextNode: function(node, done) {
      done({
        flow: true,
        terminate: false,
        scope: 'loop'
      });
    },

    ReturnNode: function(node, done) {
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

    VariableNode: function(node, done) {
      done(null, this.ctx.get(node.name));
    },

    AssignNode: function(node, done) {
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

    DeleteNode: function(node, done) {
      this.ctx.del(node.name);
      done();
    },

    IndexNode: function(node, done) {
      var _this = this;
      _this.visit(node.base, function(err, bres) {
        if (err) {
          done(err);
        } else {
          _this.visit(node.index, function(err, ires) {
            if (err) {
              done(err);
            } else {
              done(null, _this.ctx.getindex(bres, ires));
            }
          });
        }
      });
    },

    AssignIndexNode: function(node, done) {
      var _this = this;
      _this.visit(node.base, function(err, bres) {
        if (err) {
          done(err);
        } else {
          _this.visit(node.index, function(err, ires) {
            if (err) {
              done(err);
            } else {
              _this.visit(node.value, function(err, vres) {
                if (err) {
                  done(err);
                } else {
                  _this.ctx.setindex(bres, ires, vres);
                  done();
                }
              });
            }
          });
        }
      });
    },

    DeleteIndexNode: function(node, done) {
      var _this = this;
      _this.visit(node.base, function(err, bres) {
        if (err) {
          done(err);
        } else {
          _this.visit(node.index, function(err, ires) {
            if (err) {
              done(err);
            } else {
              _this.ctx.delindex(bres, ires);
              done();
            }
          });
        }
      });
    },

    LogicalOpNode: function(node, done) {
      var method = 'LogicalOpNode_' + node.op;
      this[method](node, done);
    },

    LogicalOpNode_and: function(node, done) {
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

    LogicalOpNode_or: function(node, done) {
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

    LogicalOpNode_not: function(node, done) {
      var _this = this;
      _this.visit(node.right, function(err, rres) {
        if (err) {
          done(err);
        } else {
          done(null, !rres);
        }
      });
    },

    BinaryOpNode: function(node, done) {
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

    UnaryOpNode: function(node, done) {
      var _this = this;
      _this.visit(node.right, function(err, rres) {
        if (err) {
          done(err);
        } else {
          done(null, _this.ctx.unaryop(node.op, rres));
        }
      });
    },

    LiteralNode: function(node, done) {
      done(null, node.value);
    },

    CommentNode: function(node, done) {
      done();
    }
  });

  return {
    create: function(source) {
      return new Interpreter(startlang.parse(source));
    }
  };
});
