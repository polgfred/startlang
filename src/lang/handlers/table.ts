import deepEqual from 'deep-equal';
import { type WritableDraft } from 'immer';

import { Interpreter } from '../interpreter.js';
import type { RuntimeFunctions, TableType } from '../types.js';

import { DataHandler } from './base.js';

export const emptyTable: TableType = Object.freeze(Object.create(null));

export class TableHandler extends DataHandler {
  constructor(interpreter: Interpreter) {
    super(interpreter, {}, tableMethods);
  }

  shouldHandle(value: unknown) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  getPrettyValue(value: TableType) {
    const prettyValues = Object.entries(value).map(([key, v]) => {
      const handler = this.interpreter.getHandler(v);
      return `${key}=${handler.getPrettyValue(v)}`;
    });
    return `{${prettyValues.join(', ')}}`;
  }

  getIndex(value: TableType, index: string) {
    return value[index];
  }

  setIndex(value: WritableDraft<TableType>, index: string, element: unknown) {
    value[index] = element;
  }

  getIterable(value: TableType) {
    return Object.keys(value);
  }

  evalBinaryOp(op: string, left: TableType, right: TableType) {
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
  len(interpreter, [value]: [TableType]) {
    interpreter.setResult(Object.keys(value).length);
  },

  keys(interpreter, [value]: [TableType]) {
    interpreter.setResult(Object.keys(value));
  },
};
