import type { ListType, RecordType, RuntimeFunctions } from '../types.js';

export const collectionFunctions: RuntimeFunctions = {
  join(interpreter, [value, sep]: [ListType, string]) {
    const prettyValues = value.map((v) => {
      const handler = interpreter.getHandler(v);
      return handler.getPrettyValue(v);
    });
    interpreter.setResult(prettyValues.join(sep));
  },

  keys(interpreter, [value]: [RecordType]) {
    interpreter.setResult(Object.keys(value));
  },
};
