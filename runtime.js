var util = require('util'),
    immutable = require('immutable'),
    ary = Array.prototype;

// wrapper function that ensures all its arguments are of the same type
function checked(fn) {
  return function() {
    var h = handle(arguments[0]), i;
    for (i = 1; i < arguments.length; i++) {
      if (h != handle(arguments[i])) {
        throw new Error('operands must be of the same type');
      }
    }

    // forward onto the original
    return fn.apply(this, arguments);
  };
}

// Environment

var SRuntime = exports.SRuntime = function() {
  this.fn = immutable.Map();
  this.ns = immutable.Map();
  this.stack = immutable.Stack();
};

util._extend(SRuntime.prototype, {
  // push and pop new objects onto the ns stack
  push: function() {
    this.stack = this.stack.push(this.ns);
    this.ns = immutable.Map();
  },

  pop: function() {
    this.ns = this.stack.first();
    this.stack = this.stack.pop();
  },

  get: function(name) {
    // look in the current ns
    var result = this.ns.get(name);
    if (typeof result != 'undefined') {
      return result;
    }

    // look up the stack (should we do this?)
    var iter = this.stack.values(), next;
    while (true) {
      next = iter.next();
      if (next.done) {
        break;
      }
      result = next.value.get(name);
      if (typeof result != 'undefined') {
        return result;
      }
    }
  },

  set: function(name, value) {
    // always in the current ns only
    this.ns = this.ns.set(name, value);
  },

  del: function(name) {
    // always in the current ns only
    this.ns = this.ns.delete(name);
  },

  getindex: function(name, indexes) {
    var max = indexes.length - 1;
    return next(this.get(name), 0);

    function next(b, i) {
      var h = handle(b), idx = indexes[i];
      return (i == max) ?
                h.getindex(b, idx) :
                next(h.getindex(b, idx), i + 1);
    }
  },

  setindex: function(name, indexes, value) {
    var max = indexes.length - 1;
    this.set(name, next(this.get(name), 0));

    function next(b, i) {
      var h = handle(b), idx = indexes[i];
      return (i == max) ?
                h.setindex(b, idx, value) :
                h.setindex(b, idx, next(h.getindex(b, idx), i + 1));
    }
  },

  delindex: function(name, indexes) {
    var max = indexes.length - 1;
    this.set(name, next(this.get(name), 0));

    function next(b, i) {
      var h = handle(b), idx = indexes[i];
      return (i == max) ?
                h.delindex(b, idx) :
                h.setindex(b, idx, next(h.getindex(b, idx), i + 1));
    }
  },

  enumerate: function(value) {
    return handle(value).enumerate(value);
  },

  unaryop: function(op, right) {
    return handle(right).unaryops[op](right);
  },

  binaryop: function(op, left, right) {
    return handle(left).binaryops[op](left, right);
  },

  getfn: function(name) {
    return this.fn.get(name);
  },

  setfn: function(name, body) {
    this.fn = this.fn.set(name, body);
  },

  syscall: function(name, args, assn) {
    // look for a function by first argument, or in global map
    var fn = (args.length > 0 && handle(args[0]).methods[name]) || globals[name];
    if (!fn) {
      throw new Error('object not found or not a function');
    }

    // call a runtime function
    var res = fn.apply(null, args), repl, i, a, r;
    if (res) {
      repl = res['@@__assign__@@'];
      if (repl) {
        // if this result contains replacement args, assign them
        if (!Array.isArray(repl)) {
          repl = [ repl ];
        }
        // loop over replacement args
        for (i = 0; i < repl.length; ++i) {
          r = repl[i];
          if (typeof r != 'undefined') {
            // we have a replacement for this slot
            a = assn[i];
            if (a) {
              // this slot can be assigned to
              if (a.indexes) {
                this.setindex(a.name, a.indexes, r);
              } else {
                this.set(a.name, r);
              }
            }
          }
        }
        // grab an explicit result, or the first replacement
        res = res['@@__result__@@'] || repl[0];
      }
    }

    return res;
  }
});

