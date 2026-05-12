import deepEqual from 'deep-equal';
import type { WritableDraft } from 'immer';

import type { ListType } from '../types.js';
import { adjustIndex } from '../utils/index.js';

import { DataHandler } from './base.js';

export const emptyList: ListType = Object.freeze([]);

export class ListHandler extends DataHandler {
  readonly typeName = 'list';

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

  deleteIndex(value: WritableDraft<ListType>, index: number) {
    index = adjustIndex(index, value.length);
    value.splice(index, 1);
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
