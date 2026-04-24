import deepEqual from 'deep-equal';
import { type WritableDraft } from 'immer';

import { Interpreter } from '../interpreter.js';
import type { ListType, RuntimeFunctions } from '../types.js';
import { adjustIndex } from '../utils/index.js';

import { DataHandler } from './base.js';

export const emptyList: ListType = Object.freeze([]);

export class ListHandler extends DataHandler {
  constructor(interpreter: Interpreter) {
    super(interpreter, {}, listMethods);
  }

  shouldHandle(value: unknown) {
    return Array.isArray(value);
  }

  getPrettyValue(value: ListType) {
    const prettyValues = value.map((v) => {
      const handler = this.interpreter.getHandler(v);
      return handler.getPrettyValue(v);
    });
    return `[${prettyValues.join(', ')}]`;
  }

  getIndex(value: ListType, index: number) {
    index = adjustIndex(index, value.length);
    return value[index];
  }

  setIndex(value: WritableDraft<ListType>, index: number, element: unknown) {
    index = adjustIndex(index, value.length);
    value[index] = element;
  }

  getIterable(value: ListType) {
    return value;
  }

  evalBinaryOp(op: string, left: ListType, right: ListType) {
    switch (op) {
      case '::':
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

const listMethods: RuntimeFunctions = {
  len(interpreter, [value]: [ListType]) {
    interpreter.setResult(value.length);
  },

  range(interpreter, [value, start, end]: [ListType, number, number]) {
    start = adjustIndex(start, value.length);
    end = adjustIndex(end, value.length);
    interpreter.setResult(value.slice(start, end + 1));
  },

  join(interpreter, [value, sep]: [ListType, string]) {
    interpreter.setResult(value.join(sep));
  },
};
