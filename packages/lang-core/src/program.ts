import { immerable } from 'immer';

import { BeginNode, BlockNode } from './nodes/index.js';

export type ProgramFunctions = Readonly<Record<string, BeginNode>>;

export class Program {
  static [immerable] = true;

  constructor(
    public readonly functions: ProgramFunctions,
    public readonly main: BlockNode
  ) {}
}
