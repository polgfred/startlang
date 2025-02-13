import { DataHandler } from './base.js';

export class BooleanHandler extends DataHandler {
  shouldHandle(value: unknown) {
    return typeof value === 'boolean';
  }

  getPrettyValue(value: unknown) {
    return value ? '*true*' : '*false*';
  }
}
