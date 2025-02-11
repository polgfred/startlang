import { DataHandler } from './base.js';

export class NoneHandler extends DataHandler {
  shouldHandle(value: any) {
    return value === null || value === undefined;
  }

  getPrettyValue(value: any) {
    return '*none*';
  }
}
