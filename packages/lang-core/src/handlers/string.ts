import { adjustIndex } from '../utils/index.js';

import { DataHandler } from './base.js';

export class StringHandler extends DataHandler {
  readonly typeName = 'string';

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
