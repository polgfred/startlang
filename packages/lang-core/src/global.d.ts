declare module '*.peggy' {
  import type { SourceLocation } from './nodes/base.js';
  import type { Program } from './program.js';

  export interface ParseOptions {
    ast?: boolean;
    meta?: boolean;
  }

  export class SyntaxError extends Error {
    location: SourceLocation;
  }

  export function parse(source: string, options?: ParseOptions): Program;
}
