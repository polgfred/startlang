module.exports = (function() {

  var slice = [].slice;

  return {
    array: function array(first) {
      if (first == null) {
        return;
      }

      var ary = new Array(first),
          rest = slice.call(arguments, 1),
          i;

      if (arguments.length > 1) {
        for (i = 0; i < first; ++i) {
          ary[i] = array.apply(this, rest);
        }
      }

      ary._dimensions = arguments.length;
      return ary;
    }
  };
})();
