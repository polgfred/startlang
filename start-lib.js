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

    getIndex: function(name, indexes) {
      return this.get(name).get(indexes);
    },

    set: function(name, value) {
      this.namespace[name] = value;
    },

    setIndex: function(name, indexes, value) {
      this.get(name).set(indexes, value);
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
    get: function(indexes) {
      if (this._dimensions.length != indexes.length) {
        throw new Error('array index has wrong number of dimensions');
      }

      var current = this._array, index, i;

      for (i = 0; i < indexes.length; ++i) {
        index = indexes[i];

        if (index < 0 || index >= current.length) {
          throw new Error('array index out of bounds');
        } else {
          current = current[index];
        }
      }

      return current;
    },

    set: function(indexes, value) {
      if (this._dimensions.length != indexes.length) {
        throw new Error('array index has wrong number of dimensions');
      }

      var current = this._array, index, i;

      for (i = 0; i < indexes.length; ++i) {
        index = indexes[i];

        if (index < 0 || index >= current.length) {
          throw new Error('array index out of bounds');
        } else {
          if (i < indexes.length - 1) {
            current = current[index];
          } else {
            current[index] = value;
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
