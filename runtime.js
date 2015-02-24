var util = require('util');

// Environment

var SRuntime = exports.SRuntime = function() {
  this.fn = {};
  this.ns = {};
};

util._extend(SRuntime.prototype, {
  // push and pop new objects onto the prototype chain to implement fast scopes
  push: function() {
    this.ns = Object.create(this.ns);
  },

  pop: function() {
    this.ns = Object.getPrototypeOf(this.ns);
  },

  get: function(name) {
    return this.ns[name];
  },

  set: function(name, value) {
    this.ns[name] = value;
  },

  del: function(name) {
    delete this.ns[name];
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

  enumerate: function(value) {
    return handle(value).enumerate(value);
  },

  unaryop: function(op, right) {
    return handle(right).unaryops[op](right);
  },

  binaryop: function(op, left, right) {
    return handle(left).binaryops[op](left, right);
  },

  define: function(name, body) {
    this.fn[name] = body;
  },

  funcall: function(name, args, done) {
    // look for a user-defined function
    var fn = this.fn[name];
    if (fn) {
      fn(args, done);
      return;
    } else {
      // look for an rt function by dispatching on first argument, or a global function
      fn = (args.length > 0 && handle(args[0]).methods[name]) || globals[name];
      if (fn) {
        done(null, fn.apply(null, args));
        return;
      }
    }

    throw new Error('object not found or not a function');
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

  enumerate: function() {
    throw new Error('object does not support iteration');
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
    '=' : function(left, right) { return right == null; },
    '!=': function(left, right) { return right != null; }
  }
};

Object.defineProperty(Boolean.prototype, '@@__START_HANDLER__@@', {
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

Object.defineProperty(Number.prototype, '@@__START_HANDLER__@@', {
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
    return '[ ' + r.start + ' .. ' + r.end + ' / ' + r.step + ' ]';
  },

  enumerate: function(r, current) {
    if (typeof current == 'undefined') {
      current = r.start;
    }

    return {
      value: current,
      more: current < r.end,
      next: function() {
        return SRange.enumerate(r, current + r.step);
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
      return Math.ceil((r.end - r.start) / r.step);
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

Object.defineProperty(Range.prototype, '@@__START_HANDLER__@@', {
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

Object.defineProperty(String.prototype, '@@__START_HANDLER__@@', {
  value: SString,
  enumerable: false
});

// Arrays

var SList = exports.SList = {
  create: function(dims) {
    if (dims.length == 0) {
      dims.push(0);
    }

    return (function subList(dims) {
      var sub = new Array(dims[0]),
          next = dims.slice(1);

      for (var i = 0; i < dims[0]; ++i) {
        sub[i] = dims.length > 1 ? subList(next) : null;
      }

      return sub;
    })(dims);
  },

  repr: function(l) {
    var i, j = [], k;

    for (i = 0; i < l.length; ++i) {
      k = l[i];
      j.push(handle(k).repr(k));
    }

    return '[ ' + j.join(', ') + ' ]';
  },

  enumerate: function(l, index) {
    index = index || 0;

    return {
      value: l[index],
      more: index < l.length,
      next: function() {
        return SList.enumerate(l, index + 1);
      }
    };
  },

  getindex: function(l, index) {
    return l[index];
  },

  setindex: function(l, index, value) {
    l[index] = value;
  },

  delindex: function(l, index) {
    delete l[index];
  },

  methods: {
    len: function(l) {
      return l.length;
    },

    find: function(l, search) {
      return l.indexOf(search);
    },

    findlast: function(l, search) {
      return l.lastIndexOf(search);
    },

    join: function(l, delim) {
      return l.join(delim || ' ');
    },

    push: function(l, item) {
      l.push(item);
    },

    pop: function(l) {
      return l.pop();
    },

    reverse: function(l) {
      l.reverse();
    },

    range: function(l, at, length) {
      return l.slice(at, at + length);
    },

    remove: function(l, at, length) {
      return l.splice(at, length);
    },

    insert: function(l, at) {
      l.splice.apply(l, [at, 0].concat([].slice.call(arguments, 2)));
    },

    replace: function(l, at, length) {
      return l.splice.apply(l, [at, length].concat([].slice.call(arguments, 3)));
    },

    sort: function(l) {
      l.sort(function(left, right) {
        var h = handle(left);
        return h.binaryops['<'](left, right) ? -1 : (h.binaryops['>'](left, right) ? 1 : 0);
      });
    }
  },

  binaryops: {
    // concatenation
    '&': function(left, right) {
      if (handle(right) != SList) {
        throw new Error('object cannot be merged into array');
      }

      return left.concat(right);
    },

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
        } else if (handle(l).binaryops['>'](l, r)) {
          return false;
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
        } else if (handle(l).binaryops['<'](l, r)) {
          return false;
        }
      }

      return left.length > right.length;
    },

    '!=': function(left, right) { return ! this['='](left, right); },
    '<=': function(left, right) { return ! this['>'](left, right); },
    '>=': function(left, right) { return ! this['<'](left, right); }
  }
};

Object.defineProperty(Array.prototype, '@@__START_HANDLER__@@', {
  value: SList,
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
    return SList.enumerate(Object.keys(t));
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
    // concatenation
    '&': function(left, right) {
      if (handle(right) != STable) {
        throw new Error('object cannot be merged into table');
      }

      var t = {};

      util._extend(t, left);
      util._extend(t, right);
      return t;
    },

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

Object.defineProperty(Object.prototype, '@@__START_HANDLER__@@', {
  value: STable,
  enumerable: false
});

// find a protocol handler for this object
var handle = exports.handle = function(obj) {
  return obj == null ? SNone : obj['@@__START_HANDLER__@@'];
};

var globals = exports.globals = {
  list: function() {
    return SList.create([].slice.call(arguments));
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
