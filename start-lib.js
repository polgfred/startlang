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
      return startlib[name] || this._ns[name];
    },

    set: function(name, value) {
      this._ns[name] = value;
    },

    unaryOp: function(op, right) {
      return _handle(right).unaryOp(op, right);
    },

    binaryOp: function(op, left, right) {
      return _handle(left).binaryOp(op, left, right);
    },

    getIndex: function(base, index) {
      return _handle(base).getIndex(base, index);
    },

    setIndex: function(base, index, value) {
      _handle(base).setIndex(base, index, value);
    }
  });

  // find a protocol handler for this object
  function _handle(obj) {
    return obj['$$handler$$'] || _snumber.handle(obj) || _sstring.handle(obj);
  }

  var _snumber = {
    handle: function(n) {
      if (typeof n == 'number') {
        return _snumber;
      }
    },

    unaryOp: function(op, right) {
      return this.unaryImpl[op](right);
    },

    binaryOp: function(op, left, right) {
      return this.binaryImpl[op](left, right);
    },

    getIndex: function(s, index) {
      throw new Error('object does not support []');
    },

    setIndex: function(a, index, value) {
      throw new Error('object does not support [] assignment');
    },

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

  var _sstring = {
    handle: function(s) {
      if (typeof s == 'string') {
        return _sstring;
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

    setIndex: function(a, index, value) {
      throw new Error('object does not support [] assignment');
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

  var _sarray = {
    create: function(dims) {
      if (dims.length == 0) {
        dims.push(0);
      }

      return this._buildSubArray(dims);
    },

    _buildSubArray: function(dims) {
      var sub = new Array(dims[0]),
          next = dims.slice(1);

      Object.defineProperty(sub, '$$handler$$', {
        value: _sarray,
        enumerable: false
      });

      if (dims.length > 1) {
        for (var i = 0; i < dims[0]; ++i) {
          sub[i] = this._buildSubArray(next);
        }
      }

      return sub;
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

    binaryImpl: {
      '=' : function(left, right) {
        // arrays have the same length and all their items are equal
        return (left.length == right.length) && left.every(function(litem, i) {
          return _handle(litem).binaryOp('=', litem, right[i]);
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

  var _stable = {
    create: function() {
      var t = {};

      Object.defineProperty(t, '$$handler$$', {
        value: _stable,
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

    binaryImpl: {
    }
  };

  var startlib = {
    createEnv: function() {
      return new SEnvironment();
    },

    array: function(ctx, args) {
      return _sarray.create(args);
    },

    table: function(ctx, args) {
      return _stable.create(args);
    },

    '$$handle$$': _handle
  };

  return startlib;
})();
