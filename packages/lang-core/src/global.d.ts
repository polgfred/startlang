declare module '*.peggy' {
  import { Node } from './nodes/base.js';
  export function parse(source: string): Node;
}
