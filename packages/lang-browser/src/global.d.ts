declare module '@startlang/lang-core/parser.peggy' {
  import type { Program } from '@startlang/lang-core/program';

  export interface ParseOptions {
    ast?: boolean;
    meta?: boolean;
  }

  export class SyntaxError extends Error {}

  export function parse(source: string, options?: ParseOptions): Program;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
