import deepEqual from 'deep-equal';

import { DataHandler } from './base';

export class ListHandler extends DataHandler {
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
    this.assertSameType(left, right);

    switch (op) {
      case '$':
        return left + right;
      case '=':
        return deepEqual(left, right, { strict: true });
      case '!=':
        return !deepEqual(left, right, { strict: true });
      default:
        return super.evalBinaryOp(op, left, right);
    }
  }
}
