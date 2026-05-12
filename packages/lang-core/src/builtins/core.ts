import type { RecordType, RuntimeFunctions } from '../types.js';
import { adjustIndex } from '../utils/index.js';

function isRecord(value: unknown): value is RecordType {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const coreFunctions: RuntimeFunctions = {
  len(interpreter, [value]: [unknown]) {
    if (typeof value === 'string' || Array.isArray(value)) {
      interpreter.setResult(value.length);
    } else if (isRecord(value)) {
      interpreter.setResult(Object.keys(value).length);
    } else {
      throw new Error(
        `len doesn't work on ${interpreter.getHandler(value).typeName}`
      );
    }
  },

  range(interpreter, [value, start, end]: [unknown, number, number]) {
    if (typeof value === 'string') {
      start = adjustIndex(start, value.length);
      end = adjustIndex(end, value.length);
      interpreter.setResult(value.substring(start, end + 1));
    } else if (Array.isArray(value)) {
      start = adjustIndex(start, value.length);
      end = adjustIndex(end, value.length);
      interpreter.setResult(value.slice(start, end + 1));
    } else {
      throw new Error(
        `range doesn't work on ${interpreter.getHandler(value).typeName}`
      );
    }
  },
};
