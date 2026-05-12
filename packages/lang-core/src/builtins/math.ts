import type { RuntimeFunctions } from '../types.js';

import { define, defineOverloads, optional, signature, T } from './types.js';

export const mathFunctions: RuntimeFunctions = {
  abs: define([T.number], (interpreter, [value]) => {
    interpreter.setResult(Math.abs(value));
  }),

  acos: define([T.number], (interpreter, [n]) => {
    interpreter.setResult((Math.acos(n) * 180) / Math.PI);
  }),

  asin: define([T.number], (interpreter, [value]) => {
    interpreter.setResult((Math.asin(value) * 180) / Math.PI);
  }),

  atan: define([T.number], (interpreter, [value]) => {
    interpreter.setResult((Math.atan(value) * 180) / Math.PI);
  }),

  bitand: define([T.number, T.number], (interpreter, [left, right]) => {
    interpreter.setResult(left & right);
  }),

  bitnot: define([T.number], (interpreter, [value]) => {
    interpreter.setResult(~value);
  }),

  bitor: define([T.number, T.number], (interpreter, [left, right]) => {
    interpreter.setResult(left | right);
  }),

  bitxor: define([T.number, T.number], (interpreter, [left, right]) => {
    interpreter.setResult(left ^ right);
  }),

  cbrt: define([T.number], (interpreter, [value]) => {
    interpreter.setResult(Math.cbrt(value));
  }),

  cos: define([T.number], (interpreter, [value]) => {
    interpreter.setResult(Math.cos((value * Math.PI) / 180));
  }),

  exp: define([T.number], (interpreter, [value]) => {
    interpreter.setResult(Math.exp(value));
  }),

  log: define([T.number, optional(T.number)], (interpreter, [value, base]) => {
    if (base === undefined) {
      interpreter.setResult(Math.log(value));
    } else if (base === 10) {
      interpreter.setResult(Math.log10(value));
    } else {
      interpreter.setResult(Math.log(value) / Math.log(base));
    }
  }),

  rand: defineOverloads(
    signature([], (interpreter) => {
      interpreter.setResult(Math.random());
    }),
    signature([T.number, T.number], (interpreter, [lo, hi]) => {
      interpreter.setResult(Math.floor(Math.random() * (hi - lo + 1)) + lo);
    })
  ),

  round: define([T.number], (interpreter, [value]) => {
    interpreter.setResult(Math.round(value));
  }),

  format: define([T.number, T.string], (interpreter, [value, style]) => {
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
  }),

  sin: define([T.number], (interpreter, [value]) => {
    interpreter.setResult(Math.sin((value * Math.PI) / 180));
  }),

  sqrt: define([T.number], (interpreter, [value]) => {
    interpreter.setResult(Math.sqrt(value));
  }),

  tan: define([T.number], (interpreter, [value]) => {
    interpreter.setResult(Math.tan((value * Math.PI) / 180));
  }),
};