// Handler defaults

var SBase = exports.SBase = {
  enumerate: function() {
    throw new Error('object does not support iteration');
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

  methods: [],

  unaryops: {},

  binaryops: {
    // standard comparison operators
    '=' : function(left, right) { return left == right; },
    '!=': function(left, right) { return left != right; },

    '<' : checked(function(left, right) { return left <  right; }),
    '<=': checked(function(left, right) { return left <= right; }),
    '>' : checked(function(left, right) { return left >  right; }),
    '>=': checked(function(left, right) { return left >= right; })
  }
};

// Handler definitions

var SNone = exports.SNone = {};
util._extend(SNone, SBase);
util._extend(SNone, {
  repr: function() {
    return '*none*';
  }
});

var SBoolean = exports.SBoolean = {};
util._extend(SBoolean, SBase);
util._extend(SBoolean, {
  repr: function(b) {
    return b ? '*true*' : '*false*';
  }
});

Object.defineProperty(Boolean.prototype, '@@__handler__@@', {
  value: SBoolean,
  enumerable: false
});

var SNumber = exports.SNumber = {};
util._extend(SNumber, SBase);
util._extend(SNumber, {
  repr: function(n) {
    if (isFinite(n)) {
      return String(n);
    } else {
      return n > 0 ? '*infinity*' : '-*infinity*';
    }
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
    inc: function(n) {
      return { '@@__assign__@@': n + 1 };
    },

    dec: function(n) {
      return { '@@__assign__@@': n - 1 };
    },

    random: function(n) {
      return Math.random() * n;
    },

    range: function(start, end, step) {
      return immutable.Range(start, end, step);
    }
  }),

  unaryops: {
    '+': checked(function(right) { return + right; }),
    '-': checked(function(right) { return - right; })
  },

  binaryops: {}
});

util._extend(SNumber.binaryops, SBase.binaryops);
util._extend(SNumber.binaryops, {
  // math
  '+': checked(function(left, right) { return left + right; }),
  '-': checked(function(left, right) { return left - right; }),
  '*': checked(function(left, right) { return left * right; }),
  '/': checked(function(left, right) { return left / right; }),
  '%': checked(function(left, right) { return left % right; }),
  '^': checked(function(left, right) { return Math.pow(left, right); })
});

Object.defineProperty(Number.prototype, '@@__handler__@@', {
  value: SNumber,
  enumerable: false
});

var SRange = exports.SRange = {};
util._extend(SRange, SBase);
util._extend(SRange, {
  repr: function(r) {
    return '[ ' + r._start + ' .. ' + r._end + ' / ' + r._step + ' ]';
  },

  enumerate: function(r, current) {
    if (typeof current == 'undefined') {
      current = r._start;
    }

    return {
      value: current,
      more: current < r._end,
      next: function() {
        return SRange.enumerate(r, current + r._step);
      }
    };
  },

  methods: {
    len: function(r) {
      return Math.ceil((r._end - r._start) / r._step);
    }
  },

  binaryops: {
    '=' : function(left, right) { return  left.equals(right); },
    '!=': function(left, right) { return !left.equals(right); }
  }
});

Object.defineProperty(immutable.Range.prototype, '@@__handler__@@', {
  value: SRange,
  enumerable: false
});

