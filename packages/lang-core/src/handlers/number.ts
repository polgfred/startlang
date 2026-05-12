import { DataHandler } from './base.js';

export class NumberHandler extends DataHandler {
  readonly typeName = 'number';

  shouldHandle(value: unknown) {
    return typeof value === 'number';
  }

  getPrettyValue(value: number) {
    if (isFinite(value)) {
      return String(value);
    } else {
      return value > 0 ? '*infinity*' : '-*infinity*';
    }
  }

  evalUnaryOp(op: string, right: number) {
    switch (op) {
      case '+':
        return right;
      case '-':
        return -right;
      case '~':
        return ~right;
      default:
        return super.evalUnaryOp(op, right);
    }
  }

  evalBinaryOp(op: string, left: number, right: number) {
    switch (op) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      case '%':
        return left % right;
      case '^':
        return Math.pow(left, right);
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
