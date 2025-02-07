import { DataHandler } from './base';

export class BooleanHandler extends DataHandler {
  shouldHandle(value: any) {
    return typeof value === 'boolean';
  }

  getPrettyValue(value: any) {
    return value ? '*true*' : '*false*';
  }
}
