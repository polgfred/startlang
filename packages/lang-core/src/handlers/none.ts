import { DataHandler } from './base.js';

export class NoneHandler extends DataHandler {
  readonly typeName = 'none';

  shouldHandle(value: unknown) {
    return value === null || value === undefined;
  }

  getPrettyValue(value: unknown) {
    return '*none*';
  }
}
