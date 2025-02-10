import deepEqual from 'deep-equal';

import { Interpreter } from '../interpreter';
import { adjustIndex } from '../utils';

import { DataHandler } from './base';

export class ListHandler extends DataHandler {
  constructor(interpreter: Interpreter) {
    super(interpreter, {}, listMethods);
  }

  shouldHandle(value: any) {
    return Array.isArray(value);
  }

  getPrettyValue(value: any[]) {
    const prettyValues = value.map((v) => {
      const handler = this.interpreter.getHandler(v);
      return handler.getPrettyValue(v);
    });
    return `[${prettyValues.join(', ')}]`;
  }

  getIndex(value: any[], index: number) {
    index = adjustIndex(index, value.length);
    return value[index];
  }

  setIndex(value: any[], index: number, element: any) {
    index = adjustIndex(index, value.length);
    value[index] = element;
  }

  evalBinaryOp(op: string, left: any, right: any) {
    switch (op) {
      case '$':
        return [...left, ...right];
      case '=':
        return deepEqual(left, right, { strict: true });
      case '!=':
        return !deepEqual(left, right, { strict: true });
      default:
        throw new Error(`binary operator ${op} not supported`);
    }
  }
}

const listMethods = {
  len(interpreter: Interpreter, [value]: [any[]]) {
    interpreter.setResult(value.length);
  },

  range(
    interpreter: Interpreter,
    [value, start, end]: [any[], number, number]
  ) {
    start = adjustIndex(start, value.length);
    end = adjustIndex(end, value.length);
    interpreter.setResult(value.slice(start, end + 1));
  },

  join(interpreter: Interpreter, [value, sep]: [any[], string]) {
    interpreter.setResult(value.join(sep));
  },
};
