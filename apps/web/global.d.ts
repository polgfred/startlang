declare module '*.peggy' {
  import { Node } from '@startlang/lang-core/nodes/base';
  export function parse(source: string): Node;
}

declare module '*.start' {
  const source: string;
  export default source;
}
