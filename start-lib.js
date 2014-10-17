module.exports = (function() {

  var startlib,
      slice = [].slice;

  function mixin(object, properties) {
    Object.keys(properties).forEach(function(prop) {
      object[prop] = properties[prop];
    });
  }

  // Environment

  function SEnvironment() {
    this.namespace = {};
  }

  // push and pop new objects onto the prototype chain to implement fast scopes
  mixin(SEnvironment.prototype, {
    push: function() {
      this.namespace = Object.create(this.namespace);
    },

    pop: function() {
      this.namespace = Object.getPrototypeOf(this.namespace);
    },

    get: function(name) {
      return startlib[name] || this.namespace[name];
    },

    getIndex: function(name, index) {
      return this.get(name).get(index);
    },

    set: function(name, value) {
      this.namespace[name] = value;
    },

    setIndex: function(name, index, value) {
      this.get(name).set(index, value);
    }
  });

  // Multi-dimensional arrays

  function SArray(dimensions) {
    if (dimensions.length == 0) {
      throw new Error('array must have at least one dimension');
    }

    this._array = buildSubArray(dimensions);
    this._dimensions = dimensions;
  }

  function buildSubArray(dimensions) {
    var sub = new Array(dimensions[0]), i;

    if (dimensions[0] == 0) {
      throw new Error('array cannot have a zero-length dimension');
    }

    if (dimensions.length > 1) {
      for (i = 0; i < dimensions[0]; ++i) {
        sub[i] = buildSubArray(dimensions.slice(1));
      }
    }

    return sub;
  }

  mixin(SArray.prototype, {
    get: function(index) {
      if (this._dimensions.length != index.length) {
        throw new Error('array index has wrong number of dimensions');
      }

      var current = this._array, index, dim, i;

      for (i = 0; i < index.length; ++i) {
        dim = index[i];

        if (dim < 0 || dim >= current.length) {
          throw new Error('array index out of bounds');
        } else {
          current = current[dim];
        }
      }

      return current;
    },

    set: function(index, value) {
      if (this._dimensions.length != index.length) {
        throw new Error('array index has wrong number of dimensions');
      }

      var current = this._array, index, dim, i;

      for (i = 0; i < index.length; ++i) {
        dim = index[i];

        if (dim < 0 || dim >= current.length) {
          throw new Error('array index out of bounds');
        } else {
          if (i < index.length - 1) {
            current = current[dim];
          } else {
            current[dim] = value;
          }
        }
      }
    }
  });

  return startlib = {
    createEnv: function() {
      return new SEnvironment();
    },

    createCallable: function(func) {
      return { call: func };
    },

    array: {
      call: function(ctx, args) {
        return new SArray(args);
      }
    }
  };
})();
