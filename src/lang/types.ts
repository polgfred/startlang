import type { Interpreter } from './interpreter';
import { CallFrame, CallNode } from './nodes';

export interface RuntimeFunction {
  (
    interpreter: Interpreter,
    args: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    node: CallNode
  ): void | Promise<void> | CallFrame;
}

export type RuntimeFunctions = Readonly<Record<string, RuntimeFunction>>;

export type NamespaceType = Readonly<Record<string, unknown>>;

export type IndexType = number | string;

export type ListType = readonly unknown[];

export type RecordType = Readonly<Record<string, unknown>>;
