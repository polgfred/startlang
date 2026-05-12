import type { RuntimeFunctions } from '../types.js';

export const mathFunctions: RuntimeFunctions = {
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

  rand(interpreter, args: [] | [number, number]) {
    if (args.length === 0) {
      interpreter.setResult(Math.random());
    } else {
      const [lo, hi] = args;
      interpreter.setResult(Math.floor(Math.random() * (hi - lo + 1)) + lo);
    }
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
