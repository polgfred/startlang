import { produce } from 'immer';
import deepEqual from 'deep-equal';

import { DataHandler } from './base';

export class TableHandler extends DataHandler {
  shouldHandle(value: any) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  getPrettyValue(value: Record<string, any>) {
    const prettyValues = Object.entries(value).map(([key, v]) => {
      const handler = this.interpreter.getHandler(v);
      return `${key}=${handler.getPrettyValue(v)}`;
    });
    return `[${prettyValues.join(', ')}]`;
  }

  getIndex(value: Record<string, any>, index: string) {
    return value[index];
  }

  setIndex(value: Record<string, any>, index: string, element: any) {
    return produce(value, (draft) => {
      draft[index] = element;
    });
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
