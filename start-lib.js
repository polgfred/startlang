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
    createCallable: function(func) {
      return { call: func };
    },

    // find a protocol handler for this object
    handle: function(obj) {
      return obj._handler || _snumber.handle(obj) || _sstring.handle(obj);
    },

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

    getIndex: function(base, index) {
      var handler = this.handle(base);

      if (!handler || !handler.getIndex) {
        throw new Error('object does not support getting by index');
      }

      return handler.getIndex(base, index);
    },

    setIndex: function(base, index, value) {
      var handler = this.handle(base);

      if (!handler || !handler.setIndex) {
        throw new Error('object does not support setting by index');
      }

      handler.setIndex(base, index, value);
    }
  });

  var _snumber = {
    handle: function(n) {
      if (typeof n == 'number') {
        return _snumber;
      }
    }
  };

  var _sstring = {
    handle: function(s) {
      if (typeof s == 'string') {
        return _sstring;
      }
    },

    getIndex: function(s, index) {
      return s.charAt(index);
    }
  };

  // Arrays

  var _sarray = {
    create: function(dims) {
      if (dims.length == 0) {
        dims.push(0);
      }

      var a = this._buildSubArray(dims);
      return a;
    },

    _buildSubArray: function(dims) {
      var sub = new Array(dims[0]);
      sub._handler = _sarray;

      if (dims.length > 1) {
        for (var i = 0; i < dims[0]; ++i) {
          sub[i] = this._buildSubArray(dims.slice(1));
        }
      }

      return sub;
    },

    getIndex: function(a, index) {
      return a[index];
    },

    setIndex: function(a, index, value) {
      a[index] = value;
    }
  };

  // Tables (Hashes)

  var _stable = {
    create: function() {
      var t = {};
      t._handler = _stable;
      return t;
    },

    getIndex: function(t, index) {
      return t[index];
    },

    setIndex: function(t, index, value) {
      t[index] = value;
    }
  };

  var startlib = {
    createEnv: function() {
      return new SEnvironment();
    },

    array: {
      call: function(ctx, args) {
        return _sarray.create(args);
      }
    },

    table: {
      call: function(ctx, args) {
        return _stable.create(args);
      }
    }
  };

  return startlib;
})();
