import type { Interpreter } from './interpreter';
import type { CallNode, Frame } from './nodes';

export interface RuntimeFunction {
  (
    interpreter: Interpreter,
    args: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    node: CallNode
  ): Frame | void;
}

export type RuntimeFunctions = Readonly<Record<string, RuntimeFunction>>;

export type NamespaceType = Readonly<Record<string, unknown>>;

export type IndexType = number | string;

export type ListType = readonly unknown[];

export type RecordType = Readonly<Record<string, unknown>>;

export type MarkerType = 'breakpoint' | 'snapshot';
