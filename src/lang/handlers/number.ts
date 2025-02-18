import { Interpreter } from '../interpreter.js';
import type { RuntimeFunctions } from '../types.js';

import { DataHandler } from './base.js';

export class NumberHandler extends DataHandler {
  constructor(interpreter: Interpreter) {
    super(interpreter, numberGlobals, numberMethods);
  }

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

const numberGlobals: RuntimeFunctions = {
  rand(interpreter) {
    interpreter.setResult(Math.random());
  },
};

const numberMethods: RuntimeFunctions = {
  abs(interpreter, [value]: [number]) {
    interpreter.setResult(Math.abs(value));
  },

  acos(interpreter, [n]: [number]) {
    interpreter.setResult((Math.acos(n) * 180) / Math.PI);
  },

  asin(interpreter, [value]: [number]) {
    interpreter.setResult((Math.asin(value) * 180) / Math.PI);
  },

  atan(interpreter, [value]: [number]) {
    interpreter.setResult((Math.atan(value) * 180) / Math.PI);
  },

  bitand(interpreter, [left, right]: [number, number]) {
    interpreter.setResult(left & right);
  },

  bitnot(interpreter, [value]: [number]) {
    interpreter.setResult(~value);
  },

  bitor(interpreter, [left, right]: [number, number]) {
    interpreter.setResult(left | right);
  },

  bitxor(interpreter, [left, right]: [number, number]) {
    interpreter.setResult(left ^ right);
  },

  cbrt(interpreter, [value]: [number]) {
    interpreter.setResult(Math.cbrt(value));
  },

  cos(interpreter, [value]: [number]) {
    interpreter.setResult(Math.cos((value * Math.PI) / 180));
  },

  exp(interpreter, [value]: [number]) {
    interpreter.setResult(Math.exp(value));
  },

  log(interpreter, [value, base]: [number, number?]) {
    if (base === undefined) {
      interpreter.setResult(Math.log(value));
    } else if (base === 10) {
      interpreter.setResult(Math.log10(value));
    } else {
      interpreter.setResult(Math.log(value) / Math.log(base));
    }
  },

  rand(interpreter, [lo, hi]: [number, number]) {
    interpreter.setResult(Math.floor(Math.random() * (hi - lo + 1)) + lo);
  },

  round(interpreter, [value]: [number]) {
    interpreter.setResult(Math.round(value));
  },

  format(interpreter, [value, style]: [number, string]) {
    switch (style) {
      case 'decimal': {
        const formatter = new Intl.NumberFormat(undefined, {
          style: 'decimal',
        });
        interpreter.setResult(formatter.format(value));
        break;
      }
      case 'percent': {
        const formatter = new Intl.NumberFormat(undefined, {
          style: 'percent',
        });
        interpreter.setResult(formatter.format(value));
        break;
      }
      case 'currency': {
        const formatter = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: 'USD',
        });
        interpreter.setResult(formatter.format(value));
        break;
      }
      default: {
        throw new Error(`invalid format: ${style}`);
      }
    }
  },

  sin(interpreter, [value]: [number]) {
    interpreter.setResult(Math.sin((value * Math.PI) / 180));
  },

  sqrt(interpreter, [value]: [number]) {
    interpreter.setResult(Math.sqrt(value));
  },

  tan(interpreter, [value]: [number]) {
    interpreter.setResult(Math.tan((value * Math.PI) / 180));
  },
};
