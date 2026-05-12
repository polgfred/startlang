import type { RuntimeFunctions } from '../types.js';

import { define, T } from './types.js';

export const collectionFunctions: RuntimeFunctions = {
  join: define([T.list, T.string], (interpreter, [value, sep]) => {
    const prettyValues = value.map((v) => {
      const handler = interpreter.getHandler(v);
      return handler.getPrettyValue(v);
    });
    interpreter.setResult(prettyValues.join(sep));
  }),

  keys: define([T.record], (interpreter, [value]) => {
    interpreter.setResult(Object.keys(value));
  }),
};
