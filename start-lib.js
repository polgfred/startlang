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

    unaryOp: function(op, right) {
      return handle(right).unaryOp(op, right);
    },

    binaryOp: function(op, left, right) {
      return handle(left).binaryOp(op, left, right);
    },

    getIndex: function(base, index) {
      return handle(base).getIndex(base, index);
    },

    setIndex: function(base, index, value) {
      handle(base).setIndex(base, index, value);
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
    return obj['$$handler$$'] || snumber.handle(obj) || sstring.handle(obj);
  }

  var snumber = {
    handle: function(n) {
      if (typeof n == 'number') {
        return snumber;
      }
    },

    unaryOp: function(op, right) {
      return this.unaryImpl[op](right);
    },

    binaryOp: function(op, left, right) {
      return this.binaryImpl[op](left, right);
    },

    getIndex: function(n, index) {
      throw new Error('object does not support []');
    },

    setIndex: function(n, index, value) {
      throw new Error('object does not support [] assignment');
    },

    methods: {},

    unaryImpl: {
      '+' : function(right) { return + right; },
      '-' : function(right) { return - right; }
    },

    binaryImpl: {
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

  var sstring = {
    handle: function(s) {
      if (typeof s == 'string') {
        return sstring;
      }
    },

    unaryOp: function(op, right) {
      throw new Error('object does not support unary ' + op);
    },

    binaryOp: function(op, left, right) {
      return this.binaryImpl[op](left, right);
    },

    getIndex: function(s, index) {
      return s.charAt(index);
    },

    setIndex: function(s, index, value) {
      throw new Error('object does not support [] assignment');
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

      replace: function(s, substr, to) {
        return s.replace(substr, to);
      },

      range: function(s, start, end) {
        return s.substring(start, end + 1);
      },

      split: function(s, delim) {
        return sarray.wrap(s.split(delim || ' '));
      }
    },

    binaryImpl: {
      '+' : function(left, right) { return left +  right; },
      '=' : function(left, right) { return left == right; },
      '!=': function(left, right) { return left != right; },
      '<' : function(left, right) { return left <  right; },
      '<=': function(left, right) { return left <= right; },
      '>' : function(left, right) { return left >  right; },
      '>=': function(left, right) { return left >= right; }
    }
  };

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

      return sarray.wrap(sub);
    },

    wrap: function(a) {
      Object.defineProperty(a, '$$handler$$', {
        value: sarray,
        enumerable: false
      });

      return a;
    },

    unaryOp: function(op, right) {
      throw new Error('object does not support unary ' + op);
    },

    binaryOp: function(op, left, right) {
      return this.binaryImpl[op](left, right);
    },

    getIndex: function(a, index) {
      return a[index];
    },

    setIndex: function(a, index, value) {
      a[index] = value;
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
        return a;
      },

      pop: function(a) {
        return a.pop();
      },

      reverse: function(a) {
        return a.reverse();
      },

      range: function(a, start, end) {
        return a.slice(start, end + 1);
      }
    },

    binaryImpl: {
      '=' : function(left, right) {
        // arrays have the same length and all their items are equal
        return (left.length == right.length) && left.every(function(litem, i) {
          return handle(litem).binaryOp('=', litem, right[i]);
        });
      },

      '!=': function(left, right) {
        return ! this['='](left, right);
      },

      '<' : function(left, right) { return left <  right; },
      '<=': function(left, right) { return left <= right; },
      '>' : function(left, right) { return left >  right; },
      '>=': function(left, right) { return left >= right; }
    }
  };

  // Tables (Hashes)

  var stable = {
    create: function() {
      return stable.wrap({});
    },

    wrap: function(t) {
      Object.defineProperty(t, '$$handler$$', {
        value: stable,
        enumerable: false
      });

      return t;
    },

    unaryOp: function(op, right) {
      throw new Error('object does not support unary ' + op);
    },

    binaryOp: function(op, left, right) {
      return this.binaryImpl[op](left, right);
    },

    getIndex: function(t, index) {
      return t[index];
    },

    setIndex: function(t, index, value) {
      t[index] = value;
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

    binaryImpl: {
    }
  };

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

    '$$handle$$': handle
  };

  return startlib;
})();
