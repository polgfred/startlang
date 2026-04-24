declare module '@startlang/lang-core/parser.peggy' {
  import type { Node } from '@startlang/lang-core/nodes';

  export interface ParseOptions {
    ast?: boolean;
    meta?: boolean;
  }

  export class SyntaxError extends Error {}

  export function parse(source: string, options?: ParseOptions): Node;
}
