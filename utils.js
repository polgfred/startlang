import util from 'util';

// creates a new object that extends `base` and adds properties to it
export function extendObject(base, properties) {
  var extended = Object.create(base);
  util._extend(extended, properties);
  return extended;
}
