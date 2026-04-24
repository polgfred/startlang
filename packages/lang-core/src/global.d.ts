declare module '*.peggy' {
  import { Node } from './nodes/base.js';

  export interface ParseOptions {
    ast?: boolean;
    meta?: boolean;
  }

  export class SyntaxError extends Error {}

  export function parse(source: string, options?: ParseOptions): Node;
}
