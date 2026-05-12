import type { RuntimeFunctions } from '../types.js';

export const textFunctions: RuntimeFunctions = {
  num(interpreter, [value]: [string]) {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`cannot convert ${value} to number`);
    } else {
      interpreter.setResult(num);
    }
  },

  str(interpreter, [value]: [unknown]) {
    const handler = interpreter.getHandler(value);
    interpreter.setResult(handler.getPrettyValue(value));
  },

  split(interpreter, [value, sep]: [string, string]) {
    interpreter.setResult(value.split(sep));
  },
};
