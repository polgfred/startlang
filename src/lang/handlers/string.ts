import { Interpreter } from '../interpreter';
import { adjustIndex } from '../utils';

import { DataHandler } from './base';

export class StringHandler extends DataHandler {
  constructor(interpreter: Interpreter) {
    super(interpreter, {}, stringMethods);
  }

  shouldHandle(value: any) {
    return typeof value === 'string';
  }

  getPrettyValue(value: string) {
    return value;
  }

  getIndex(value: string, index: number) {
    index = adjustIndex(index, value.length);
    return value.charAt(index);
  }

  evalBinaryOp(op: string, left: any, right: any) {
    switch (op) {
      case '::':
        return left + right;
      default:
        return super.evalBinaryOp(op, left, right);
    }
  }
}

const stringMethods = {
  len(interpreter: Interpreter, [value]: [string]) {
    interpreter.setResult(value.length);
  },

  range(
    interpreter: Interpreter,
    [value, start, end]: [string, number, number]
  ) {
    start = adjustIndex(start, value.length);
    end = adjustIndex(end, value.length);
    interpreter.setResult(value.substring(start, end + 1));
  },

  split(interpreter: Interpreter, [value, sep]: [string, string]) {
    interpreter.setResult(value.split(sep));
  },
};
