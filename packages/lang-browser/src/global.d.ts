declare module '@startlang/lang-core/parser.peggy' {
  import type { Node } from '@startlang/lang-core/nodes';

  export interface ParseOptions {
    ast?: boolean;
    meta?: boolean;
  }

  export class SyntaxError extends Error {}

  export function parse(source: string, options?: ParseOptions): Node;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
