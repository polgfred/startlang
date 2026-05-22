import deepEqual from 'deep-equal';
import type { WritableDraft } from 'immer';

import type { RecordType } from '../types.js';

import { DataHandler } from './base.js';

export const emptyRecord: RecordType = Object.freeze(Object.create(null));

export class RecordHandler extends DataHandler {
  readonly typeName = 'record';

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

  deleteIndex(value: WritableDraft<RecordType>, index: string) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete value[index];
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
