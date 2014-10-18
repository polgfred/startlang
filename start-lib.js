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
      return obj._handler;
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

    getIndex: function(name, index) {
      var obj = this.get(name), handler = this.handle(obj);

      if (!handler || !handler.getIndex) {
        throw new Error('object does not support getting by index');
      }

      return handler.getIndex(obj, index);
    },

    set: function(name, value) {
      this._ns[name] = value;
    },

    setIndex: function(name, index, value) {
      var obj = this.get(name), handler = this.handle(obj);

      if (!handler || !handler.setIndex) {
        throw new Error('object does not support setting by index');
      }

      handler.setIndex(obj, index, value);
    }
  });

  // Multi-dimensional arrays

  var _sarray = {
    create: function(dims) {
      if (dims.length == 0) {
        throw new Error('array must have at least one dimension');
      }

      var a = this._buildSubArray(dims);
      a._handler = _sarray;
      a._dims = dims;
      return a;
    },

    _buildSubArray: function(dims) {
      var sub = new Array(dims[0]), i;

      if (dims[0] == 0) {
        throw new Error('array cannot have a zero-length dimension');
      }

      if (dims.length > 1) {
        for (i = 0; i < dims[0]; ++i) {
          sub[i] = this._buildSubArray(dims.slice(1));
        }
      }

      return sub;
    },

    getIndex: function(a, index) {
      if (a._dims.length != index.length) {
        throw new Error('array index has wrong number of dimensions');
      }

      var cur = a, index, dim, i;

      for (i = 0; i < index.length; ++i) {
        dim = index[i];

        if (dim < 0 || dim >= cur.length) {
          throw new Error('array index out of bounds');
        } else {
          cur = cur[dim];
        }
      }

      return cur;
    },

    setIndex: function(a, index, value) {
      if (a._dims.length != index.length) {
        throw new Error('array index has wrong number of dimensions');
      }

      var cur = a, index, dim, i;

      for (i = 0; i < index.length; ++i) {
        dim = index[i];

        if (dim < 0 || dim >= cur.length) {
          throw new Error('array index out of bounds');
        } else {
          if (i < index.length - 1) {
            cur = cur[dim];
          } else {
            cur[dim] = value;
          }
        }
      }
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
      if (index.length != 1) {
        throw new Error('table index can only have a single dimension');
      }

      return t[index[0]];
    },

    setIndex: function(t, index, value) {
      if (index.length != 1) {
        throw new Error('table index can only have a single dimension');
      }

      t[index[0]] = value;
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
