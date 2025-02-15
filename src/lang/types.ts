import type { Interpreter } from './interpreter';

export interface RuntimeFunction {
  (
    interpreter: Interpreter,
    args: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    finalize?: boolean
  ): void | Promise<void>;
}

export type RuntimeFunctions = Readonly<Record<string, RuntimeFunction>>;

export type NamespaceType = Readonly<Record<string, unknown>>;

export type IndexType = number | string;

export type ListType = readonly unknown[];

export type TableType = Readonly<Record<string, unknown>>;
