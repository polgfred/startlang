import deepEqual from 'deep-equal';

import { DataHandler } from './base';

import { Interpreter } from '../interpreter';

export class ListHandler extends DataHandler {
  constructor(interpreter: Interpreter) {
    super(interpreter, listGlobals, listMethods);
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
    index = this.adjustIndex(index, value.length);
    return value[index];
  }

  setIndex(value: any[], index: number, element: any) {
    index = this.adjustIndex(index, value.length);
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

const listGlobals = {
  list(interpreter: Interpreter, elements: any[]) {
    interpreter.setResult(Object.freeze(elements));
  },
};

const listMethods = {};
