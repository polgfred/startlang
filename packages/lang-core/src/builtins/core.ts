import type { RuntimeFunctions } from '../types.js';
import { adjustIndex } from '../utils/index.js';

import { define, T } from './types.js';

export const coreFunctions: RuntimeFunctions = {
  len: define([T.oneOf(T.string, T.list, T.record)], (interpreter, [value]) => {
    if (typeof value === 'string' || Array.isArray(value)) {
      interpreter.setResult(value.length);
    } else {
      interpreter.setResult(Object.keys(value).length);
    }
  }),

  range: define(
    [T.oneOf(T.string, T.list), T.number, T.number],
    (interpreter, [value, start, end]) => {
      start = adjustIndex(start, value.length);
      end = adjustIndex(end, value.length);
      if (typeof value === 'string') {
        interpreter.setResult(value.substring(start, end + 1));
      } else {
        interpreter.setResult(value.slice(start, end + 1));
      }
    }
  ),
};
