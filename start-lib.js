module.exports = (function() {

  var slice = [].slice;

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

  SArray.prototype.get = function(indexes) {
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
  };

  SArray.prototype.set = function(indexes, value) {
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
  };

  return {
    array: {
      run: function(args) {
        return new SArray(args);
      }
    }
  };
})();
