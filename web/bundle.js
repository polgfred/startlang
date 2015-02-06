(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var rawAsap = require('asap/raw'),
    parser = require('./parser'),
    runtime = require('./runtime');

function mixin(object, properties) {
  Object.keys(properties).forEach(function(prop) {
    object[prop] = properties[prop];
  });
}

var SInterpreter = exports.SInterpreter = function(node, ctx) {
  this.root = node;
  this.ctx  = ctx || runtime.create();
};

mixin(SInterpreter.prototype, {
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

  // main node visitor, handles calling `enter', `exit',` and `error' traps,
  // exception handling, and dispatching to AST nodes
  visit: function(node, done) {
    var _this = this;
    rawAsap(function() {
      _this.enter(node, function retry() {
        try {
          _this[node.node](node, function(err, result) {
            rawAsap(function() {
              _this.exit(node, err, result, function() {
                done(err, result);
              });
            });
          });
        } catch (err) {
          rawAsap(function() {
            _this.error(node, err, retry, function() {
              err.node = node;
              done(err);
            });
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

  IfElseNode: function(node, done) {
    var _this = this;
    _this.visit(node.cond, function(err, cres) {
      if (err) {
        done(err);
      } else if (cres) {
        _this.visit(node.tbody, done);
      } else if (node.fbody) {
        _this.visit(node.fbody, done);
      } else {
        done();
      }
    });
  },

  ForInNode: function(node, done) {
    var _this = this, items, len, count;
    _this.visit(node.range, function(err, rres) {
      if (err) {
        done(err);
      } else {
        items = runtime.handle(rres).enumerate(rres);
        len = items.length;
        count = -1;
        (function loop() {
          if (items.more()) {
            _this.ctx.set(node.name, items.next());
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

  BeginNode: function(node, done) {
    var _this = this;
    _this.ctx.set(node.name, function(args, done2) {
      _this.ctx.push();
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

exports.create = function(source, ctx) {
  return new SInterpreter(parser.parse(source), ctx);
};

},{"./parser":3,"./runtime":4,"asap/raw":2}],2:[function(require,module,exports){
(function (process){
"use strict";

var domain; // The domain module is executed on demand
var hasSetImmediate = typeof setImmediate === "function";

// Use the fastest means possible to execute a task in its own turn, with
// priority over other events including network IO events in Node.js.
//
// An exception thrown by a task will permanently interrupt the processing of
// subsequent tasks. The higher level `asap` function ensures that if an
// exception is thrown by a task, that the task queue will continue flushing as
// soon as possible, but if you use `rawAsap` directly, you are responsible to
// either ensure that no exceptions are thrown from your task, or to manually
// call `rawAsap.requestFlush` if an exception is thrown.
module.exports = rawAsap;
function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    // Avoids a function call
    queue[queue.length] = task;
}

var queue = [];
// Once a flush has been requested, no further calls to `requestFlush` are
// necessary until the next `flush` completes.
var flushing = false;
// The position of the next task to execute in the task queue. This is
// preserved between calls to `flush` so that it can be resumed if
// a task throws an exception.
var index = 0;
// If a task schedules additional tasks recursively, the task queue can grown
// unbounded. To prevent memory excaustion, the task queue will periodically
// truncate already-completed tasks.
var capacity = 1024;

// The flush function processes all tasks that have been scheduled with
// `rawAsap` unless and until one of those tasks throws an exception.
// If a task throws an exception, `flush` ensures that its state will remain
// consistent and will resume where it left off when called again.
// However, `flush` does not make any arrangements to be called again if an
// exception is thrown.
function flush() {
    while (index < queue.length) {
        var currentIndex = index;
        // Advance the index before calling the task. This ensures that we will
        // begin flushing on the next task the task throws an error.
        index = index + 1;
        queue[currentIndex].call();
        // Prevent leaking memory for long chains of recursive calls to `asap`.
        // If we call `asap` within tasks scheduled by `asap`, the queue will
        // grow, but to avoid an O(n) walk for every task we execute, we don't
        // shift tasks off the queue after they have been executed.
        // Instead, we periodically shift 1024 tasks off the queue.
        if (index > capacity) {
            // Manually shift all values starting at the index back to the
            // beginning of the queue.
            for (var scan = 0; scan < index; scan++) {
                queue[scan] = queue[scan + index];
            }
            queue.length -= index;
            index = 0;
        }
    }
    queue.length = 0;
    index = 0;
    flushing = false;
}

rawAsap.requestFlush = requestFlush;
function requestFlush() {
    // Ensure flushing is not bound to any domain.
    // It is not sufficient to exit the domain, because domains exist on a stack.
    // To execute code outside of any domain, the following dance is necessary.
    var parentDomain = process.domain;
    if (parentDomain) {
        if (!domain) {
            // Lazy execute the domain module.
            // Only employed if the user elects to use domains.
            domain = require("domain");
        }
        domain.active = process.domain = null;
    }

    // `setImmediate` is slower that `process.nextTick`, but `process.nextTick`
    // cannot handle recursion.
    // `requestFlush` will only be called recursively from `asap.js`, to resume
    // flushing after an error is thrown into a domain.
    // Conveniently, `setImmediate` was introduced in the same version
    // `process.nextTick` started throwing recursion errors.
    if (flushing && hasSetImmediate) {
        setImmediate(flush);
    } else {
        process.nextTick(flush);
    }

    if (parentDomain) {
        domain.active = process.domain = parentDomain;
    }
}


}).call(this,require('_process'))
},{"_process":8,"domain":6}],3:[function(require,module,exports){
module.exports = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = [],
        peg$c1 = peg$FAILED,
        peg$c2 = function(elem) { return elem; },
        peg$c3 = function(elems) {
              return new BlockNode(elems);
            },
        peg$c4 = "if",
        peg$c5 = { type: "literal", value: "if", description: "\"if\"" },
        peg$c6 = "then",
        peg$c7 = { type: "literal", value: "then", description: "\"then\"" },
        peg$c8 = "else",
        peg$c9 = { type: "literal", value: "else", description: "\"else\"" },
        peg$c10 = function(cond, tbody, fbody) {
              return new IfElseNode(cond, tbody, fbody);
            },
        peg$c11 = function(cond, tbody) {
              return new IfElseNode(cond, tbody);
            },
        peg$c12 = "end",
        peg$c13 = { type: "literal", value: "end", description: "\"end\"" },
        peg$c14 = "for",
        peg$c15 = { type: "literal", value: "for", description: "\"for\"" },
        peg$c16 = "in",
        peg$c17 = { type: "literal", value: "in", description: "\"in\"" },
        peg$c18 = "do",
        peg$c19 = { type: "literal", value: "do", description: "\"do\"" },
        peg$c20 = function(sym, range, body) {
              return new ForInNode(sym, range, body);
            },
        peg$c21 = "while",
        peg$c22 = { type: "literal", value: "while", description: "\"while\"" },
        peg$c23 = function(cond, body) {
              return new WhileNode(cond, body);
            },
        peg$c24 = "begin",
        peg$c25 = { type: "literal", value: "begin", description: "\"begin\"" },
        peg$c26 = function(sym, body) {
              return new BeginNode(sym, body);
            },
        peg$c27 = "let",
        peg$c28 = { type: "literal", value: "let", description: "\"let\"" },
        peg$c29 = null,
        peg$c30 = "=",
        peg$c31 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c32 = function(sym, dims, value) {
              if (!dims) {
                return new AssignNode(sym, value);
              } else {
                return buildIndex(new VariableNode(sym), dims, value);
              }
            },
        peg$c33 = "delete",
        peg$c34 = { type: "literal", value: "delete", description: "\"delete\"" },
        peg$c35 = function(sym, dims) {
              if (!dims) {
                return new DeleteNode(sym);
              } else {
                return buildIndex(new VariableNode(sym), dims, $remove);
              }
            },
        peg$c36 = "call",
        peg$c37 = { type: "literal", value: "call", description: "\"call\"" },
        peg$c38 = function(expr, args) {
              return new FuncallNode(expr, args);
            },
        peg$c39 = function(sym, args) {
              return new FuncallNode(new VariableNode(sym), args);
            },
        peg$c40 = "break",
        peg$c41 = { type: "literal", value: "break", description: "\"break\"" },
        peg$c42 = function() {
              return new BreakNode;
            },
        peg$c43 = "next",
        peg$c44 = { type: "literal", value: "next", description: "\"next\"" },
        peg$c45 = function() {
              return new NextNode;
            },
        peg$c46 = "return",
        peg$c47 = { type: "literal", value: "return", description: "\"return\"" },
        peg$c48 = function(result) {
              return new ReturnNode(result);
            },
        peg$c49 = "--",
        peg$c50 = { type: "literal", value: "--", description: "\"--\"" },
        peg$c51 = /^[^\n]/,
        peg$c52 = { type: "class", value: "[^\\n]", description: "[^\\n]" },
        peg$c53 = function(text) {
              return new CommentNode(text);
            },
        peg$c54 = ",",
        peg$c55 = { type: "literal", value: ",", description: "\",\"" },
        peg$c56 = function(val) { return val; },
        peg$c57 = function(first, rest) {
              return [first].concat(rest);
            },
        peg$c58 = function(op, e) { return [op, e]; },
        peg$c59 = function(first, rest) {
              return buildLogicalOp(first, rest);
            },
        peg$c60 = "and",
        peg$c61 = { type: "literal", value: "and", description: "\"and\"" },
        peg$c62 = function() { return 'and'; },
        peg$c63 = "or",
        peg$c64 = { type: "literal", value: "or", description: "\"or\"" },
        peg$c65 = function() { return 'or';  },
        peg$c66 = "not",
        peg$c67 = { type: "literal", value: "not", description: "\"not\"" },
        peg$c68 = function(comp) {
              return new LogicalOpNode('not', null, comp);
            },
        peg$c69 = function(left, op, right) {
              return new BinaryOpNode(op, left, right);
            },
        peg$c70 = "(",
        peg$c71 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c72 = ")",
        peg$c73 = { type: "literal", value: ")", description: "\")\"" },
        peg$c74 = function(cond) {
              return cond;
            },
        peg$c75 = "!=",
        peg$c76 = { type: "literal", value: "!=", description: "\"!=\"" },
        peg$c77 = "<=",
        peg$c78 = { type: "literal", value: "<=", description: "\"<=\"" },
        peg$c79 = "<",
        peg$c80 = { type: "literal", value: "<", description: "\"<\"" },
        peg$c81 = ">=",
        peg$c82 = { type: "literal", value: ">=", description: "\">=\"" },
        peg$c83 = ">",
        peg$c84 = { type: "literal", value: ">", description: "\">\"" },
        peg$c85 = function(first, rest) {
              return buildBinaryOp(first, rest);
            },
        peg$c86 = "+",
        peg$c87 = { type: "literal", value: "+", description: "\"+\"" },
        peg$c88 = "-",
        peg$c89 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c90 = "*",
        peg$c91 = { type: "literal", value: "*", description: "\"*\"" },
        peg$c92 = "/",
        peg$c93 = { type: "literal", value: "/", description: "\"/\"" },
        peg$c94 = "%",
        peg$c95 = { type: "literal", value: "%", description: "\"%\"" },
        peg$c96 = function(e, op) { return [op, e]; },
        peg$c97 = function(rest, last) {
              return buildBinaryOpRight(rest, last);
            },
        peg$c98 = "^",
        peg$c99 = { type: "literal", value: "^", description: "\"^\"" },
        peg$c100 = function(op, num) {
              // handle +/- number in the parser
              return new LiteralNode(runtime.handle(num).unaryops[op](num));
            },
        peg$c101 = function(op, right) {
              return new UnaryOpNode(op, right);
            },
        peg$c102 = function(target, args) {
              return new FuncallNode(target, args);
            },
        peg$c103 = function(sym, dims) {
              if (!dims) {
                return new VariableNode(sym);
              } else {
                return buildIndex(new VariableNode(sym), dims);
              }
            },
        peg$c104 = function(dim) { return dim; },
        peg$c105 = "[",
        peg$c106 = { type: "literal", value: "[", description: "\"[\"" },
        peg$c107 = "]",
        peg$c108 = { type: "literal", value: "]", description: "\"]\"" },
        peg$c109 = function(v) {
              return v;
            },
        peg$c110 = ".",
        peg$c111 = { type: "literal", value: ".", description: "\".\"" },
        peg$c112 = function(sym) {
              return new LiteralNode(sym);
            },
        peg$c113 = function(lit) {
              return new LiteralNode(lit);
            },
        peg$c114 = function(val) {
              return val;
            },
        peg$c115 = "none",
        peg$c116 = { type: "literal", value: "none", description: "\"none\"" },
        peg$c117 = function() { return null; },
        peg$c118 = "true",
        peg$c119 = { type: "literal", value: "true", description: "\"true\"" },
        peg$c120 = function() { return true; },
        peg$c121 = "false",
        peg$c122 = { type: "literal", value: "false", description: "\"false\"" },
        peg$c123 = function() { return false; },
        peg$c124 = "infinity",
        peg$c125 = { type: "literal", value: "infinity", description: "\"infinity\"" },
        peg$c126 = function() { return Infinity; },
        peg$c127 = /^[eE]/,
        peg$c128 = { type: "class", value: "[eE]", description: "[eE]" },
        peg$c129 = /^[\-+]/,
        peg$c130 = { type: "class", value: "[\\-+]", description: "[\\-+]" },
        peg$c131 = function(num) {
              return parseFloat(num);
            },
        peg$c132 = /^[0-9]/,
        peg$c133 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c134 = "\"",
        peg$c135 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c136 = function(chars) { return chars.join(''); },
        peg$c137 = "\"\"",
        peg$c138 = { type: "literal", value: "\"\"", description: "\"\\\"\\\"\"" },
        peg$c139 = function() { return '"'; },
        peg$c140 = /^[^"]/,
        peg$c141 = { type: "class", value: "[^\"]", description: "[^\"]" },
        peg$c142 = void 0,
        peg$c143 = /^[a-z_]/i,
        peg$c144 = { type: "class", value: "[a-z_]i", description: "[a-z_]i" },
        peg$c145 = /^[a-z0-9_]/i,
        peg$c146 = { type: "class", value: "[a-z0-9_]i", description: "[a-z0-9_]i" },
        peg$c147 = /^[ \t]/,
        peg$c148 = { type: "class", value: "[ \\t]", description: "[ \\t]" },
        peg$c149 = /^[\n;]/,
        peg$c150 = { type: "class", value: "[\\n;]", description: "[\\n;]" },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0;

      s0 = peg$parseBlock();

      return s0;
    }

    function peg$parseBlock() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$currPos;
      s3 = peg$parse__();
      if (s3 !== peg$FAILED) {
        s4 = peg$parseBlockElement();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseEOL();
          if (s5 !== peg$FAILED) {
            peg$reportedPos = s2;
            s3 = peg$c2(s4);
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c1;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c1;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$c1;
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$currPos;
        s3 = peg$parse__();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseBlockElement();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseEOL();
            if (s5 !== peg$FAILED) {
              peg$reportedPos = s2;
              s3 = peg$c2(s4);
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$c1;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c1;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c1;
        }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c3(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseBlockElement() {
      var s0;

      s0 = peg$parseControl();
      if (s0 === peg$FAILED) {
        s0 = peg$parseStatement();
        if (s0 === peg$FAILED) {
          s0 = peg$parseComment();
        }
      }

      return s0;
    }

    function peg$parseControl() {
      var s0;

      s0 = peg$parseIfElse();
      if (s0 === peg$FAILED) {
        s0 = peg$parseForIn();
        if (s0 === peg$FAILED) {
          s0 = peg$parseWhile();
          if (s0 === peg$FAILED) {
            s0 = peg$parseBegin();
          }
        }
      }

      return s0;
    }

    function peg$parseIfElse() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c4) {
          s2 = peg$c4;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c5); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseWB();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse__();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseValue();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse__();
                if (s6 !== peg$FAILED) {
                  if (input.substr(peg$currPos, 4) === peg$c6) {
                    s7 = peg$c6;
                    peg$currPos += 4;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c7); }
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parseWB();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parse__();
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parseStatement();
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parse__();
                          if (s11 !== peg$FAILED) {
                            if (input.substr(peg$currPos, 4) === peg$c8) {
                              s12 = peg$c8;
                              peg$currPos += 4;
                            } else {
                              s12 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c9); }
                            }
                            if (s12 !== peg$FAILED) {
                              s13 = peg$parseWB();
                              if (s13 !== peg$FAILED) {
                                s14 = peg$parse__();
                                if (s14 !== peg$FAILED) {
                                  s15 = peg$parseStatement();
                                  if (s15 !== peg$FAILED) {
                                    peg$reportedPos = s0;
                                    s1 = peg$c10(s5, s10, s15);
                                    s0 = s1;
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c1;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c1;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c1;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse__();
        if (s1 !== peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c4) {
            s2 = peg$c4;
            peg$currPos += 2;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c5); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseWB();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse__();
              if (s4 !== peg$FAILED) {
                s5 = peg$parseValue();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parse__();
                  if (s6 !== peg$FAILED) {
                    if (input.substr(peg$currPos, 4) === peg$c6) {
                      s7 = peg$c6;
                      peg$currPos += 4;
                    } else {
                      s7 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c7); }
                    }
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parseWB();
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parse__();
                        if (s9 !== peg$FAILED) {
                          s10 = peg$parseStatement();
                          if (s10 !== peg$FAILED) {
                            peg$reportedPos = s0;
                            s1 = peg$c11(s5, s10);
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parse__();
          if (s1 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c4) {
              s2 = peg$c4;
              peg$currPos += 2;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c5); }
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parseWB();
              if (s3 !== peg$FAILED) {
                s4 = peg$parse__();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parseValue();
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parse__();
                    if (s6 !== peg$FAILED) {
                      if (input.substr(peg$currPos, 4) === peg$c6) {
                        s7 = peg$c6;
                        peg$currPos += 4;
                      } else {
                        s7 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c7); }
                      }
                      if (s7 !== peg$FAILED) {
                        s8 = peg$parseEOL();
                        if (s8 !== peg$FAILED) {
                          s9 = peg$parseBlock();
                          if (s9 !== peg$FAILED) {
                            s10 = peg$parse__();
                            if (s10 !== peg$FAILED) {
                              if (input.substr(peg$currPos, 4) === peg$c8) {
                                s11 = peg$c8;
                                peg$currPos += 4;
                              } else {
                                s11 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c9); }
                              }
                              if (s11 !== peg$FAILED) {
                                s12 = peg$parseEOL();
                                if (s12 !== peg$FAILED) {
                                  s13 = peg$parseBlock();
                                  if (s13 !== peg$FAILED) {
                                    s14 = peg$parse__();
                                    if (s14 !== peg$FAILED) {
                                      if (input.substr(peg$currPos, 3) === peg$c12) {
                                        s15 = peg$c12;
                                        peg$currPos += 3;
                                      } else {
                                        s15 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$c13); }
                                      }
                                      if (s15 !== peg$FAILED) {
                                        peg$reportedPos = s0;
                                        s1 = peg$c10(s5, s9, s13);
                                        s0 = s1;
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$c1;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c1;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c1;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c1;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parse__();
            if (s1 !== peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c4) {
                s2 = peg$c4;
                peg$currPos += 2;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c5); }
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parseWB();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parse__();
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parseValue();
                    if (s5 !== peg$FAILED) {
                      s6 = peg$parse__();
                      if (s6 !== peg$FAILED) {
                        if (input.substr(peg$currPos, 4) === peg$c6) {
                          s7 = peg$c6;
                          peg$currPos += 4;
                        } else {
                          s7 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c7); }
                        }
                        if (s7 !== peg$FAILED) {
                          s8 = peg$parseEOL();
                          if (s8 !== peg$FAILED) {
                            s9 = peg$parseBlock();
                            if (s9 !== peg$FAILED) {
                              s10 = peg$parse__();
                              if (s10 !== peg$FAILED) {
                                if (input.substr(peg$currPos, 3) === peg$c12) {
                                  s11 = peg$c12;
                                  peg$currPos += 3;
                                } else {
                                  s11 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c13); }
                                }
                                if (s11 !== peg$FAILED) {
                                  peg$reportedPos = s0;
                                  s1 = peg$c11(s5, s9);
                                  s0 = s1;
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c1;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c1;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          }
        }
      }

      return s0;
    }

    function peg$parseForIn() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c14) {
          s2 = peg$c14;
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c15); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseWB();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse__();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseSymbol();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse__();
                if (s6 !== peg$FAILED) {
                  if (input.substr(peg$currPos, 2) === peg$c16) {
                    s7 = peg$c16;
                    peg$currPos += 2;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c17); }
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parseWB();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parse__();
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parseValue();
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parse__();
                          if (s11 !== peg$FAILED) {
                            if (input.substr(peg$currPos, 2) === peg$c18) {
                              s12 = peg$c18;
                              peg$currPos += 2;
                            } else {
                              s12 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c19); }
                            }
                            if (s12 !== peg$FAILED) {
                              s13 = peg$parseWB();
                              if (s13 !== peg$FAILED) {
                                s14 = peg$parse__();
                                if (s14 !== peg$FAILED) {
                                  s15 = peg$parseStatement();
                                  if (s15 !== peg$FAILED) {
                                    peg$reportedPos = s0;
                                    s1 = peg$c20(s5, s10, s15);
                                    s0 = s1;
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c1;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c1;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c1;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse__();
        if (s1 !== peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c14) {
            s2 = peg$c14;
            peg$currPos += 3;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c15); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseWB();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse__();
              if (s4 !== peg$FAILED) {
                s5 = peg$parseSymbol();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parse__();
                  if (s6 !== peg$FAILED) {
                    if (input.substr(peg$currPos, 2) === peg$c16) {
                      s7 = peg$c16;
                      peg$currPos += 2;
                    } else {
                      s7 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c17); }
                    }
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parseWB();
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parse__();
                        if (s9 !== peg$FAILED) {
                          s10 = peg$parseValue();
                          if (s10 !== peg$FAILED) {
                            s11 = peg$parse__();
                            if (s11 !== peg$FAILED) {
                              if (input.substr(peg$currPos, 2) === peg$c18) {
                                s12 = peg$c18;
                                peg$currPos += 2;
                              } else {
                                s12 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c19); }
                              }
                              if (s12 !== peg$FAILED) {
                                s13 = peg$parseEOL();
                                if (s13 !== peg$FAILED) {
                                  s14 = peg$parseBlock();
                                  if (s14 !== peg$FAILED) {
                                    s15 = peg$parse__();
                                    if (s15 !== peg$FAILED) {
                                      if (input.substr(peg$currPos, 3) === peg$c12) {
                                        s16 = peg$c12;
                                        peg$currPos += 3;
                                      } else {
                                        s16 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$c13); }
                                      }
                                      if (s16 !== peg$FAILED) {
                                        peg$reportedPos = s0;
                                        s1 = peg$c20(s5, s10, s14);
                                        s0 = s1;
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$c1;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c1;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c1;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c1;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parseWhile() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c21) {
          s2 = peg$c21;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c22); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseWB();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse__();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseValue();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse__();
                if (s6 !== peg$FAILED) {
                  if (input.substr(peg$currPos, 2) === peg$c18) {
                    s7 = peg$c18;
                    peg$currPos += 2;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c19); }
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parseWB();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parse__();
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parseStatement();
                        if (s10 !== peg$FAILED) {
                          peg$reportedPos = s0;
                          s1 = peg$c23(s5, s10);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse__();
        if (s1 !== peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c21) {
            s2 = peg$c21;
            peg$currPos += 5;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c22); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseWB();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse__();
              if (s4 !== peg$FAILED) {
                s5 = peg$parseValue();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parse__();
                  if (s6 !== peg$FAILED) {
                    if (input.substr(peg$currPos, 2) === peg$c18) {
                      s7 = peg$c18;
                      peg$currPos += 2;
                    } else {
                      s7 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c19); }
                    }
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parseEOL();
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parseBlock();
                        if (s9 !== peg$FAILED) {
                          s10 = peg$parse__();
                          if (s10 !== peg$FAILED) {
                            if (input.substr(peg$currPos, 3) === peg$c12) {
                              s11 = peg$c12;
                              peg$currPos += 3;
                            } else {
                              s11 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c13); }
                            }
                            if (s11 !== peg$FAILED) {
                              peg$reportedPos = s0;
                              s1 = peg$c23(s5, s9);
                              s0 = s1;
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parseBegin() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c24) {
          s2 = peg$c24;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c25); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseWB();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse__();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseSymbol();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse__();
                if (s6 !== peg$FAILED) {
                  if (input.substr(peg$currPos, 2) === peg$c18) {
                    s7 = peg$c18;
                    peg$currPos += 2;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c19); }
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parseWB();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parse__();
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parseStatement();
                        if (s10 !== peg$FAILED) {
                          peg$reportedPos = s0;
                          s1 = peg$c26(s5, s10);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse__();
        if (s1 !== peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c24) {
            s2 = peg$c24;
            peg$currPos += 5;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c25); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseWB();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse__();
              if (s4 !== peg$FAILED) {
                s5 = peg$parseSymbol();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parse__();
                  if (s6 !== peg$FAILED) {
                    if (input.substr(peg$currPos, 2) === peg$c18) {
                      s7 = peg$c18;
                      peg$currPos += 2;
                    } else {
                      s7 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c19); }
                    }
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parseEOL();
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parseBlock();
                        if (s9 !== peg$FAILED) {
                          s10 = peg$parse__();
                          if (s10 !== peg$FAILED) {
                            if (input.substr(peg$currPos, 3) === peg$c12) {
                              s11 = peg$c12;
                              peg$currPos += 3;
                            } else {
                              s11 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c13); }
                            }
                            if (s11 !== peg$FAILED) {
                              peg$reportedPos = s0;
                              s1 = peg$c26(s5, s9);
                              s0 = s1;
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parseStatement() {
      var s0;

      s0 = peg$parseAssign();
      if (s0 === peg$FAILED) {
        s0 = peg$parseDelete();
        if (s0 === peg$FAILED) {
          s0 = peg$parseCall();
          if (s0 === peg$FAILED) {
            s0 = peg$parseFlow();
          }
        }
      }

      return s0;
    }

    function peg$parseAssign() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c27) {
          s2 = peg$c27;
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c28); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseWB();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse__();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseSymbol();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse__();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseDimensions();
                  if (s7 === peg$FAILED) {
                    s7 = peg$c29;
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse__();
                    if (s8 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 61) {
                        s9 = peg$c30;
                        peg$currPos++;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c31); }
                      }
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parse__();
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parseValue();
                          if (s11 !== peg$FAILED) {
                            peg$reportedPos = s0;
                            s1 = peg$c32(s5, s7, s11);
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseDelete() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c33) {
          s2 = peg$c33;
          peg$currPos += 6;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c34); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseWB();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse__();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseSymbol();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse__();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseDimensions();
                  if (s7 === peg$FAILED) {
                    s7 = peg$c29;
                  }
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c35(s5, s7);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseCall() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c36) {
        s1 = peg$c36;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c37); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseWB();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse__();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseIndexExpr();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse__();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseValues();
                if (s6 === peg$FAILED) {
                  s6 = peg$c29;
                }
                if (s6 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c38(s4, s6);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseSymbol();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse__();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseValues();
            if (s3 === peg$FAILED) {
              s3 = peg$c29;
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c39(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parseFlow() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c40) {
          s2 = peg$c40;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c41); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseWB();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c42();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse__();
        if (s1 !== peg$FAILED) {
          if (input.substr(peg$currPos, 4) === peg$c43) {
            s2 = peg$c43;
            peg$currPos += 4;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c44); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseWB();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c45();
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parse__();
          if (s1 !== peg$FAILED) {
            if (input.substr(peg$currPos, 6) === peg$c46) {
              s2 = peg$c46;
              peg$currPos += 6;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c47); }
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parseWB();
              if (s3 !== peg$FAILED) {
                s4 = peg$parse__();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parseValue();
                  if (s5 === peg$FAILED) {
                    s5 = peg$c29;
                  }
                  if (s5 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c48(s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        }
      }

      return s0;
    }

    function peg$parseComment() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c49) {
          s2 = peg$c49;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c50); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse__();
          if (s3 !== peg$FAILED) {
            s4 = peg$currPos;
            s5 = [];
            if (peg$c51.test(input.charAt(peg$currPos))) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c52); }
            }
            while (s6 !== peg$FAILED) {
              s5.push(s6);
              if (peg$c51.test(input.charAt(peg$currPos))) {
                s6 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c52); }
              }
            }
            if (s5 !== peg$FAILED) {
              s5 = input.substring(s4, peg$currPos);
            }
            s4 = s5;
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c53(s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseValues() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseValue();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s5 = peg$c54;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c55); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseValue();
              if (s7 !== peg$FAILED) {
                peg$reportedPos = s3;
                s4 = peg$c56(s7);
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c1;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse__();
          if (s4 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s5 = peg$c54;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c55); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse__();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseValue();
                if (s7 !== peg$FAILED) {
                  peg$reportedPos = s3;
                  s4 = peg$c56(s7);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c57(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseValue() {
      var s0;

      s0 = peg$parseCondExpr();
      if (s0 === peg$FAILED) {
        s0 = peg$parseAddExpr();
      }

      return s0;
    }

    function peg$parseCondExpr() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseNotExpr();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseCondOp();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseNotExpr();
              if (s7 !== peg$FAILED) {
                peg$reportedPos = s3;
                s4 = peg$c58(s5, s7);
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c1;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse__();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseCondOp();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse__();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseNotExpr();
                if (s7 !== peg$FAILED) {
                  peg$reportedPos = s3;
                  s4 = peg$c58(s5, s7);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c59(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseCondOp() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c60) {
        s1 = peg$c60;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c61); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseWB();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c62();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c63) {
          s1 = peg$c63;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c64); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseWB();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c65();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parseNotExpr() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c66) {
        s1 = peg$c66;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c67); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseWB();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse__();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseRelExpr();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c68(s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseRelExpr();
      }

      return s0;
    }

    function peg$parseRelExpr() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseAddExpr();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse__();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseRelOp();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse__();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseAddExpr();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c69(s1, s3, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 40) {
          s1 = peg$c70;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c71); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse__();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseCondExpr();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse__();
              if (s4 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 41) {
                  s5 = peg$c72;
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c73); }
                }
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c74(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parseRelOp() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 61) {
        s0 = peg$c30;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c31); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c75) {
          s0 = peg$c75;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c76); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c77) {
            s0 = peg$c77;
            peg$currPos += 2;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c78); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 60) {
              s0 = peg$c79;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c80); }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c81) {
                s0 = peg$c81;
                peg$currPos += 2;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c82); }
              }
              if (s0 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 62) {
                  s0 = peg$c83;
                  peg$currPos++;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c84); }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseAddExpr() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseMultExpr();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseAddOp();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseMultExpr();
              if (s7 !== peg$FAILED) {
                peg$reportedPos = s3;
                s4 = peg$c58(s5, s7);
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c1;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse__();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseAddOp();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse__();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseMultExpr();
                if (s7 !== peg$FAILED) {
                  peg$reportedPos = s3;
                  s4 = peg$c58(s5, s7);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c85(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseAddOp() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 43) {
        s0 = peg$c86;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c87); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 45) {
          s0 = peg$c88;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c89); }
        }
      }

      return s0;
    }

    function peg$parseMultExpr() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parsePowExpr();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseMultOp();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$parsePowExpr();
              if (s7 !== peg$FAILED) {
                peg$reportedPos = s3;
                s4 = peg$c58(s5, s7);
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c1;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse__();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseMultOp();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse__();
              if (s6 !== peg$FAILED) {
                s7 = peg$parsePowExpr();
                if (s7 !== peg$FAILED) {
                  peg$reportedPos = s3;
                  s4 = peg$c58(s5, s7);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c85(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseMultOp() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 42) {
        s0 = peg$c90;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c91); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 47) {
          s0 = peg$c92;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c93); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 37) {
            s0 = peg$c94;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c95); }
          }
        }
      }

      return s0;
    }

    function peg$parsePowExpr() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$currPos;
      s3 = peg$parseUnaryExpr();
      if (s3 !== peg$FAILED) {
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsePowOp();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              peg$reportedPos = s2;
              s3 = peg$c96(s3, s5);
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$c1;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c1;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c1;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$c1;
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$currPos;
        s3 = peg$parseUnaryExpr();
        if (s3 !== peg$FAILED) {
          s4 = peg$parse__();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsePowOp();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse__();
              if (s6 !== peg$FAILED) {
                peg$reportedPos = s2;
                s3 = peg$c96(s3, s5);
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c1;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c1;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c1;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c1;
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseUnaryExpr();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c97(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsePowOp() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 94) {
        s0 = peg$c98;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c99); }
      }

      return s0;
    }

    function peg$parseUnaryExpr() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseAddOp();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse__();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseNumber();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c100(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseAddOp();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse__();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseCallExpr();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c101(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parseCallExpr();
        }
      }

      return s0;
    }

    function peg$parseCallExpr() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseIndexExpr();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse__();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 40) {
            s3 = peg$c70;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c71); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse__();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseValues();
              if (s5 === peg$FAILED) {
                s5 = peg$c29;
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse__();
                if (s6 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 41) {
                    s7 = peg$c72;
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c73); }
                  }
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c102(s1, s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseIndexExpr();
      }

      return s0;
    }

    function peg$parseIndexExpr() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseSymbol();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse__();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseDimensions();
          if (s3 === peg$FAILED) {
            s3 = peg$c29;
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c103(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parsePrimaryExpr();
      }

      return s0;
    }

    function peg$parseDimensions() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseDimension();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseDimension();
          if (s5 !== peg$FAILED) {
            peg$reportedPos = s3;
            s4 = peg$c104(s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c1;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse__();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseDimension();
            if (s5 !== peg$FAILED) {
              peg$reportedPos = s3;
              s4 = peg$c104(s5);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c57(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseDimension() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 91) {
        s1 = peg$c105;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c106); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse__();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseValue();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse__();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 93) {
                s5 = peg$c107;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c108); }
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c109(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 46) {
          s1 = peg$c110;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c111); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseSymbol();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c112(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parsePrimaryExpr() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseLiteral();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c113(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 40) {
          s1 = peg$c70;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c71); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse__();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseValue();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse__();
              if (s4 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 41) {
                  s5 = peg$c72;
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c73); }
                }
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c114(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parseLiteral() {
      var s0;

      s0 = peg$parseNone();
      if (s0 === peg$FAILED) {
        s0 = peg$parseBoolean();
        if (s0 === peg$FAILED) {
          s0 = peg$parseNumber();
          if (s0 === peg$FAILED) {
            s0 = peg$parseString();
          }
        }
      }

      return s0;
    }

    function peg$parseNone() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c115) {
        s1 = peg$c115;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c116); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseWB();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c117();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseBoolean() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c118) {
        s1 = peg$c118;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c119); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseWB();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c120();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 5) === peg$c121) {
          s1 = peg$c121;
          peg$currPos += 5;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c122); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseWB();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c123();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parseNumber() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 8) === peg$c124) {
        s1 = peg$c124;
        peg$currPos += 8;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c125); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseWB();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c126();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$currPos;
        s3 = peg$parseDigits();
        if (s3 !== peg$FAILED) {
          s4 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 46) {
            s5 = peg$c110;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c111); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parseDigits();
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$c1;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$c1;
          }
          if (s4 === peg$FAILED) {
            s4 = peg$c29;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$currPos;
            if (peg$c127.test(input.charAt(peg$currPos))) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c128); }
            }
            if (s6 !== peg$FAILED) {
              if (peg$c129.test(input.charAt(peg$currPos))) {
                s7 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c130); }
              }
              if (s7 === peg$FAILED) {
                s7 = peg$c29;
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parseDigits();
                if (s8 !== peg$FAILED) {
                  s6 = [s6, s7, s8];
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$c1;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$c1;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$c1;
            }
            if (s5 === peg$FAILED) {
              s5 = peg$c29;
            }
            if (s5 !== peg$FAILED) {
              s3 = [s3, s4, s5];
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$c1;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c1;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c1;
        }
        if (s2 !== peg$FAILED) {
          s2 = input.substring(s1, peg$currPos);
        }
        s1 = s2;
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c131(s1);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseDigits() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c132.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c133); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c132.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c133); }
          }
        }
      } else {
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseString() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c134;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c135); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseChar();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseChar();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s3 = peg$c134;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c135); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c136(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseChar() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c137) {
        s1 = peg$c137;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c138); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c139();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        if (peg$c140.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c141); }
        }
      }

      return s0;
    }

    function peg$parseSymbol() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$currPos;
      peg$silentFails++;
      s3 = peg$parseReserved();
      peg$silentFails--;
      if (s3 === peg$FAILED) {
        s2 = peg$c142;
      } else {
        peg$currPos = s2;
        s2 = peg$c1;
      }
      if (s2 !== peg$FAILED) {
        if (peg$c143.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c144); }
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          if (peg$c145.test(input.charAt(peg$currPos))) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c146); }
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            if (peg$c145.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c146); }
            }
          }
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$c1;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c1;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseReserved() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c115) {
        s1 = peg$c115;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c116); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseWB();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 4) === peg$c118) {
          s1 = peg$c118;
          peg$currPos += 4;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c119); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseWB();
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 5) === peg$c121) {
            s1 = peg$c121;
            peg$currPos += 5;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c122); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parseWB();
            if (s2 !== peg$FAILED) {
              s1 = [s1, s2];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 8) === peg$c124) {
              s1 = peg$c124;
              peg$currPos += 8;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c125); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parseWB();
              if (s2 !== peg$FAILED) {
                s1 = [s1, s2];
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 2) === peg$c4) {
                s1 = peg$c4;
                peg$currPos += 2;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c5); }
              }
              if (s1 !== peg$FAILED) {
                s2 = peg$parseWB();
                if (s2 !== peg$FAILED) {
                  s1 = [s1, s2];
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 4) === peg$c8) {
                  s1 = peg$c8;
                  peg$currPos += 4;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c9); }
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$parseWB();
                  if (s2 !== peg$FAILED) {
                    s1 = [s1, s2];
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 3) === peg$c12) {
                    s1 = peg$c12;
                    peg$currPos += 3;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c13); }
                  }
                  if (s1 !== peg$FAILED) {
                    s2 = peg$parseWB();
                    if (s2 !== peg$FAILED) {
                      s1 = [s1, s2];
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 3) === peg$c14) {
                      s1 = peg$c14;
                      peg$currPos += 3;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c15); }
                    }
                    if (s1 !== peg$FAILED) {
                      s2 = peg$parseWB();
                      if (s2 !== peg$FAILED) {
                        s1 = [s1, s2];
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      if (input.substr(peg$currPos, 2) === peg$c16) {
                        s1 = peg$c16;
                        peg$currPos += 2;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c17); }
                      }
                      if (s1 !== peg$FAILED) {
                        s2 = peg$parseWB();
                        if (s2 !== peg$FAILED) {
                          s1 = [s1, s2];
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                      if (s0 === peg$FAILED) {
                        s0 = peg$currPos;
                        if (input.substr(peg$currPos, 5) === peg$c21) {
                          s1 = peg$c21;
                          peg$currPos += 5;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c22); }
                        }
                        if (s1 !== peg$FAILED) {
                          s2 = peg$parseWB();
                          if (s2 !== peg$FAILED) {
                            s1 = [s1, s2];
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                        if (s0 === peg$FAILED) {
                          s0 = peg$currPos;
                          if (input.substr(peg$currPos, 5) === peg$c24) {
                            s1 = peg$c24;
                            peg$currPos += 5;
                          } else {
                            s1 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c25); }
                          }
                          if (s1 !== peg$FAILED) {
                            s2 = peg$parseWB();
                            if (s2 !== peg$FAILED) {
                              s1 = [s1, s2];
                              s0 = s1;
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                          if (s0 === peg$FAILED) {
                            s0 = peg$currPos;
                            if (input.substr(peg$currPos, 5) === peg$c40) {
                              s1 = peg$c40;
                              peg$currPos += 5;
                            } else {
                              s1 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c41); }
                            }
                            if (s1 !== peg$FAILED) {
                              s2 = peg$parseWB();
                              if (s2 !== peg$FAILED) {
                                s1 = [s1, s2];
                                s0 = s1;
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c1;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                            if (s0 === peg$FAILED) {
                              s0 = peg$currPos;
                              if (input.substr(peg$currPos, 4) === peg$c43) {
                                s1 = peg$c43;
                                peg$currPos += 4;
                              } else {
                                s1 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c44); }
                              }
                              if (s1 !== peg$FAILED) {
                                s2 = peg$parseWB();
                                if (s2 !== peg$FAILED) {
                                  s1 = [s1, s2];
                                  s0 = s1;
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c1;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c1;
                              }
                              if (s0 === peg$FAILED) {
                                s0 = peg$currPos;
                                if (input.substr(peg$currPos, 6) === peg$c46) {
                                  s1 = peg$c46;
                                  peg$currPos += 6;
                                } else {
                                  s1 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c47); }
                                }
                                if (s1 !== peg$FAILED) {
                                  s2 = peg$parseWB();
                                  if (s2 !== peg$FAILED) {
                                    s1 = [s1, s2];
                                    s0 = s1;
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c1;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c1;
                                }
                                if (s0 === peg$FAILED) {
                                  s0 = peg$currPos;
                                  if (input.substr(peg$currPos, 3) === peg$c27) {
                                    s1 = peg$c27;
                                    peg$currPos += 3;
                                  } else {
                                    s1 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c28); }
                                  }
                                  if (s1 !== peg$FAILED) {
                                    s2 = peg$parseWB();
                                    if (s2 !== peg$FAILED) {
                                      s1 = [s1, s2];
                                      s0 = s1;
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$c1;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c1;
                                  }
                                  if (s0 === peg$FAILED) {
                                    s0 = peg$currPos;
                                    if (input.substr(peg$currPos, 6) === peg$c33) {
                                      s1 = peg$c33;
                                      peg$currPos += 6;
                                    } else {
                                      s1 = peg$FAILED;
                                      if (peg$silentFails === 0) { peg$fail(peg$c34); }
                                    }
                                    if (s1 !== peg$FAILED) {
                                      s2 = peg$parseWB();
                                      if (s2 !== peg$FAILED) {
                                        s1 = [s1, s2];
                                        s0 = s1;
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$c1;
                                    }
                                    if (s0 === peg$FAILED) {
                                      s0 = peg$currPos;
                                      if (input.substr(peg$currPos, 4) === peg$c36) {
                                        s1 = peg$c36;
                                        peg$currPos += 4;
                                      } else {
                                        s1 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$c37); }
                                      }
                                      if (s1 !== peg$FAILED) {
                                        s2 = peg$parseWB();
                                        if (s2 !== peg$FAILED) {
                                          s1 = [s1, s2];
                                          s0 = s1;
                                        } else {
                                          peg$currPos = s0;
                                          s0 = peg$c1;
                                        }
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$c1;
                                      }
                                      if (s0 === peg$FAILED) {
                                        s0 = peg$currPos;
                                        if (input.substr(peg$currPos, 3) === peg$c60) {
                                          s1 = peg$c60;
                                          peg$currPos += 3;
                                        } else {
                                          s1 = peg$FAILED;
                                          if (peg$silentFails === 0) { peg$fail(peg$c61); }
                                        }
                                        if (s1 !== peg$FAILED) {
                                          s2 = peg$parseWB();
                                          if (s2 !== peg$FAILED) {
                                            s1 = [s1, s2];
                                            s0 = s1;
                                          } else {
                                            peg$currPos = s0;
                                            s0 = peg$c1;
                                          }
                                        } else {
                                          peg$currPos = s0;
                                          s0 = peg$c1;
                                        }
                                        if (s0 === peg$FAILED) {
                                          s0 = peg$currPos;
                                          if (input.substr(peg$currPos, 2) === peg$c63) {
                                            s1 = peg$c63;
                                            peg$currPos += 2;
                                          } else {
                                            s1 = peg$FAILED;
                                            if (peg$silentFails === 0) { peg$fail(peg$c64); }
                                          }
                                          if (s1 !== peg$FAILED) {
                                            s2 = peg$parseWB();
                                            if (s2 !== peg$FAILED) {
                                              s1 = [s1, s2];
                                              s0 = s1;
                                            } else {
                                              peg$currPos = s0;
                                              s0 = peg$c1;
                                            }
                                          } else {
                                            peg$currPos = s0;
                                            s0 = peg$c1;
                                          }
                                          if (s0 === peg$FAILED) {
                                            s0 = peg$currPos;
                                            if (input.substr(peg$currPos, 3) === peg$c66) {
                                              s1 = peg$c66;
                                              peg$currPos += 3;
                                            } else {
                                              s1 = peg$FAILED;
                                              if (peg$silentFails === 0) { peg$fail(peg$c67); }
                                            }
                                            if (s1 !== peg$FAILED) {
                                              s2 = peg$parseWB();
                                              if (s2 !== peg$FAILED) {
                                                s1 = [s1, s2];
                                                s0 = s1;
                                              } else {
                                                peg$currPos = s0;
                                                s0 = peg$c1;
                                              }
                                            } else {
                                              peg$currPos = s0;
                                              s0 = peg$c1;
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseWB() {
      var s0, s1;

      s0 = peg$currPos;
      peg$silentFails++;
      if (peg$c143.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c144); }
      }
      peg$silentFails--;
      if (s1 === peg$FAILED) {
        s0 = peg$c142;
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parse__() {
      var s0, s1;

      s0 = [];
      if (peg$c147.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c148); }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (peg$c147.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c148); }
        }
      }

      return s0;
    }

    function peg$parseEOL() {
      var s0, s1, s2, s3;

      s0 = [];
      s1 = peg$currPos;
      s2 = peg$parse__();
      if (s2 !== peg$FAILED) {
        if (peg$c149.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c150); }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$c1;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          s1 = peg$currPos;
          s2 = peg$parse__();
          if (s2 !== peg$FAILED) {
            if (peg$c149.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c150); }
            }
            if (s3 !== peg$FAILED) {
              s2 = [s2, s3];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$c1;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c1;
          }
        }
      } else {
        s0 = peg$c1;
      }

      return s0;
    }


      var runtime = require('./runtime');

      function mixin(object, properties) {
        Object.keys(properties).forEach(function(prop) {
          object[prop] = properties[prop];
        });
      }

      function Node() {}

      Node.extend = function(options) {
        var delegate = options.constructor,
            ctor = function() {
              // grab the info about where we are in the source
              this._text = text();
              this._offset = offset();
              this._line = line();
              this._column = column();

              // copy from proto so we can inspect it
              this._node = this.node;

              delegate.apply(this, arguments);
            };

        ctor.prototype = Object.create(Node.prototype);
        options.constructor = ctor;
        mixin(ctor.prototype, options);
        return ctor;
      };

      var BlockNode = Node.extend({
        node: 'BlockNode',

        constructor: function(elems) {
          this.elems = elems || [];
        }
      });

      var IfElseNode = Node.extend({
        node: 'IfElseNode',

        constructor: function(cond, tbody, fbody) {
          this.cond = cond;
          this.tbody = tbody;
          this.fbody = fbody;
        }
      });

      var ForInNode = Node.extend({
        node: 'ForInNode',

        constructor: function(name, range, body) {
          this.name = name;
          this.range = range;
          this.body = body;
        }
      });

      var WhileNode = Node.extend({
        node: 'WhileNode',

        constructor: function(cond, body) {
          this.cond = cond;
          this.body = body;
        }
      });

      var BeginNode = Node.extend({
        node: 'BeginNode',

        constructor: function(name, body) {
          this.name = name;
          this.body = body;
        }
      });

      var FuncallNode = Node.extend({
        node: 'FuncallNode',

        constructor: function(target, args) {
          this.target = target;
          this.args = args || [];
        }
      });

      var BreakNode = Node.extend({
        node: 'BreakNode'
      });

      var NextNode = Node.extend({
        node: 'NextNode'
      });

      var ReturnNode = Node.extend({
        node: 'ReturnNode',

        constructor: function(result) {
          this.result = result;
        }
      });

      var VariableNode = Node.extend({
        node: 'VariableNode',

        constructor: function(name) {
          this.name = name;
        }
      });

      var AssignNode = Node.extend({
        node: 'AssignNode',

        constructor: function(name, value) {
          this.name = name;
          this.value = value;
        }
      });

      var DeleteNode = Node.extend({
        node: 'DeleteNode',

        constructor: function(name) {
          this.name = name;
        }
      });

      var IndexNode = Node.extend({
        node: 'IndexNode',

        constructor: function(base, index) {
          this.base = base;
          this.index = index;
        }
      });

      var AssignIndexNode = Node.extend({
        node: 'AssignIndexNode',

        constructor: function(base, index, value) {
          this.base = base;
          this.index = index;
          this.value = value;
        }
      });

      var DeleteIndexNode = Node.extend({
        node: 'DeleteIndexNode',

        constructor: function(base, index) {
          this.base = base;
          this.index = index;
        }
      });

      // special token to signal buildIndex that we have a DeleteIndex call
      var $remove = {};

      // take a base, dimensions, and (optionally) a value, and construct a
      // left-folding tree that terminates in an index lookup, assign, or delete
      function buildIndex(base, dims, value) {
        var next, last = dims.pop();

        while (next = dims.shift()) {
          base = new IndexNode(base, next);
        }

        if (value === undefined) {
          return new IndexNode(base, last);
        } else if (value === $remove) {
          return new DeleteIndexNode(base, last);
        } else {
          return new AssignIndexNode(base, last, value);
        }
      }

      var LiteralNode = Node.extend({
        node: 'LiteralNode',

        constructor: function(value) {
          this.value = value;
        }
      });

      var CommentNode = Node.extend({
        node: 'CommentNode',

        constructor: function(text) {
          this.text = text;
        }
      });

      var LogicalOpNode = Node.extend({
        node: 'LogicalOpNode',

        constructor: function(op, left, right) {
          this.op = op;
          this.left = left;
          this.right = right;
        }
      });

      // take a chain of equal-precedence logical exprs and construct a left-folding tree
      function buildLogicalOp(first, rest) {
        if (rest.length == 0) {
          return first;
        } else {
          var next = rest.shift();
          return buildLogicalOp(new LogicalOpNode(next[0], first, next[1]), rest);
        }
      }

      var BinaryOpNode = Node.extend({
        node: 'BinaryOpNode',

        constructor: function(op, left, right) {
          this.op = op;
          this.left = left;
          this.right = right;
        }
      });

      // take a chain of equal-precedence binary exprs and construct a left-folding tree
      function buildBinaryOp(first, rest) {
        if (rest.length == 0) {
          return first;
        } else {
          var next = rest.shift();
          return buildBinaryOp(new BinaryOpNode(next[0], first, next[1]), rest);
        }
      }

      // same, but fold right
      function buildBinaryOpRight(rest, last) {
        if (rest.length == 0) {
          return last;
        } else {
          var next = rest.pop();
          return buildBinaryOpRight(rest, new BinaryOpNode(next[0], next[1], last));
        }
      }

      var UnaryOpNode = Node.extend({
        node: 'UnaryOpNode',

        constructor: function(op, right) {
          this.op = op;
          this.right = right;
        }
      });


    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

},{"./runtime":4}],4:[function(require,module,exports){
function mixin(object, properties) {
  Object.keys(properties).forEach(function(prop) {
    object[prop] = properties[prop];
  });
}

// Environment

var SRuntime = exports.SRuntime = function() {
  this._ns = {};
};

mixin(SRuntime.prototype, {
  // push and pop new objects onto the prototype chain to implement fast scopes
  push: function() {
    this._ns = Object.create(this._ns);
  },

  pop: function() {
    this._ns = Object.getPrototypeOf(this._ns);
  },

  get: function(name) {
    return this._ns[name];
  },

  set: function(name, value) {
    this._ns[name] = value;
  },

  del: function(name) {
    delete this._ns[name];
  },

  getindex: function(base, index) {
    return handle(base).getindex(base, index);
  },

  setindex: function(base, index, value) {
    handle(base).setindex(base, index, value);
  },

  delindex: function(base, index) {
    handle(base).delindex(base, index);
  },

  unaryop: function(op, right) {
    return handle(right).unaryops[op](right);
  },

  binaryop: function(op, left, right) {
    return handle(left).binaryops[op](left, right);
  },

  syscall: function(name, args) {
    // try to find a function defined on the first argument,
    // or a global system function
    var target = (args.length > 0 && handle(args[0]).methods[name]) || globals[name];
    if (target) {
      return target.apply(null, args);
    }

    throw new Error('object not found or not a function');
  }
});

// enumerate a basic array or string
function enumerate(a) {
  var current = 0, len = a.length;

  return {
    more: function() {
      return current < len;
    },

    next: function() {
      return a[current++];
    }
  };
}

var SNone = exports.SNone = {
  repr: function() {
    return '*none*';
  },

  enumerate: function() {
    return enumerate([]);
  },

  getindex: function() {
    throw new Error('object does not support []');
  },

  setindex: function() {
    throw new Error('object does not support [] assignment');
  },

  methods: [],

  unaryops: {},

  binaryops: {
    '=' : function(left, right) { return left == right; },
    '!=': function(left, right) { return left != right; }
  }
};

var SBoolean = exports.SBoolean = {
  repr: function(b) {
    return b ? '*true*' : '*false*';
  },

  enumerate: function(b) {
    return enumerate(b ? [b] : []);
  },

  getindex: function() {
    throw new Error('object does not support []');
  },

  setindex: function() {
    throw new Error('object does not support [] assignment');
  },

  methods: [],

  unaryops: {},

  binaryops: {
    '=' : function(left, right) { return left == right; },
    '!=': function(left, right) { return left != right; }
  }
};

Object.defineProperty(Boolean.prototype, '$$start$$handler$$', {
  value: SBoolean,
  enumerable: false
});

var SNumber = exports.SNumber = {
  repr: function(n) {
    if (isFinite(n)) {
      return String(n);
    } else {
      return n > 0 ? '*infinity*' : '-*infinity*';
    }
  },

  enumerate: function(n) {
    return enumerate([n]);
  },

  getindex: function() {
    throw new Error('object does not support []');
  },

  setindex: function() {
    throw new Error('object does not support []');
  },

  delindex: function() {
    throw new Error('object does not support []');
  },

  methods: [
    'abs',
    'acos',
    'asin',
    'atan',
    'ceil',
    'cos',
    'exp',
    'floor',
    'log',
    'round',
    'sin',
    'sqrt',
    'tan',
    'pow',
    'max',
    'min'
  ].reduce(function(ns, method) {
    ns[method] = Math[method];
    return ns;
  }, {
    random: function(num) {
      return Math.random() * num;
    },

    count: function(start, end, step) {
      return new Range(start, end, step);
    }
  }),

  unaryops: {
    '+' : function(right) { return + right; },
    '-' : function(right) { return - right; }
  },

  binaryops: {
    // math
    '+' : function(left, right) { return left +  right; },
    '-' : function(left, right) { return left -  right; },
    '*' : function(left, right) { return left *  right; },
    '/' : function(left, right) { return left /  right; },
    '%' : function(left, right) { return left %  right; },
    '^' : function(left, right) { return Math.pow(left, right); },

    // comparison
    '=' : function(left, right) { return left == right; },
    '!=': function(left, right) { return left != right; },
    '<' : function(left, right) { return left <  right; },
    '<=': function(left, right) { return left <= right; },
    '>' : function(left, right) { return left >  right; },
    '>=': function(left, right) { return left >= right; }
  }
};

Object.defineProperty(Number.prototype, '$$start$$handler$$', {
  value: SNumber,
  enumerable: false
});

function Range(start, end, step) {
  this.start = start;
  this.end = end;
  this.step = step || 1;
}

var SRange = exports.SRange = {
  repr: function(r) {
    return '[ ' + r.start + ' => ' + r.end + ' : ' + r.step + ' ]';
  },

  enumerate: function(r) {
    var current = r.start;

    // return an interator over the range
    return {
      more: function() {
        return current <= r.end;
      },

      next: function() {
        // preincrement
        var result = current;
        current += r.step;
        return result;
      }
    };
  },

  getindex: function(r, index) {
    var val = r.start + index * r.step;

    if (val <= r.end) {
      return val;
    }
  },

  setindex: function() {
    throw new Error('object cannot be modified with []');
  },

  delindex: function() {
    throw new Error('object cannot be modified with []');
  },

  methods: {
    len: function(r) {
      var div = (r.end - r.start) / r.step,
          floor = Math.floor(div);

      if (div == Math.floor(div)) {
        return div + 1;
      } else {
        return Math.ceil(div);
      }
    }
  },

  unaryops: {},

  binaryops: {
    '=' : function(left, right) {
      // equal if it's the same range
      return left.start == right.start &&
             left.end == right.end &&
             left.step == right.step;
    },
    '!=': function(left, right) { return ! this['='](left, right); }
  }
};

Object.defineProperty(Range.prototype, '$$start$$handler$$', {
  value: SRange,
  enumerable: false
});

var SString = exports.SString = {
  repr: function(s) {
    return s;
  },

  enumerate: function(s) {
    return enumerate(s);
  },

  getindex: function(s, index) {
    return s.charAt(index);
  },

  setindex: function() {
    throw new Error('object cannot be modified with []');
  },

  delindex: function() {
    throw new Error('object cannot be modified with []');
  },

  methods: {
    len: function(s) {
      return s.length;
    },

    find: function(s, search) {
      return s.indexOf(search);
    },

    findlast: function(s, search) {
      return s.lastIndexOf(search);
    },

    replace: function(s, search, to) {
      return s.replace(search, to);
    },

    range: function(s, at, length) {
      return s.substr(at, length);
    },

    split: function(s, delim) {
      return s.split(delim || ' ');
    },

    upper: function(s) {
      return s.toUpperCase();
    },

    lower: function(s) {
      return s.toLowerCase();
    }
  },

  unaryops: {},

  binaryops: {
    // concatenation
    '+' : function(left, right) { return left +  right; },

    // comparison
    '=' : function(left, right) { return left == right; },
    '!=': function(left, right) { return left != right; },
    '<' : function(left, right) { return left <  right; },
    '<=': function(left, right) { return left <= right; },
    '>' : function(left, right) { return left >  right; },
    '>=': function(left, right) { return left >= right; }
  }
};

Object.defineProperty(String.prototype, '$$start$$handler$$', {
  value: SString,
  enumerable: false
});

// Arrays

var SArray = exports.SArray = {
  create: function(dims) {
    if (dims.length == 0) {
      dims.push(0);
    }

    return this._buildSubArray(dims);
  },

  _buildSubArray: function(dims) {
    var sub = new Array(dims[0]),
        next = dims.slice(1);

    for (var i = 0; i < dims[0]; ++i) {
      sub[i] = dims.length > 1 ? this._buildSubArray(next) : null;
    }

    return sub;
  },

  repr: function(a) {
    var i, j = [], k;

    for (i = 0; i < a.length; ++i) {
      k = a[i];
      j.push(handle(k).repr(k));
    }

    return '[ ' + j.join(', ') + ' ]';
  },

  enumerate: function(a) {
    return enumerate(a);
  },

  getindex: function(a, index) {
    return a[index];
  },

  setindex: function(a, index, value) {
    a[index] = value;
  },

  delindex: function(a, index) {
    delete a[index];
  },

  methods: {
    len: function(a) {
      return a.length;
    },

    find: function(a, search) {
      return a.indexOf(search);
    },

    findlast: function(a, search) {
      return a.lastIndexOf(search);
    },

    join: function(a, delim) {
      return a.join(delim || ' ');
    },

    push: function(a, item) {
      a.push(item);
    },

    pop: function(a) {
      return a.pop();
    },

    reverse: function(a) {
      a.reverse();
    },

    range: function(a, at, length) {
      return a.slice(at, at + length);
    },

    remove: function(a, at, length) {
      return a.splice(at, length);
    },

    insert: function(a, at) {
      a.splice.apply(a, [at, 0].concat([].slice.call(arguments, 2)));
    },

    replace: function(a, at, length) {
      return a.splice.apply(a, [at, length].concat([].slice.call(arguments, 3)));
    },

    sort: function(a) {
      a.sort(function(left, right) {
        var h = handle(left);
        return h.binaryops['<'](left, right) ? -1 : (h.binaryops['>'](left, right) ? 1 : 0);
      });
    }
  },

  unaryops: {},

  binaryops: {
    '=' : function(left, right) {
      var i, l, r;

      if (left.length != right.length) {
        return false;
      }

      for (i = 0; i < left.length; ++i) {
        l = left[i];
        r = right[i];
        if (!handle(l).binaryops['='](l, r)) {
          return false;
        }
      }

      return true;
    },

    '<' : function(left, right) {
      var i, l, r, len = Math.min(left.length, right.length);

      for (i = 0; i < len; ++i) {
        l = left[i];
        r = right[i];
        if (handle(l).binaryops['<'](l, r)) {
          return true;
        }
      }

      return left.length < right.length;
    },

    '>' : function(left, right) {
      var i, l, r, len = Math.min(left.length, right.length);

      for (i = 0; i < len; ++i) {
        l = left[i];
        r = right[i];
        if (handle(l).binaryops['>'](l, r)) {
          return true;
        }
      }

      return left.length > right.length;
    },

    '!=': function(left, right) { return ! this['='](left, right); },
    '<=': function(left, right) { return ! this['>'](left, right); },
    '>=': function(left, right) { return ! this['<'](left, right); }
  }
};

Object.defineProperty(Array.prototype, '$$start$$handler$$', {
  value: SArray,
  enumerable: false
});

// Tables (Hashes)

var STable = exports.STable = {
  create: function() {
    return {};
  },

  repr: function(t) {
    var i, j = [], k = Object.keys(t), l, m;

    for (i = 0; i < k.length; ++i) {
      l = k[i];
      m = t[l];
      j.push(l + ': ' + handle(m).repr(m));
    }

    return '[ ' + j.join(', ') + ' ]';
  },

  enumerate: function(t) {
    return enumerate(Object.keys(t));
  },

  getindex: function(t, index) {
    return t[index];
  },

  setindex: function(t, index, value) {
    t[index] = value;
  },

  delindex: function(t, index) {
    delete t[index];
  },

  methods: {
    len: function(t) {
      return Object.keys(t).length;
    },

    keys: function(t) {
      return Object.keys(t);
    },

    remove: function(t) {
      for (var i = 1; i < arguments.length; ++i) {
        delete t[arguments[i]];
      }
    }
  },

  unaryops: {},

  binaryops: {
    '=': function(left, right) {
      var i, l, r;

      for (i in left) {
        if (!(i in right)) {
          return false;
        }

        l = left[i];
        r = right[i];
        if (!handle(l).binaryops['='](l, r)) {
          return false;
        }
      }

      return Object.keys(left).length == Object.keys(right).length;
    },

    '!=': function(left, right) { return ! this['='](left, right); }
  }
};

Object.defineProperty(Object.prototype, '$$start$$handler$$', {
  value: STable,
  enumerable: false
});

// find a protocol handler for this object
var handle = exports.handle = function(obj) {
  return obj == null ? SNone : obj['$$start$$handler$$'];
};

var globals = exports.globals = {
  array: function() {
    return SArray.create([].slice.call(arguments));
  },

  table: function() {
    return STable.create();
  },

  print: function() {
    if (arguments.length > 0) {
      [].forEach.call(arguments, function(arg) {
        console.log(handle(arg).repr(arg));
      });
    } else {
      console.log();
    }
  }
};

exports.create = function() {
  return new SRuntime();
};

},{}],5:[function(require,module,exports){
var runtime = require('../runtime'),
    interpreter = require('../interpreter');

window.prompt = ace.edit('prompt');
prompt.setTheme('ace/theme/textmate');
prompt.setShowFoldWidgets(false);
prompt.getSession().setTabSize(2);
prompt.getSession().setUseSoftTabs(true);
prompt.getSession().setMode('ace/mode/pascal');

window.terminal = $('#terminal-inner');
terminal.terminal(function(command) {
  console.log(command);
  terminal.pause();
}, {
  greetings: false,
  height: 400,
  prompt: '> '
});
terminal.pause();

// override print to output to the terminal

runtime.globals.print = function() {
  if (arguments.length > 0) {
    Array.prototype.forEach.call(arguments, function(arg) {
      terminal.echo(runtime.handle(arg).repr(arg), {
        finalize: function(div) {
          div.addClass('output').prepend('<span>&#8702;</span>');
        }
      });
    });
  } else {
    terminal.echo();
  }
};

runtime.globals.clear = function() {
  terminal.clear();
};

// wire it up

var ctx = runtime.create(),
    runCommand = function() {
      var command = prompt.getValue().trim();

      if (command) {
        terminal.echo(command, {
          finalize: function(div) {
            div.addClass('input').prepend('<span>&#8701;</span>');
          }
        });
        var interp = interpreter.create(command + '\n', ctx);
        console.log(interp.ast);
        interp.run(function() {
          terminal.echo('');
          prompt.setValue('');
          prompt.focus();
        });
      }
    };

$('#runner').click(runCommand);

prompt.commands.removeCommand('showSettingsMenu');
prompt.commands.addCommand({
  name: "runSnippet",
  bindKey: {
    win: "Ctrl-Return",
    mac: "Command-Return"
  },
  exec: runCommand
});

prompt.focus();

},{"../interpreter":1,"../runtime":4}],6:[function(require,module,exports){
/*global define:false require:false */
module.exports = (function(){
	// Import Events
	var events = require('events')

	// Export Domain
	var domain = {}
	domain.createDomain = domain.create = function(){
		var d = new events.EventEmitter()

		function emitError(e) {
			d.emit('error', e)
		}

		d.add = function(emitter){
			emitter.on('error', emitError)
		}
		d.remove = function(emitter){
			emitter.removeListener('error', emitError)
		}
		d.bind = function(fn){
			return function(){
				var args = Array.prototype.slice.call(arguments)
				try {
					fn.apply(null, args)
				}
				catch (err){
					emitError(err)
				}
			}
		}
		d.intercept = function(fn){
			return function(err){
				if ( err ) {
					emitError(err)
				}
				else {
					var args = Array.prototype.slice.call(arguments, 1)
					try {
						fn.apply(null, args)
					}
					catch (err){
						emitError(err)
					}
				}
			}
		}
		d.run = function(fn){
			try {
				fn()
			}
			catch (err) {
				emitError(err)
			}
			return this
		};
		d.dispose = function(){
			this.removeAllListeners()
			return this
		};
		d.enter = d.exit = function(){
			return this
		}
		return d
	};
	return domain
}).call(this)
},{"events":7}],7:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],8:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[5]);
