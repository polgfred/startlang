import { Interpreter } from '../interpreter';
import { DataHandler } from './base';

export class NumberHandler extends DataHandler {
  constructor(interpreter: Interpreter) {
    super(interpreter, numberMethods);
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
    this.assertNumeric(right);

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
    this.assertNumeric(left);
    this.assertNumeric(right);

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
      case '&':
        return left & right;
      case '|':
        return left | right;
      case '^':
        return left ^ right;
      default:
        return super.evalBinaryOp(op, left, right);
    }
  }

  ///

  private assertNumeric(value: any): asserts value is number {
    if (typeof value !== 'number') {
      throw new Error(`expected number, got ${value}`);
    }
  }
}

const numberMethods = {
  abs(this: Interpreter, [value]: [number]) {
    this.setResult(Math.abs(value));
  },

  acos(this: Interpreter, [n]: [number]) {
    this.setResult((Math.acos(n) * 180) / Math.PI);
  },

  asin(this: Interpreter, [value]: [number]) {
    this.setResult((Math.asin(value) * 180) / Math.PI);
  },

  atan(this: Interpreter, [value]: [number]) {
    this.setResult((Math.atan(value) * 180) / Math.PI);
  },

  cbrt(this: Interpreter, [value]: [number]) {
    this.setResult(Math.cbrt(value));
  },

  ceil(this: Interpreter, [value]: [number]) {
    this.setResult(Math.ceil(value));
  },

  clamp(this: Interpreter, [value, lo, hi]: [number, number, number]) {
    this.setResult(Math.min(Math.max(value, lo), hi));
  },

  cos(this: Interpreter, [value]: [number]) {
    this.setResult(Math.cos((value * Math.PI) / 180));
  },

  exp(this: Interpreter, [base, value]: [number, number?]) {
    if (value === undefined) {
      value = base;
      this.setResult(Math.exp(value));
    } else {
      this.setResult(Math.pow(base, value));
    }
  },

  floor(this: Interpreter, [value]: [number]) {
    this.setResult(Math.floor(value));
  },

  log(this: Interpreter, [base, value]: [number, number?]) {
    if (value === undefined) {
      this.setResult(Math.log(base));
    } else if (base === 10) {
      this.setResult(Math.log10(value));
    } else {
      this.setResult(Math.log10(value) / Math.log10(base));
    }
  },

  rand(this: Interpreter, [lo, hi]: [number, number]) {
    this.setResult(Math.floor(Math.random() * (hi - lo + 1)) + lo);
  },

  round(this: Interpreter, [value]: [number]) {
    this.setResult(Math.round(value));
  },

  sign(this: Interpreter, [value]: [number]) {
    this.setResult(Math.sign(value));
  },

  sin(this: Interpreter, [value]: [number]) {
    this.setResult(Math.sin((value * Math.PI) / 180));
  },

  sqrt(this: Interpreter, [value]: [number]) {
    this.setResult(Math.sqrt(value));
  },

  tan(this: Interpreter, [value]: [number]) {
    this.setResult(Math.tan((value * Math.PI) / 180));
  },

  max(this: Interpreter, values: number[]) {
    this.setResult(Math.max(...values));
  },

  min(this: Interpreter, values: number[]) {
    this.setResult(Math.min(...values));
  },
};
