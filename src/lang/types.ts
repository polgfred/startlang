import type { Interpreter } from './interpreter';

export interface RuntimeFunction {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (interpreter: Interpreter, ...args: any[]): void | Promise<void>;
}

export type RuntimeFunctions = Readonly<Record<string, RuntimeFunction>>;

export type NamespaceType = Readonly<Record<string, unknown>>;

export type IndexType = number | string;

export type ListType = readonly unknown[];

export type TableType = Readonly<Record<string, unknown>>;
