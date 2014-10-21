module.exports = (function() {

  function mixin(object, properties) {
    Object.keys(properties).forEach(function(prop) {
      object[prop] = properties[prop];
    });
  }

  // Environment

  function SEnvironment() {
    this._ns = {};
  }

  mixin(SEnvironment.prototype, {
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

    unaryop: function(op, right) {
      return handle(right).unaryops[op](right);
    },

    binaryop: function(op, left, right) {
      return handle(left).binaryops[op](left, right);
    },

    getindex: function(base, index) {
      return handle(base).getindex(base, index);
    },

    setindex: function(base, index, value) {
      handle(base).setindex(base, index, value);
    },

    funcall: function(target, name, args) {
      if (target) {
        return target(args);
      } else if (name) {
        // try to find a function defined on the first argument,
        // or a global system function
        target = (args.length > 0 && handle(args[0]).methods[name])
                  || globals[name];
        if (target) {
          return target.apply(null, args);
        }
      }

      throw new Error('object not found or not a function');
    }
  });

  // find a protocol handler for this object
  function handle(obj) {
    return obj == null ? snone : obj['$$start$$handler$$'];
  }

  var snone = {
    repr: function() {
      return '*none*';
    },

    enumerate: function() {
      return [];
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

  var sboolean = {
    repr: function(b) {
      return b ? '*true*' : '*false*';
    },

    enumerate: function(b) {
      return b ? [b] : [];
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
    value: sboolean,
    enumerable: false
  });

  var snumber = {
    repr: function(n) {
      if (isFinite(n)) {
        return String(n);
      } else {
        return n > 0 ? '*infinity*' : '-*infinity*';
      }
    },

    enumerate: function(n) {
      return [n];
    },

    getindex: function() {
      throw new Error('object does not support []');
    },

    setindex: function() {
      throw new Error('object does not support [] assignment');
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

      range: function(from, to, by) {
        var a = [];

        for (var i = from; i < to; i += by || 1) {
          a.push(i);
        }

        return a;
      }
    }),

    unaryops: {
      '+' : function(right) { return + right; },
      '-' : function(right) { return - right; }
    },

    binaryops: {
      '+' : function(left, right) { return left +  right; },
      '-' : function(left, right) { return left -  right; },
      '*' : function(left, right) { return left *  right; },
      '/' : function(left, right) { return left /  right; },
      '%' : function(left, right) { return left %  right; },
      '=' : function(left, right) { return left == right; },
      '!=': function(left, right) { return left != right; },
      '<' : function(left, right) { return left <  right; },
      '<=': function(left, right) { return left <= right; },
      '>' : function(left, right) { return left >  right; },
      '>=': function(left, right) { return left >= right; }
    }
  };

  Object.defineProperty(Number.prototype, '$$start$$handler$$', {
    value: snumber,
    enumerable: false
  });

  var sstring = {
    repr: function(s) {
      return s;
    },

    enumerate: function(s) {
      return s.split('');
    },

    getindex: function(s, index) {
      return s.charAt(index);
    },

    setindex: function() {
      throw new Error('object does not support [] assignment');
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

      range: function(s, from, to) {
        return s.substring(from, to);
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
      '+' : function(left, right) { return left +  right; },
      '=' : function(left, right) { return left == right; },
      '!=': function(left, right) { return left != right; },
      '<' : function(left, right) { return left <  right; },
      '<=': function(left, right) { return left <= right; },
      '>' : function(left, right) { return left >  right; },
      '>=': function(left, right) { return left >= right; }
    }
  };

  Object.defineProperty(String.prototype, '$$start$$handler$$', {
    value: sstring,
    enumerable: false
  });

  // Arrays

  var sarray = {
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
      return a;
    },

    getindex: function(a, index) {
      return a[index];
    },

    setindex: function(a, index, value) {
      a[index] = value;
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
        return a.reverse();
      },

      range: function(a, from, to) {
        return a.slice(from, to);
      }
    },

    unaryops: {},

    binaryops: {
      '=' : function(left, right) {
        // arrays have the same length and all their items are equal
        return (left.length == right.length) && left.every(function(litem, i) {
          return handle(litem).binaryops['='](litem, right[i]);
        });
      },

      '!=': function(left, right) {
        return ! this['='](left, right);
      },

      // TODO
      '<' : function(left, right) { return left <  right; },
      '<=': function(left, right) { return left <= right; },
      '>' : function(left, right) { return left >  right; },
      '>=': function(left, right) { return left >= right; }
    }
  };

  Object.defineProperty(Array.prototype, '$$start$$handler$$', {
    value: sarray,
    enumerable: false
  });

  // Tables (Hashes)

  var stable = {
    create: function() {
      return {};
    },

    repr: function(t) {
      var i, j = [], k = Object.keys(t), l, m;

      for (i = 0; i < k.length; ++i) {
        l = k[i];
        m = t[l];
        j.push('"' + l + '": ' + handle(m).repr(m));
      }

      return '[ ' + j.join(', ') + ' ]';
    },

    enumerate: function(t) {
      return Object.keys(t);
    },

    getindex: function(t, index) {
      return t[index];
    },

    setindex: function(t, index, value) {
      t[index] = value;
    },

    methods: {
      len: function(t) {
        return Object.keys(t).length;
      },

      keys: function(t) {
        return Object.keys(t);
      }
    },

    unaryops: {},

    binaryops: {}
  };

  Object.defineProperty(Object.prototype, '$$start$$handler$$', {
    value: stable,
    enumerable: false
  });

  var objectProto = Object.prototype,
      arrayProto = Array.prototype;

  var globals = {
    array: function() {
      return sarray.create(arrayProto.slice.call(arguments));
    },

    table: function() {
      return stable.create();
    },

    print: function() {
      if (arguments.length > 0) {
        arrayProto.forEach.call(arguments, function(arg) {
          console.log(handle(arg).repr(arg));
        });
      } else {
        console.log();
      }
    }
  };

  var startlib = {
    handle: handle,

    createEnv: function() {
      return new SEnvironment();
    }
  };

  return startlib;
})();
