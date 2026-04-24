import { Interpreter } from '../interpreter.js';
import type { IndexType, ListType, RuntimeFunctions } from '../types.js';

export abstract class DataHandler {
  constructor(
    protected readonly interpreter: Interpreter,
    public readonly globals: RuntimeFunctions = {},
    public readonly methods: RuntimeFunctions = {}
  ) {}

  abstract shouldHandle(value: unknown): boolean;

  abstract getPrettyValue(value: unknown): string;

  getIndex(value: unknown, index: IndexType): unknown {
    throw new Error('not supported');
  }

  setIndex(value: unknown, index: IndexType, element: unknown): void {
    throw new Error('not supported');
  }

  getIterable(value: unknown): ListType {
    throw new Error('not supported');
  }

  evalUnaryOp(op: string, right: unknown): unknown {
    throw new Error(`unary operator ${op} not supported`);
  }

  evalBinaryOp(op: string, left: unknown, right: unknown): unknown {
    switch (op) {
      case '=':
        return left === right;
      case '!=':
        return left !== right;
      default:
        throw new Error(`binary operator ${op} not supported`);
    }
  }
}
