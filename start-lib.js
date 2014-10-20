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

    syscall: function(name, args) {
      var func = (args.length > 0 && handle(args[0]).methods[name]) || startlib[name];

      if (func) {
        return func.apply(null, args);
      }

      throw new Error('object not found or not a function');
    }
  });

  // find a protocol handler for this object
  function handle(obj) {
    return obj['$$start$$handler$$'];
  }

  var snumber = {
    handle: function(n) {
      if (typeof n == 'number') {
        return snumber;
      }
    },

    getindex: function(n, index) {
      throw new Error('object does not support []');
    },

    setindex: function(n, index, value) {
      throw new Error('object does not support [] assignment');
    },

    enumerate: function(n) {
      return [n];
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
    handle: function(s) {
      if (typeof s == 'string') {
        return sstring;
      }
    },

    getindex: function(s, index) {
      return s.charAt(index);
    },

    setindex: function(s, index, value) {
      throw new Error('object does not support [] assignment');
    },

    enumerate: function(s) {
      return s.split('');
    },

    methods: {
      length: function(s) {
        return s.length;
      },

      contains: function(s, search) {
        return s.indexOf(search) != -1;
      },

      find: function(s, substr) {
        return s.indexOf(substr);
      },

      findlast: function(s, substr) {
        return s.lastIndexOf(substr);
      },

      replace: function(s, substr, to) {
        return s.replace(substr, to);
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

      if (dims.length > 1) {
        for (var i = 0; i < dims[0]; ++i) {
          sub[i] = this._buildSubArray(next);
        }
      }

      return sub;
    },

    getindex: function(a, index) {
      return a[index];
    },

    setindex: function(a, index, value) {
      a[index] = value;
    },

    enumerate: function(a) {
      return a;
    },

    methods: {
      length: function(a) {
        return a.length;
      },

      contains: function(a, search) {
        return a.indexOf(search) != -1;
      },

      find: function(a, substr) {
        return a.indexOf(substr);
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

    getindex: function(t, index) {
      return t[index];
    },

    setindex: function(t, index, value) {
      t[index] = value;
    },

    enumerate: function(t) {
      return Object.keys(t);
    },

    methods: {
      length: function(t) {
        return t.length;
      },

      contains: function(t, search) {
        return search in t;
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

  var startlib = {
    createEnv: function() {
      return new SEnvironment();
    },

    array: function() {
      return sarray.create(arrayProto.slice.call(arguments));
    },

    table: function() {
      return stable.create();
    },

    print: function() {
      if (arguments.length > 0) {
        arrayProto.forEach.call(arguments, function(arg) {
          console.log(arg);
        });
      } else {
        console.log();
      }
    },

    handle: handle
  };

  return startlib;
})();
