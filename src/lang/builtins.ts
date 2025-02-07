import deepEqual from 'deep-equal';
import { produce } from 'immer';

import { type Interpreter } from './interpreter';
import { numberMethods } from './methods';

export class BaseHandler {
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

export class NoneHandler extends BaseHandler {
  shouldHandle(value: any) {
    return value === null || value === undefined;
  }

  getPrettyValue(value: any) {
    return '*none*';
  }
}

export class BooleanHandler extends BaseHandler {
  shouldHandle(value: any) {
    return typeof value === 'boolean';
  }

  getPrettyValue(value: any) {
    return value ? '*true*' : '*false*';
  }
}

export class NumberHandler extends BaseHandler {
  constructor(interpreter: Interpreter) {
    super(interpreter, numberMethods);
  }

  shouldHandle(value: any) {
    return typeof value === 'number';
  }

  getPrettyValue(value: number) {
    if (isFinite(value)) {
      return String(value);
    } else {
      return value > 0 ? '*infinity*' : '-*infinity*';
    }
  }

  evalUnaryOp(op: string, right: any) {
    this.assertNumeric(right);

    switch (op) {
      case '+':
        return right;
      case '-':
        return -right;
      case '~':
        return ~right;
      default:
        return super.evalUnaryOp(op, right);
    }
  }

  evalBinaryOp(op: string, left: any, right: any) {
    this.assertNumeric(left);
    this.assertNumeric(right);

    switch (op) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      case '%':
        return left % right;
      case '&':
        return left & right;
      case '|':
        return left | right;
      case '^':
        return left ^ right;
      default:
        return super.evalBinaryOp(op, left, right);
    }
  }

  ///

  private assertNumeric(value: any): asserts value is number {
    if (typeof value !== 'number') {
      throw new Error(`expected number, got ${value}`);
    }
  }
}

export class StringHandler extends BaseHandler {
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

export class ListHandler extends BaseHandler {
  shouldHandle(value: any) {
    return Array.isArray(value);
  }

  getPrettyValue(value: any[]) {
    const prettyValues = value.map((v) => {
      const handler = this.interpreter.getHandler(v);
      return handler.getPrettyValue(v);
    });
    return `[${prettyValues.join(', ')}]`;
  }

  getIndex(value: any[], index: number) {
    index = this.adjustIndex(index, value.length);
    return value[index];
  }

  setIndex(value: any[], index: number, element: any) {
    index = this.adjustIndex(index, value.length);
    return produce(value, (draft) => {
      draft[index] = element;
    });
  }

  evalBinaryOp(op: string, left: any, right: any) {
    this.assertSameType(left, right);

    switch (op) {
      case '$':
        return left + right;
      case '=':
        return deepEqual(left, right, { strict: true });
      case '!=':
        return !deepEqual(left, right, { strict: true });
      default:
        return super.evalBinaryOp(op, left, right);
    }
  }
}

export class TableHandler extends BaseHandler {
  shouldHandle(value: any) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  getPrettyValue(value: Record<string, any>) {
    const prettyValues = Object.entries(value).map(([key, v]) => {
      const handler = this.interpreter.getHandler(v);
      return `${key}=${handler.getPrettyValue(v)}`;
    });
    return `[${prettyValues.join(', ')}]`;
  }

  getIndex(value: Record<string, any>, index: string) {
    return value[index];
  }

  setIndex(value: Record<string, any>, index: string, element: any) {
    return produce(value, (draft) => {
      draft[index] = element;
    });
  }

  evalBinaryOp(op: string, left: any, right: any) {
    this.assertSameType(left, right);

    switch (op) {
      case '$':
        return left + right;
      case '=':
        return deepEqual(left, right, { strict: true });
      case '!=':
        return !deepEqual(left, right, { strict: true });
      default:
        return super.evalBinaryOp(op, left, right);
    }
  }
}
