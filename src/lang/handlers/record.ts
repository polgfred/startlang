import deepEqual from 'deep-equal';
import { type WritableDraft } from 'immer';

import { Interpreter } from '../interpreter.js';
import type { RuntimeFunctions, RecordType } from '../types.js';

import { DataHandler } from './base.js';

export const emptyRecord: RecordType = Object.freeze(Object.create(null));

export class RecordHandler extends DataHandler {
  constructor(interpreter: Interpreter) {
    super(interpreter, {}, tableMethods);
  }

  shouldHandle(value: unknown) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  getPrettyValue(value: RecordType) {
    const prettyValues = Object.entries(value).map(([key, v]) => {
      const handler = this.interpreter.getHandler(v);
      return `${key}=${handler.getPrettyValue(v)}`;
    });
    return `{${prettyValues.join(', ')}}`;
  }

  getIndex(value: RecordType, index: string) {
    return value[index];
  }

  setIndex(value: WritableDraft<RecordType>, index: string, element: unknown) {
    value[index] = element;
  }

  getIterable(value: RecordType) {
    return Object.keys(value);
  }

  evalBinaryOp(op: string, left: RecordType, right: RecordType) {
    switch (op) {
      case '::':
        return { ...left, ...right };
      case '=':
        return deepEqual(left, right, { strict: true });
      case '!=':
        return !deepEqual(left, right, { strict: true });
      default:
        throw new Error(`binary operator ${op} not supported`);
    }
  }
}

const tableMethods: RuntimeFunctions = {
  len(interpreter, [value]: [RecordType]) {
    interpreter.setResult(Object.keys(value).length);
  },

  keys(interpreter, [value]: [RecordType]) {
    interpreter.setResult(Object.keys(value));
  },
};
