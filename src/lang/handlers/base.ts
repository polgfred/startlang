import { Interpreter } from '../interpreter.js';

export abstract class DataHandler {
  constructor(
    protected interpreter: Interpreter,
    public globals: object = {},
    public methods: object = {}
  ) {}

  abstract shouldHandle(value: any): boolean;

  abstract getPrettyValue(value: any): string;

  getIndex(value: any, index: number | string): any {
    throw new Error('not supported');
  }

  setIndex(value: any, index: number | string, element: any): void {
    throw new Error('not supported');
  }

  getIterable(value: any): any[] {
    throw new Error('not supported');
  }

  evalUnaryOp(op: string, right: any): any {
    throw new Error(`unary operator ${op} not supported`);
  }

  evalBinaryOp(op: string, left: any, right: any): any {
    switch (op) {
      case '=':
        return left === right;
      case '!=':
        return left !== right;
      case '<':
        return left < right;
      case '<=':
        return left <= right;
      case '>':
        return left > right;
      case '>=':
        return left >= right;
      default:
        throw new Error(`binary operator ${op} not supported`);
    }
  }
}
