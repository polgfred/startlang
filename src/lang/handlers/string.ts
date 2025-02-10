import { DataHandler } from './base';

export class StringHandler extends DataHandler {
  shouldHandle(value: any) {
    return typeof value === 'string';
  }

  getPrettyValue(value: string) {
    return value;
  }

  getIndex(value: string, index: number) {
    index = this.adjustIndex(index, value.length);
    return value.charAt(index);
  }
}
