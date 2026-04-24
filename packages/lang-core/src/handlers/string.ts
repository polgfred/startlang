import { Interpreter } from '../interpreter.js';
import type { RuntimeFunctions } from '../types.js';
import { adjustIndex } from '../utils/index.js';

import { DataHandler } from './base.js';

export class StringHandler extends DataHandler {
  constructor(interpreter: Interpreter) {
    super(interpreter, {}, stringMethods);
  }

  shouldHandle(value: unknown) {
    return typeof value === 'string';
  }

  getPrettyValue(value: string) {
    return value;
  }

  getIndex(value: string, index: number) {
    index = adjustIndex(index, value.length);
    return value.charAt(index);
  }

  evalBinaryOp(op: string, left: string, right: string) {
    switch (op) {
      case '::':
        return left + right;
      case '<':
        return left < right;
      case '<=':
        return left <= right;
      case '>':
        return left > right;
      case '>=':
        return left >= right;
      default:
        return super.evalBinaryOp(op, left, right);
    }
  }
}

const stringMethods: RuntimeFunctions = {
  num(interpreter, [value]: [string]) {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`cannot convert ${value} to number`);
    } else {
      interpreter.setResult(num);
    }
  },

  len(interpreter, [value]: [string]) {
    interpreter.setResult(value.length);
  },

  range(interpreter, [value, start, end]: [string, number, number]) {
    start = adjustIndex(start, value.length);
    end = adjustIndex(end, value.length);
    interpreter.setResult(value.substring(start, end + 1));
  },

  split(interpreter, [value, sep]: [string, string]) {
    interpreter.setResult(value.split(sep));
  },
};
