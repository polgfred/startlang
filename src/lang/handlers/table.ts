import deepEqual from 'deep-equal';

import { Interpreter } from '../interpreter';

import { DataHandler } from './base';

export class TableHandler extends DataHandler {
  constructor(interpreter: Interpreter) {
    super(interpreter, {}, tableMethods);
  }

  shouldHandle(value: any) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  getPrettyValue(value: object) {
    const prettyValues = Object.entries(value).map(([key, v]) => {
      const handler = this.interpreter.getHandler(v);
      return `${key}=${handler.getPrettyValue(v)}`;
    });
    return `{${prettyValues.join(', ')}}`;
  }

  getIndex(value: object, index: string) {
    return value[index];
  }

  setIndex(value: object, index: string, element: any) {
    value[index] = element;
  }

  getIterable(value: any): any[] {
    return Object.keys(value);
  }

  evalBinaryOp(op: string, left: any, right: any) {
    switch (op) {
      case '$':
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

const tableMethods = {
  len(interpreter: Interpreter, [value]: [object]) {
    interpreter.setResult(Object.keys(value).length);
  },

  keys(interpreter: Interpreter, [value]: [object]) {
    interpreter.setResult(Object.keys(value));
  },
};