var SString = exports.SString = {};
util._extend(SString, SBase);
util._extend(SString, {
  repr: function(s) {
    return s;
  },

  enumerate: function(s, index) {
    index = index || 0;

    return {
      value: s.charAt(index),
      more: index < s.length,
      next: function() {
        return SString.enumerate(s, index + 1);
      }
    };
  },

  getindex: function(s, index) {
    return s.charAt(index);
  },

  setindex: function(s, index, value) {
    return s.substr(0, index) + value + s.substr(index + 1);
  },

  delindex: function(s, index) {
    return s.substr(0, index) + s.substr(index + 1);
  },

  methods: {
    len: function(s) {
      return s.length;
    },

    find: function(s, search) {
      var pos = s.indexOf(search);
      return pos >= 0 ? pos : null;
    },

    findlast: function(s, search) {
      var pos = s.lastIndexOf(search);
      return pos >= 0 ? pos : null;
    },

    range: function(s, at, length) {
      return s.substr(at, length);
    },

    insert: function(s, at, more) {
      return { '@@__assign__@@': s.substr(0, at) + more + s.substr(at) };
    },

    remove: function(s, at, length) {
      return {
        '@@__assign__@@':
          s.substr(0, at) + s.substr(at + length),
        '@@__result__@@':
          s.substr(at, length)
      };
    },

    replace: function(s, at, length, more) {
      return {
        '@@__assign__@@':
          s.substr(0, at) + more + s.substr(at + length),
        '@@__result__@@':
          s.substr(at, length)
      };
    },

    sub: function(s, search, to) {
      return { '@@__assign__@@': s.replace(search, to) };
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

  binaryops: {}
});

util._extend(SString.binaryops, SBase.binaryops);
util._extend(SString.binaryops, {
  '&': function(left, right) { return left + handle(right).repr(right); }
});

Object.defineProperty(String.prototype, '@@__handler__@@', {
  value: SString,
  enumerable: false
});

// Containers

var SContainer = exports.SContainer = {
  getindex: function(c, index) {
    return c.get(index);
  },

  setindex: function(c, index, value) {
    return c.set(index, value);
  },

  delindex: function(c, index) {
    return c.delete(index);
  },

  binaryops: {
    '=' : function(left, right) { return  left.equals(right); },
    '!=': function(left, right) { return !left.equals(right); }
  }
};

// Lists

var SList = exports.SList = {};
util._extend(SList, SBase);
util._extend(SList, SContainer);
util._extend(SList, {
  create: function() {
    var dims = ary.slice.call(arguments);
    if (dims.length == 0) {
      dims.push(0);
    }

    return function buildSubArray(dims) {
      var next = dims.slice(1);
      return immutable.List().withMutations(function(sub) {
        for (var i = 0; i < dims[0]; ++i) {
          sub.set(i, dims.length > 1 ? buildSubArray(next) : null);
        }
      });
    }(dims);
  },

  repr: function(l) {
    return '[ ' + l.map(function(el) {
      return handle(el).repr(el);
    }).join(', ') + ' ]';
  },

  enumerate: function(l, index) {
    index = index || 0;

    return {
      value: l.get(index),
      more: index < l.size,
      next: function() {
        return SList.enumerate(l, index + 1);
      }
    };
  },

  methods: {
    len: function(l) {
      return l.size;
    },

    find: function(l, search) {
      var pos = l.indexOf(search);
      return pos >= 0 ? pos : null;
    },

    findlast: function(l, search) {
      var pos = l.lastIndexOf(search);
      return pos >= 0 ? pos : null;
    },

    range: function(l, at, length) {
      return l.slice(at, at + length);
    },

    insert: function(l, at) {
      return {
        '@@__assign__@@':
          l.splice.apply(l, [at, 0].concat(ary.slice.call(arguments, 2)))
      };
    },

    remove: function(l, at, length) {
      return {
        '@@__assign__@@':
          l.splice(at, length),
        '@@__result__@@':
          l.slice(at, at + length)
      };
    },

    replace: function(l, at, length) {
      return {
        '@@__assign__@@':
          l.splice.apply(l, [at, length].concat(ary.slice.call(arguments, 3))),
        '@@__result__@@':
          l.slice(at, at + length)
      };
    },

    join: function(l, delim) {
      return l.join(delim || ' ');
    },

    push: function(l) {
      return { '@@__assign__@@': l.push.apply(l, ary.slice.call(arguments, 1)) };
    },

    pop: function(l) {
      return { '@@__assign__@@': l.pop(), '@@__result__@@': l.last() };
    },

    reverse: function(l) {
      return { '@@__assign__@@': l.reverse() };
    },

    sort: function(l) {
      return {
        '@@__assign__@@':
          l.sort(function(left, right) {
            var h = handle(left);
            return h.binaryops['<'](left, right) ? -1 : (h.binaryops['>'](left, right) ? 1 : 0);
          })
      };
    }
  },

  binaryops: {}
});

util._extend(SList.binaryops, SContainer.binaryops);
util._extend(SList.binaryops, {
  '&': checked(function(left, right) { return left.concat(right); })
});

Object.defineProperty(immutable.List.prototype, '@@__handler__@@', {
  value: SList,
  enumerable: false
});

// Maps (Tables, Hashes)

var SMap = exports.SMap = {}
util._extend(SMap, SBase);
util._extend(SMap, SContainer);
util._extend(SMap, {
  create: function() {
    return immutable.Map();
  },

  repr: function(m) {
    return '[ ' + m.map(function(val, key) {
      return handle(key).repr(key) + ': ' + handle(val).repr(val);
    }).join(', ') + ' ]';
  },

  enumerate: function(m) {
    return SList.enumerate(m.keySeq());
  },

  methods: {
    len: function(m) {
      return m.size;
    },

    keys: function(m) {
      return immutable.List(m.keySeq());
    },

    clear: function(m) {
      return { '@@__assign__@@': m.clear() };
    },

    range: function(m) {
      var args = arguments;

      return immutable.Map().withMutations(function(n) {
        for (var i = 1; i < args.length; ++i) {
          n.set(args[i], m.get(args[i]));
        }
      });
    },

    insert: function(m) {
      var args = arguments;

      return {
        '@@__assign__@@':
          m.withMutations(function(n) {
            for (var i = 1; i < args.length; i += 2) {
              n.set(args[i], args[i + 1]);
            }
          }),
      };
    },

    remove: function(m) {
      var args = arguments, o = m.asMutable();

      return {
        '@@__result__@@':
          immutable.Map().withMutations(function(n) {
            for (var i = 1; i < args.length; ++i) {
              n.set(args[i], m.get(args[i]));
              o.delete(args[i]);
            }
          }),
        '@@__assign__@@':
          o.asImmutable()
      };
    }
  },

  binaryops: {}
});

util._extend(SMap.binaryops, SContainer.binaryops);
util._extend(SMap.binaryops, {
  '&': checked(function(left, right) { return left.merge(right); })
});

Object.defineProperty(immutable.Map.prototype, '@@__handler__@@', {
  value: SMap,
  enumerable: false
});

// find a protocol handler for this object
var handle = exports.handle = function(obj) {
  // have to check for null/undefined explicitly
  if (obj == null) {
    return SNone;
  }

  // if protocol handler is a function call it with the object -- this allows
  // for duck type polymorphism on objects
  var handler = obj['@@__handler__@@']
  return typeof handler == 'function' ? handler(obj) : handler;
};

var globals = exports.globals = {
  list: function() {
    return SList.create.apply(null, arguments);
  },

  map: function() {
    return SMap.create();
  },

  swap: function(a, b) {
    return {
      '@@__assign__@@':
        [ b, a ],
      '@@__result__@@':
        null
    };
  },

  print: function() {
    if (arguments.length > 0) {
      ary.forEach.call(arguments, function(arg) {
        console.log(handle(arg).repr(arg));
      });
    } else {
      console.log();
    }
  },

  sleep: function(seconds) {
    return new Promise(function(resolve) {
      setTimeout(resolve, seconds * 1000);
    });
  }
};

globals.array = globals.list;
globals.table = globals.map;

exports.create = function() {
  return new SRuntime();
};
