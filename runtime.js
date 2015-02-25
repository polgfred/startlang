var util = require('util'),
    immutable = require('immutable');

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
    var base = this.get(name);
    return handle(base).getindex(base, indexes);
  },

  setindex: function(name, indexes, value) {
    var base = this.get(name);
    this.set(name, handle(base).setindex(base, indexes, value));
  },

  delindex: function(name, indexes) {
    var base = this.get(name);
    this.set(name, handle(base).delindex(base, indexes));
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
      repl = res['@@__replace__@@'];
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

var SNone = exports.SNone = {
  repr: function() {
    return '*none*';
  },

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
    '=' : function(left, right) { return left == right; },
    '!=': function(left, right) { return left != right; }
  }
};

var SBoolean = exports.SBoolean = {
  repr: function(b) {
    return b ? '*true*' : '*false*';
  },

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
    '=' : function(left, right) { return right == null; },
    '!=': function(left, right) { return right != null; }
  }
};

Object.defineProperty(Boolean.prototype, '@@__handler__@@', {
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

    step: function(start, end, step) {
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

Object.defineProperty(Number.prototype, '@@__handler__@@', {
  value: SNumber,
  enumerable: false
});

function Range(current, end, step) {
  this.current = current;
  this.end = end;
  this.step = step || 1;
}

var SRange = exports.SRange = {
  repr: function(r) {
    return '[ ' + r.current + ' .. ' + r.end + ' / ' + r.step + ' ]';
  },

  enumerate: function(r, current) {
    if (typeof current == 'undefined') {
      current = r.current;
    }

    return {
      value: current,
      more: current < r.end,
      next: function() {
        return SRange.enumerate(r, current + r.step);
      }
    };
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

  methods: {
    len: function(r) {
      return Math.ceil((r.end - r.current) / r.step);
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

Object.defineProperty(Range.prototype, '@@__handler__@@', {
  value: SRange,
  enumerable: false
});

var SString = exports.SString = {
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

  getindex: function(s, indexes) {
    if (indexes.length == 1) {
      return s.charAt(indexes[0]);
    }

    throw new Error('string has only one dimension');
  },

  setindex: function(s, indexes, value) {
    if (indexes.length == 1) {
      var index = indexes[0];
      return s.substr(0, index) + value + s.substr(index + 1);
    }

    throw new Error('string has only one dimension');
  },

  delindex: function(s, indexes) {
    if (indexes.length == 1) {
      var index = indexes[0];
      return s.substr(0, index) + s.substr(index + 1);
    }

    throw new Error('string has only one dimension');
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
      return { '@@__replace__@@': s.substr(0, at) + more + s.substr(at) };
    },

    remove: function(s, at, length) {
      return {
        '@@__result__@@':
          s.substr(at, length),
        '@@__replace__@@':
          s.substr(0, at) + s.substr(at + length)
      };
    },

    replace: function(s, at, length, more) {
      return {
        '@@__result__@@':
          s.substr(at, length),
        '@@__replace__@@':
          s.substr(0, at) + more + s.substr(at + length)
      };
    },

    sub: function(s, search, to) {
      return { '@@__replace__@@': s.replace(search, to) };
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
    '&' : function(left, right) { return left + handle(right).repr(right); },

    // comparison
    '=' : function(left, right) { return left == right; },
    '!=': function(left, right) { return left != right; },
    '<' : function(left, right) { return left <  right; },
    '<=': function(left, right) { return left <= right; },
    '>' : function(left, right) { return left >  right; },
    '>=': function(left, right) { return left >= right; }
  }
};

Object.defineProperty(String.prototype, '@@__handler__@@', {
  value: SString,
  enumerable: false
});

// Arrays

var SList = exports.SList = {
  create: function(dims) {
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

  getindex: function(l, indexes) {
    return l.getIn(indexes);
  },

  setindex: function(l, indexes, value) {
    return l.setIn(indexes, value);
  },

  delindex: function(l, indexes) {
    return l.deleteIn(indexes);
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
      return { '@@__replace__@@': l.splice.apply(l, [at, 0].concat([].slice.call(arguments, 2))) };
    },

    remove: function(l, at, length) {
      return {
        '@@__result__@@':
          l.slice(at, at + length),
        '@@__replace__@@':
          l.splice(at, length)
      };
    },

    replace: function(l, at, length) {
      return {
        '@@__result__@@':
          l.slice(at, at + length),
        '@@__replace__@@':
          l.splice.apply(l, [at, length].concat([].slice.call(arguments, 3)))
      };
    },

    join: function(l, delim) {
      return l.join(delim || ' ');
    },

    push: function(l, item) {
      return { '@@__replace__@@': l.push(item) };
    },

    pop: function(l) {
      return { '@@__result__@@': l.last(), '@@__replace__@@': l.pop() };
    },

    reverse: function(l) {
      return { '@@__replace__@@': l.reverse() };
    },

    sort: function(l) {
      return {
        '@@__replace__@@':
          l.sort(function(left, right) {
            var h = handle(left);
            return h.binaryops['<'](left, right) ? -1 : (h.binaryops['>'](left, right) ? 1 : 0);
          })
      };
    }
  },

  binaryops: {
    // concatenation
    '&': function(left, right) {
      if (handle(right) == SList) {
        return left.concat(right);
      }

      throw new Error('object cannot be merged into array');
    },

    '=' : function(left, right) {
      return left.equals(right);
    },

    '!=' : function(left, right) {
      return !left.equals(right);
    },

    '<' : function(left, right) {
      var i, l, r, h, len = Math.min(left.size, right.size);

      for (i = 0; i < len; ++i) {
        l = left.get(i);
        r = right.get(i);
        h = handle(l);
        if (h.binaryops['<'](l, r)) {
          return true;
        } else if (h.binaryops['>'](l, r)) {
          return false;
        }
      }

      return left.size < right.size;
    },

    '>' : function(left, right) {
      var i, l, r, h, len = Math.min(left.size, right.size);

      for (i = 0; i < len; ++i) {
        l = left.get(i);
        r = right.get(i);
        h = handle(l);
        if (h.binaryops['>'](l, r)) {
          return true;
        } else if (h.binaryops['<'](l, r)) {
          return false;
        }
      }

      return left.size > right.size;
    },

    '<=': function(left, right) { return ! this['>'](left, right); },
    '>=': function(left, right) { return ! this['<'](left, right); }
  }
};

Object.defineProperty(immutable.List.prototype, '@@__handler__@@', {
  value: SList,
  enumerable: false
});

// Tables (Maps, Hashes)

var SMap = exports.SMap = {
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

  getindex: function(m, indexes) {
    return m.getIn(indexes);
  },

  setindex: function(m, indexes, value) {
    return m.setIn(indexes, value);
  },

  delindex: function(m, indexes) {
    return m.deleteIn(indexes);
  },

  methods: {
    len: function(m) {
      return m.size;
    },

    keys: function(m) {
      return immutable.List(m.keySeq());
    },

    clear: function(m) {
      return { '@@__replace__@@': m.clear() };
    },

    remove: function(m) {
      var args = arguments, removed = immutable.Map().asMutable();

      return {
        '@@__replace__@@':
          m.withMutations(function(mut) {
            for (var i = 1; i < args.length; ++i) {
              removed.set(args[i], mut.get(args[i]));
              mut.delete(args[i]);
            }
          }),
        '@@__result__@@':
          removed.asImmutable()
      };
    }
  },

  unaryops: {},

  binaryops: {
    // concatenation
    '&': function(left, right) {
      if (handle(right) == SMap) {
        return left.merge(right);
      }

      throw new Error('object cannot be merged into table');
    },

    '=': function(left, right) {
      return left.equals(right);
    },

    '!=': function(left, right) {
      return !left.equals(right);
    }
  }
};

Object.defineProperty(immutable.Map.prototype, '@@__handler__@@', {
  value: SMap,
  enumerable: false
});

// find a protocol handler for this object
var handle = exports.handle = function(obj) {
  return obj == null ? SNone : obj['@@__handler__@@'];
};

var globals = exports.globals = {
  list: function() {
    return SList.create([].slice.call(arguments));
  },

  map: function() {
    return SMap.create();
  },

  swap: function(a, b) {
    return {
      '@@__replace__@@':
        [ b, a ],
      '@@__result__@@':
        null
    };
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

globals.array = globals.list;
globals.table = globals.map;

exports.create = function() {
  return new SRuntime();
};
