import { DataHandler } from './base.js';

export class NoneHandler extends DataHandler {
  shouldHandle(value: unknown) {
    return value === null || value === undefined;
  }

  getPrettyValue(value: unknown) {
    return '*none*';
  }
}
