import deepEqual from 'deep-equal';

import { Interpreter } from '../interpreter.js';

import { DataHandler } from './base.js';

export class TableHandler extends DataHandler {
  constructor(interpreter: Interpreter) {
    super(interpreter, {}, tableMethods);
  }

  shouldHandle(value: any) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  getPrettyValue(value: Record<string, any>) {
    const prettyValues = Object.entries(value).map(([key, v]) => {
      const handler = this.interpreter.getHandler(v);
      return `${key}=${handler.getPrettyValue(v)}`;
    });
    return `{${prettyValues.join(', ')}}`;
  }

  getIndex(value: Record<string, any>, index: string) {
    return value[index];
  }

  setIndex(value: Record<string, any>, index: string, element: any) {
    value[index] = element;
  }

  getIterable(value: any): any[] {
    return Object.keys(value);
  }

  evalBinaryOp(op: string, left: any, right: any) {
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

const tableMethods = {
  len(interpreter: Interpreter, [value]: [Record<string, any>]) {
    interpreter.setResult(Object.keys(value).length);
  },

  keys(interpreter: Interpreter, [value]: [Record<string, any>]) {
    interpreter.setResult(Object.keys(value));
  },
};
