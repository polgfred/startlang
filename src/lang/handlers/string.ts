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

  evalBinaryOp(op: string, left: any, right: any) {
    this.assertSameType(left, right);

    switch (op) {
      case '$':
        return left + right;
      default:
        return super.evalBinaryOp(op, left, right);
    }
  }
}
