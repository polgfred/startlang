import { Interpreter } from '../interpreter';

export class DataHandler {
  protected interpreter: Interpreter;
  protected methods: object = {};

  constructor(interpreter: Interpreter, methods: object = {}) {
    this.interpreter = interpreter;
    this.methods = methods;
  }

  shouldHandle(value: any): boolean {
    throw new Error('not supported');
  }

  getPrettyValue(value: any): string {
    throw new Error('not supported');
  }

  getIndex(value: any, index: number | string): any {
    throw new Error(`indexing not supported for ${value}`);
  }

  setIndex(value: any, index: number | string, element: any): any {
    throw new Error(`indexing not supported for ${value}`);
  }

  getMethod(name: string): (this: Interpreter, args: any[]) => any {
    return this.methods[name];
  }

  evalUnaryOp(op: string, right: any): any {
    throw new Error(`unary operator ${op} not supported`);
  }

  evalBinaryOp(op: string, left: any, right: any): any {
    this.assertSameType(left, right);

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

  runMethod(name: string, args: any[]) {
    const method = this.methods[name];
    if (!method || typeof method !== 'function') {
      throw new Error(`method not found: ${name}`);
    }

    method.call(this.interpreter, args);
  }

  ///

  protected adjustIndex(index: number, size: number) {
    return index > 0 ? index - 1 : Math.max(0, size + index);
  }

  protected assertSameType(left: any, right: any) {
    const leftHandler = this.interpreter.getHandler(left);
    const rightHandler = this.interpreter.getHandler(right);

    if (leftHandler !== rightHandler) {
      throw new Error(
        `binary operator not supported on different types: ${left} and ${right}`
      );
    }
  }
}
