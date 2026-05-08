declare module '*.peggy' {
  import type { Node, SourceLocation } from './nodes/base.js';

  export interface ParseOptions {
    ast?: boolean;
    meta?: boolean;
  }

  export class SyntaxError extends Error {
    location: SourceLocation;
  }

  export function parse(source: string, options?: ParseOptions): Node;
}
