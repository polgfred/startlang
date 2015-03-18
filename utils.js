import util from 'util';

// creates a new object that extends `base` and adds properties to it
export function extendObject(base, properties) {
  var extended = Object.create(base);
  util._extend(extended, properties);
  return extended;
}

// wrapper function that ensures all its arguments are of the same type
export function checkArgumentTypes(fn) {
  return function() {
    var h = handle(arguments[0]), i;
    for (i = 1; i < arguments.length; i++) {
      if (h != handle(arguments[i])) {
        throw new Error('operands must be of the same type');
      }
    }

    // forward onto the original
    return fn.apply(this, arguments);
  };
}
