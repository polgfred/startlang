import type { RuntimeFunctions } from '../types.js';

import { define, T } from './types.js';

export const textFunctions: RuntimeFunctions = {
  num: define([T.string], (interpreter, [value]) => {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`cannot convert ${value} to number`);
    } else {
      interpreter.setResult(num);
    }
  }),

  str: define([T.any], (interpreter, [value]) => {
    const handler = interpreter.getHandler(value);
    interpreter.setResult(handler.getPrettyValue(value));
  }),

  split: define([T.string, T.string], (interpreter, [value, sep]) => {
    interpreter.setResult(value.split(sep));
  }),
};
