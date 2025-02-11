import { Interpreter } from '../interpreter.js';

import { DataHandler } from './base.js';

export class NumberHandler extends DataHandler {
  constructor(interpreter: Interpreter) {
    super(interpreter, numberGlobals, numberMethods);
  }

  shouldHandle(value: any) {
    return typeof value === 'number';
  }

  getPrettyValue(value: number) {
    if (isFinite(value)) {
      return String(value);
    } else {
      return value > 0 ? '*infinity*' : '-*infinity*';
    }
  }

  evalUnaryOp(op: string, right: any) {
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

  evalBinaryOp(op: string, left: any, right: any) {
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
      default:
        return super.evalBinaryOp(op, left, right);
    }
  }
}

const numberGlobals = {
  rand(interpreter: Interpreter) {
    interpreter.setResult(Math.random());
  },
};

const numberMethods = {
  abs(interpreter: Interpreter, [value]: [number]) {
    interpreter.setResult(Math.abs(value));
  },

  acos(interpreter: Interpreter, [n]: [number]) {
    interpreter.setResult((Math.acos(n) * 180) / Math.PI);
  },

  asin(interpreter: Interpreter, [value]: [number]) {
    interpreter.setResult((Math.asin(value) * 180) / Math.PI);
  },

  atan(interpreter: Interpreter, [value]: [number]) {
    interpreter.setResult((Math.atan(value) * 180) / Math.PI);
  },

  bitand(interpreter: Interpreter, [left, right]: [number, number]) {
    interpreter.setResult(left & right);
  },

  bitnot(interpreter: Interpreter, [value]: [number]) {
    interpreter.setResult(~value);
  },

  bitor(interpreter: Interpreter, [left, right]: [number, number]) {
    interpreter.setResult(left | right);
  },

  bitxor(interpreter: Interpreter, [left, right]: [number, number]) {
    interpreter.setResult(left ^ right);
  },

  cbrt(interpreter: Interpreter, [value]: [number]) {
    interpreter.setResult(Math.cbrt(value));
  },

  cos(interpreter: Interpreter, [value]: [number]) {
    interpreter.setResult(Math.cos((value * Math.PI) / 180));
  },

  exp(interpreter: Interpreter, [value]: [number]) {
    interpreter.setResult(Math.exp(value));
  },

  log(interpreter: Interpreter, [value, base]: [number, number?]) {
    if (base === undefined) {
      interpreter.setResult(Math.log(value));
    } else if (base === 10) {
      interpreter.setResult(Math.log10(value));
    } else {
      interpreter.setResult(Math.log(value) / Math.log(base));
    }
  },

  rand(interpreter: Interpreter, [lo, hi]: [number, number]) {
    interpreter.setResult(Math.floor(Math.random() * (hi - lo + 1)) + lo);
  },

  round(interpreter: Interpreter, [value]: [number]) {
    interpreter.setResult(Math.round(value));
  },

  sin(interpreter: Interpreter, [value]: [number]) {
    interpreter.setResult(Math.sin((value * Math.PI) / 180));
  },

  sqrt(interpreter: Interpreter, [value]: [number]) {
    interpreter.setResult(Math.sqrt(value));
  },

  tan(interpreter: Interpreter, [value]: [number]) {
    interpreter.setResult(Math.tan((value * Math.PI) / 180));
  },
};
