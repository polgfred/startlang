'use strict';

// creates a new object that extends `base` and adds properties to it
export function extendObject(base, properties) {
  let extended = Object.create(base);
  Object.assign(extended, properties);
  return extended;
}
